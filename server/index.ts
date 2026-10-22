import http from 'http';
import path from 'path';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { ClientPacket, ServerPacket } from '../shared/types';
import { FACTIONS_REGISTRY, TCG_RELIC_CARDS } from '../shared/factionsRegistry';
import { CLASSES_REGISTRY, ALL_ABILITIES } from '../shared/classesRegistry';
import { TALENTS_REGISTRY, TALENT_NODE_BY_ID } from '../shared/talentsRegistry';
import { INSTANCES_REGISTRY, CLASS_GLB_MODELS } from '../shared/instancesRegistry';
import { WorldManager } from './worldManager';
import { CombatEngine } from './combatEngine';
import { MatchmakingQueue } from './matchmakingQueue';
import { characterStore } from './characterStore';
import { collisionWorld } from '../shared/collisionEngine';

const PORT = Number(process.env.PORT || 8080);
const HOST = '0.0.0.0';
const TICK_RATE_HZ = 20;
const TICK_INTERVAL_MS = 1000 / TICK_RATE_HZ; // 50ms deterministic tick

const app = express();
app.use(express.json());

// Serve client public models (/models/heroes/*.glb, etc.), locales, and client bundle
const clientDir = path.resolve(__dirname, '../client');
const publicDir = path.resolve(__dirname, '../client/public');
const localesDir = path.resolve(__dirname, '../locales');

app.use(express.static(publicDir));
app.use('/locales', express.static(localesDir));
app.use(express.json());
app.use(express.static(clientDir));

const world = new WorldManager();
const combat = new CombatEngine(world);
const matchmaking = new MatchmakingQueue(world, combat);

app.get('/api/account/check', (req, res) => {
  const identifier = ((req.query.identifier as string) || '').trim().toLowerCase();
  if (!identifier) {
    return res.json({ exists: false });
  }
  const acc = characterStore.getAccount(identifier);
  const char = characterStore.getCharacter(identifier);
  res.json({
    exists: Boolean(acc || char),
    heroName: acc?.heroName || char?.name,
    factionId: acc?.factionId,
    classId: acc?.classId || char?.classId,
  });
});

app.post('/api/account/auth', (req, res) => {
  const { identifier, password, heroName, factionId, classId, isGuest } = req.body || {};
  if (isGuest) {
    const cleanHeroName = (heroName && heroName.trim().length > 0)
      ? heroName.trim().slice(0, 24)
      : `Vanguard_${Math.floor(100 + Math.random() * 899)}`;
    return res.json({
      ok: true,
      session: {
        mode: 'GUEST',
        heroName: cleanHeroName,
        factionId: factionId || (classId && (CLASSES_REGISTRY as Record<string, any>)[classId]?.factionId) || 'SOLARI',
        classId: classId || 'SUNFORGED_PALADIN',
        authenticatedAtMs: Date.now(),
      },
    });
  }

  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    return res.status(400).json({ ok: false, error: 'Username or email is required' });
  }

  const cleanId = identifier.trim().toLowerCase();
  const existing = characterStore.getAccount(cleanId);

  if (existing) {
    if (!password) {
      return res.status(400).json({ ok: false, error: 'Password is required' });
    }
    const check = characterStore.verifyAccount(cleanId, password);
    if (!check.ok) {
      return res.status(401).json({ ok: false, error: check.reason || 'Incorrect password' });
    }
    return res.json({
      ok: true,
      session: {
        mode: 'ACCOUNT',
        heroName: existing.heroName,
        factionId: existing.factionId,
        classId: existing.classId,
        email: cleanId,
        authenticatedAtMs: Date.now(),
      },
    });
  } else {
    // New registration
    if (!password || password.length < 3) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 3 characters' });
    }
    const cleanHeroName = (heroName && heroName.trim().length > 0)
      ? heroName.trim().slice(0, 24)
      : cleanId.split('@')[0];
    const created = characterStore.createAccount(
      cleanId,
      password,
      cleanHeroName,
      factionId || (classId && (CLASSES_REGISTRY as Record<string, any>)[classId]?.factionId) || 'SOLARI',
      classId || 'SUNFORGED_PALADIN'
    );
    return res.json({
      ok: true,
      session: {
        mode: 'ACCOUNT',
        heroName: created.heroName,
        factionId: created.factionId,
        classId: created.classId,
        email: cleanId,
        authenticatedAtMs: Date.now(),
      },
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: 'Glimmerfall Online 3D',
    engine: 'Three.js WebGL + Authoritative 20Hz Server',
    tickRateHz: TICK_RATE_HZ,
    factionsCount: Object.keys(FACTIONS_REGISTRY).length,
    classesCount: Object.keys(CLASSES_REGISTRY).length,
    abilitiesCount: Object.values(CLASSES_REGISTRY).reduce(
      (sum, c) => sum + c.abilities.length,
      0
    ),
    instancesCount: Object.keys(INSTANCES_REGISTRY).length,
    activeInstanceRooms: Array.from(world.instances.keys()),
    playersOnline: world.players.size,
    npcsActive: world.npcs.size,
  });
});

app.get('/api/registries', (_req, res) => {
  res.json({
    factions: FACTIONS_REGISTRY,
    classes: CLASSES_REGISTRY,
    talents: TALENTS_REGISTRY,
    tcgRelicCards: TCG_RELIC_CARDS,
    instances: INSTANCES_REGISTRY,
    glbModels: CLASS_GLB_MODELS,
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let nextPlayerSeq = 1;
const socketToPlayerId = new Map<WebSocket, string>();

wss.on('connection', (ws: WebSocket) => {
  const playerId = `player_${nextPlayerSeq++}`;
  socketToPlayerId.set(ws, playerId);
  (ws as any).isAlive = true;

  ws.on('pong', () => {
    (ws as any).isAlive = true;
  });

  const now = Date.now();
  const initialPlayer = combat.createPlayer(
    playerId,
    `Vanguard#${nextPlayerSeq - 1}`,
    'SUNFORGED_PALADIN',
    now
  );
  world.players.set(playerId, initialPlayer);

  const welcome: ServerPacket = {
    type: 'WELCOME',
    playerId,
    serverTimeMs: now,
  };
  ws.send(JSON.stringify(welcome));

  ws.on('message', (raw: Buffer) => {
    try {
      const packet = JSON.parse(raw.toString()) as ClientPacket;
      const player = world.players.get(playerId);
      if (!player) return;

      const timestamp = Date.now();

      switch (packet.type) {
        case 'JOIN_GAME': {
          const rawName = (packet.name && packet.name.trim().length > 0) ? packet.name.trim().slice(0, 24) : player.name;
          player.name = rawName;

          const saved = characterStore.getCharacter(rawName);
          if (saved) {
            characterStore.restorePlayer(player, saved);
            if (packet.classId && CLASSES_REGISTRY[packet.classId] && packet.classId !== saved.classId) {
              combat.switchPlayerClass(player, packet.classId, timestamp);
            } else {
              const cls = CLASSES_REGISTRY[player.classId];
              if (cls) {
                player.factionId = cls.factionId;
                player.role = cls.role;
                player.tankStance = cls.role === 'TANK';
              }
              combat.recalculatePlayerStats(player);
            }
          } else {
            if (packet.classId && CLASSES_REGISTRY[packet.classId]) {
              combat.switchPlayerClass(player, packet.classId, timestamp);
            }
            characterStore.savePlayer(player);
          }

          combat.emitEvent({
            instanceId: player.instanceId,
            timestampMs: timestamp,
            type: 'ANNOUNCEMENT',
            sourceId: player.id,
            sourceName: player.name,
            targetId: player.id,
            targetName: player.name,
            message: `⚔️ [${player.name}] the ${CLASSES_REGISTRY[player.classId]?.name || player.classId} entered the Nexus!`,
          });
          break;
        }

        case 'MOVE_INPUT': {
          if (player.isDead) break;
          const isPinned = player.auras.some(
            (a) =>
              a.definition.flags?.isStun ||
              a.definition.flags?.isRoot ||
              a.definition.flags?.isDisorient
          );
          player.facingRad = packet.facingRad;
          const len = Math.hypot(packet.dx, packet.dy);
          if (!isPinned && typeof packet.x === 'number' && typeof packet.y === 'number') {
            const distJump = Math.hypot(packet.x - player.x, packet.y - player.y);
            const maxStep = player.isMounted ? 120 : 80;
            if (distJump <= maxStep) {
              player.x = Math.max(-750, Math.min(750, packet.x));
              player.y = Math.max(-750, Math.min(750, packet.y));
            } else {
              // Smooth correction instead of snapping back to origin
              const step = Math.min(distJump, maxStep);
              const angle = Math.atan2(packet.y - player.y, packet.x - player.x);
              player.x = Math.max(-750, Math.min(750, player.x + Math.cos(angle) * step));
              player.y = Math.max(-750, Math.min(750, player.y + Math.sin(angle) * step));
            }

            if (typeof packet.z === 'number') {
              if (player.isMounted) {
                // Free 3D flight elevation up to 60 yards in the sky!
                player.z = Math.max(0, Math.min(60, packet.z));
              } else {
                player.z = Math.max(0, Math.min(8, packet.z));
              }
            }

            // Authoritative server-side wall and obstacle collision resolution
            const resolved = collisionWorld.resolvePlayerPosition(
              player.x,
              player.y,
              player.z || 0,
              0.85,
              player.instanceId || 'open_world_nexus'
            );
            player.x = resolved.x;
            player.y = resolved.z;

            if (len > 0) {
              player.lastMoveAtMs = timestamp;
            }

            if (player.isMounted) {
              player.animState = 'Flight';
            } else if (
              len > 0 &&
              !player.activeCast &&
              player.z === 0
            ) {
              player.animState = packet.isSprinting ? 'Sprint' : 'Run';
              player.animUpdatedAtMs = timestamp;
            } else if (
              len === 0 &&
              !player.activeCast &&
              player.z === 0 &&
              (player.animState === 'Run' || player.animState === 'Sprint')
            ) {
              player.animState = 'Idle';
              player.animUpdatedAtMs = timestamp;
            }
          } else if (!isPinned && len > 0) {
            const sprintMult = packet.isSprinting ? 1.35 : 1.0;
            const speed = (player.isMounted ? 1.2 : 0.55) * player.computedStats.moveSpeedMultiplier * sprintMult;
            const nx = (packet.dx / len) * speed;
            const ny = (packet.dy / len) * speed;
            player.x = Math.max(-750, Math.min(750, player.x + nx));
            player.y = Math.max(-750, Math.min(750, player.y + ny));
            const resolved = collisionWorld.resolvePlayerPosition(
              player.x,
              player.y,
              player.z || 0,
              0.85,
              player.instanceId || 'open_world_nexus'
            );
            player.x = resolved.x;
            player.y = resolved.z;
            if (player.isMounted) {
              player.animState = 'Flight';
            } else if (!player.activeCast && timestamp - player.animUpdatedAtMs > 320) {
              player.animState = packet.isSprinting ? 'Sprint' : 'Run';
            }
          } else if (
            len === 0 &&
            !player.activeCast &&
            player.z === 0 &&
            (player.animState === 'Run' || player.animState === 'Sprint') &&
            timestamp - player.animUpdatedAtMs > 320
          ) {
            player.animState = 'Idle';
          }
          break;
        }

        case 'TOGGLE_MOUNT': {
          if (player.isDead) break;
          player.isMounted = !player.isMounted;
          player.mountType = player.isMounted ? 'EMBERWING_HAWK' : undefined;
          if (player.isMounted) {
            if (player.z < 2.0) player.z = 2.0;
            player.animState = 'Flight';
          } else {
            player.z = 0;
            player.animState = 'Idle';
          }
          break;
        }

        case 'JUMP_OR_DODGE': {
          if (player.isMounted) {
            player.isMounted = false;
            player.mountType = undefined;
            player.z = 0;
          }
          combat.handleJumpOrDodge(player, packet.action, packet.facingRad, timestamp);
          break;
        }

        case 'SELECT_TARGET': {
          player.targetId = packet.targetId;
          break;
        }

        case 'CAST_ABILITY': {
          if (player.isMounted) {
            player.isMounted = false;
            player.mountType = undefined;
            player.z = 0;
          }
          const res = combat.handleCastRequest(
            player,
            packet.abilityId,
            packet.targetId,
            packet.groundPosition,
            timestamp
          );
          if (!res.ok && res.reason) {
            combat.emitEvent({
              instanceId: player.instanceId,
              timestampMs: timestamp,
              type: 'SPELL_CAST_FAILED',
              sourceId: player.id,
              sourceName: player.name,
              targetId: packet.targetId ?? player.id,
              targetName: '',
              abilityId: packet.abilityId,
              abilityName: ALL_ABILITIES[packet.abilityId]?.name ?? packet.abilityId,
              message: res.reason,
            });
          }
          break;
        }

        case 'SWITCH_CLASS': {
          if (CLASSES_REGISTRY[packet.classId]) {
            combat.switchPlayerClass(player, packet.classId, timestamp);
          }
          break;
        }

        case 'TOGGLE_TANK_STANCE': {
          player.tankStance = !player.tankStance;
          break;
        }

        case 'ALLOCATE_TALENT': {
          const node = TALENT_NODE_BY_ID[packet.nodeId];
          if (node && player.talentPointsAvailable > 0) {
            const currentRank = player.talents[node.id] ?? 0;
            if (currentRank < node.maxRanks) {
              player.talents[node.id] = currentRank + 1;
              player.talentPointsAvailable--;
              combat.recalculatePlayerStats(player);
              characterStore.savePlayer(player);
            }
          }
          break;
        }

        case 'RESET_TALENTS': {
          player.talents = {};
          player.talentPointsAvailable = 60;
          combat.recalculatePlayerStats(player);
          characterStore.savePlayer(player);
          break;
        }

        case 'EQUIP_RELIC_DECK': {
          if (Array.isArray(packet.cardIds) && packet.cardIds.length === 3) {
            player.equippedRelicDeck = [
              packet.cardIds[0],
              packet.cardIds[1],
              packet.cardIds[2],
            ];
            combat.recalculatePlayerStats(player);
            characterStore.savePlayer(player);
          }
          break;
        }

        case 'ALLOCATE_ATTRIBUTE': {
          if ((player.attributePointsAvailable ?? 0) > 0) {
            const attr = packet.attribute;
            if (['stamina', 'intellect', 'strength', 'agility', 'spirit'].includes(attr)) {
              player.allocatedAttributes = player.allocatedAttributes || {
                stamina: 0,
                intellect: 0,
                strength: 0,
                agility: 0,
                spirit: 0,
              };
              player.allocatedAttributes[attr] = (player.allocatedAttributes[attr] || 0) + 1;
              player.attributePointsAvailable--;
              combat.recalculatePlayerStats(player);
              characterStore.savePlayer(player);
            }
          }
          break;
        }

        case 'UPGRADE_ABILITY': {
          const ability = ALL_ABILITIES[packet.abilityId];
          if (ability && ability.classId === player.classId && (player.abilityPointsAvailable ?? 0) > 0) {
            player.abilityRanks = player.abilityRanks || {};
            const curRank = player.abilityRanks[packet.abilityId] ?? 1;
            if (curRank < 5) {
              player.abilityRanks[packet.abilityId] = curRank + 1;
              player.abilityPointsAvailable--;
              characterStore.savePlayer(player);
              combat.emitEvent({
                instanceId: player.instanceId,
                timestampMs: timestamp,
                type: 'AURA_APPLIED',
                sourceId: player.id,
                sourceName: player.name,
                targetId: player.id,
                targetName: player.name,
                message: `⚡ ${player.name} upgraded [${ability.name}] to Rank ${curRank + 1}! (+15% potency)`,
              });
            }
          }
          break;
        }

        case 'UPDATE_ACTION_BAR': {
          if (packet.slotIndex >= 0 && packet.slotIndex < 24) {
            player.actionBars[packet.slotIndex] = packet.abilityId;
            characterStore.savePlayer(player);
          }
          break;
        }

        case 'UPDATE_TACTICAL_LOADOUT': {
          if (packet.tacticalIndex >= 0 && packet.tacticalIndex < 6) {
            player.tacticalLoadout[packet.tacticalIndex] = packet.abilityId;
            characterStore.savePlayer(player);
          }
          break;
        }

        case 'QUEUE_JOIN': {
          matchmaking.joinQueue(player, packet.templateId, packet.role, timestamp);
          break;
        }

        case 'QUEUE_LEAVE': {
          matchmaking.leaveQueue(player.id);
          break;
        }

        case 'QUEUE_INSTANT_AI_POP': {
          matchmaking.triggerInstantAiPop(player, packet.templateId, packet.role, timestamp);
          break;
        }

        case 'QUEUE_ACCEPT_POP': {
          matchmaking.acceptQueuePop(player, timestamp);
          break;
        }

        case 'LEAVE_INSTANCE': {
          matchmaking.returnToOpenWorld(player, timestamp);
          break;
        }

        case 'HARVEST_RELIC_NODE': {
          combat.handleHarvestRelicNode(player, packet.nodeId, timestamp);
          break;
        }
      }
    } catch {
      // Ignore malformed packets
    }
  });

  ws.on('close', () => {
    const p = world.players.get(playerId);
    if (p) {
      combat.emitEvent({
        instanceId: p.instanceId,
        timestampMs: Date.now(),
        type: 'ANNOUNCEMENT',
        sourceId: p.id,
        sourceName: p.name,
        targetId: p.id,
        targetName: p.name,
        message: `🚪 [${p.name}] departed the Nexus.`,
      });
      characterStore.savePlayer(p);
      characterStore.flush();
    }
    const oldInst = p?.instanceId;
    socketToPlayerId.delete(ws);
    matchmaking.leaveQueue(playerId);
    world.players.delete(playerId);
    if (oldInst && oldInst !== 'open_world_nexus') {
      world.cleanupEmptyInstance(oldInst);
    }
  });
});

// Ngrok & Reverse-Proxy Keepalive Ping Heartbeat (Every 25s)
const PING_INTERVAL_MS = 25000;
setInterval(() => {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      if ((client as any).isAlive === false) {
        client.terminate();
        continue;
      }
      (client as any).isAlive = false;
      client.ping();
    }
  }
}, PING_INTERVAL_MS);

// Deterministic 20Hz (50ms) Authoritative Server Tick Loop
let lastTickMs = Date.now();
setInterval(() => {
  const now = Date.now();
  const dtMs = now - lastTickMs;
  lastTickMs = now;

  combat.tick(now, dtMs);
  matchmaking.tick(now);

  if (wss.clients.size > 0) {
    const allPlayers = Array.from(world.players.values());
    const allNpcs = Array.from(world.npcs.values());
    const allZones = Array.from(world.groundZones.values());
    const allNodes = Array.from(world.relicNodes.values());

    for (const client of wss.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      const pid = socketToPlayerId.get(client);
      const me = pid ? world.players.get(pid) : undefined;
      if (!me) continue;

      const instId = me.instanceId;
      const instanceInfo =
        world.instances.get(instId) ?? world.instances.get('open_world_nexus')!;

      const statePacket: ServerPacket = {
        type: 'WORLD_STATE',
        serverTimeMs: now,
        instanceInfo,
        queueStatus: matchmaking.getPlayerQueueStatus(me, now),
        players: allPlayers.filter((p) => p.instanceId === instId),
        npcs: allNpcs.filter((n) => n.instanceId === instId),
        groundZones: allZones.filter((z) => z.instanceId === instId),
        relicNodes: allNodes.filter((r) => r.instanceId === instId),
        recentEvents: combat.recentEvents
          .filter((e) => e.instanceId === instId)
          .slice(-24),
      };

      client.send(JSON.stringify(statePacket));
    }
  }
}, TICK_INTERVAL_MS);

server.listen(PORT, HOST, () => {
  console.log(
    `[Glimmerfall Online 3D] Authoritative 20Hz Server listening on http://${HOST}:${PORT}`
  );
});

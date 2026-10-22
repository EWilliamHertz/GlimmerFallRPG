import {
  AbilityDefinition,
  ActiveInstanceSummary,
  ClientPacket,
  CombatLogEvent,
  EntityBase,
  GroundZone,
  NpcEntity,
  PlayerEntity,
  QueueStatusState,
  RelicNodeEntity,
  ServerPacket,
} from '../shared/types';
import { ALL_ABILITIES } from '../shared/classesRegistry';
import { collisionWorld } from '../shared/collisionEngine';
import { lerpAngle, LocalPlayerPrediction, World3D } from './engine/World3D';
import { MinimalHud } from './ui/MinimalHud';
import { LandingPortal } from './ui/LandingPortal';
import { AuthSession } from './services/authService';
import { keybindService } from './services/keybindService';

class Glimmerfall3DClient {
  private ws: WebSocket | null = null;
  private canvas: HTMLCanvasElement;
  private world3D: World3D;
  private hud: MinimalHud;
  private portal: LandingPortal;
  private isPortalOpen = true;
  private pendingSession: AuthSession | null = null;

  private myPlayerId: string | null = null;
  private serverTimeOffsetMs = 0;
  private instanceInfo: ActiveInstanceSummary | null = null;
  private queueStatus: QueueStatusState | null = null;
  private players: PlayerEntity[] = [];
  private npcs: NpcEntity[] = [];
  private groundZones: GroundZone[] = [];
  private relicNodes: RelicNodeEntity[] = [];
  private seenVfxEventIds: Set<string> = new Set();

  // 60FPS Client-Side Movement & Rotation State (Arcanastride Responsive Feel)
  private localPred: LocalPlayerPrediction = {
    x: 14,
    z: -14,
    heightY: 0,
    rotY: Math.PI,
    animState: 'Idle',
  };
  private hasSyncedInitialPos = false;
  private lastFrameTimeMs = performance.now();
  private sMovementYaw: number | null = null;
  private sTurnTargetYaw: number | null = null;
  private wasMovingLastTick = false;
  // Newest un-applied WORLD_STATE JSON (applied once per frame) and when the player last moved locally.
  private pendingWorldStateRaw: string | null = null;
  private lastLocalInputAtMs = 0;

  private keysDown: Set<string> = new Set();
  private isDraggingCamera = false;
  private pendingReticleAbility: AbilityDefinition | null = null;
  private reticleWorldPos = { x: 0, y: 0 };
  private tabCycleIndex = 0;
  private currentDiscoveredBiome: string | null = null;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.world3D = new World3D(this.canvas);
    this.world3D.isCinematicOrbit = true;

    this.portal = new LandingPortal({
      onEnterWorld: (session) => this.enterWorldWithSession(session),
    });

    this.hud = new MinimalHud({
      sendPacket: (pkt) => this.sendPacket(pkt),
      getPlayer: () => this.getMyPlayer(),
      getTarget: () => this.getMyTarget(),
      getPlayers: () => this.players,
      getNpcs: () => this.npcs,
      getRelicNodes: () => this.relicNodes,
      getInstanceInfo: () => this.instanceInfo,
      getQueueStatus: () => this.queueStatus,
      getServerTimeMs: () => Date.now() + this.serverTimeOffsetMs,
      getCameraYaw: () => this.world3D.cameraYaw,
      projectToScreen: (x, h, z) => this.world3D.projectWorldToScreen(x, h, z),
      onAbilityTriggered: (ab) => this.triggerAbility(ab),
      onTeleportToBiome: (x, y) => this.teleportLocalPlayer(x, y),
      isHostileToMe: (ent) => this.isHostileToMe(ent),
    });

    document.getElementById('btn-open-portal')?.addEventListener('click', () => {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      this.isPortalOpen = true;
      this.world3D.isCinematicOrbit = true;
      document.getElementById('minimal-hud-layer')?.classList.add('hidden');
      this.portal.show();
    });

    try {
      const saved = localStorage.getItem('glimmerfall_saved_session');
      if (saved) {
        this.pendingSession = JSON.parse(saved);
      }
    } catch {}

    this.bindInputListeners();
    this.connectWebSocket();

    // 20Hz Authoritative Position Sync Loop
    setInterval(() => this.sendMovementTick(), 50);

    // 60FPS Three.js Render & Immediate Client Movement Loop
    requestAnimationFrame(() => this.renderLoop());
  }

  private enterWorldWithSession(session: AuthSession): void {
    this.pendingSession = session;
    try {
      localStorage.setItem('glimmerfall_saved_session', JSON.stringify(session));
    } catch {}
    this.isPortalOpen = false;
    this.world3D.isCinematicOrbit = false;
    this.world3D.cameraYaw = 0;
    this.portal.hide();
    document.getElementById('minimal-hud-layer')?.classList.remove('hidden');

    // Force blur any input fields (hero name, auth inputs) and focus game canvas
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.canvas.focus();
    window.focus();

    this.sendPacket({
      type: 'JOIN_GAME',
      name: session.heroName,
      classId: session.classId,
    });
  }

  private connectWebSocket(): void {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}`;
    this.ws = new WebSocket(url);

    this.ws.addEventListener('open', () => {
      if (this.pendingSession) {
        this.sendPacket({
          type: 'JOIN_GAME',
          name: this.pendingSession.heroName,
          classId: this.pendingSession.classId,
        });
      }
    });

    this.ws.addEventListener('message', (ev) => {
      try {
        const raw = ev.data as string;
        // WORLD_STATE arrives 20x/sec and is large. Don't parse every one: keep only the newest and
        // apply it once per rendered frame (see renderLoop). Each snapshot is a full state, so skipping
        // intermediate ones is lossless apart from sub-frame detail, and it makes a backlog impossible.
        if (raw.startsWith('{"type":"WORLD_STATE"')) {
          this.pendingWorldStateRaw = raw;
          return;
        }
        const packet = JSON.parse(raw) as ServerPacket;
        if (packet.type === 'WELCOME') {
          this.myPlayerId = packet.playerId;
          this.serverTimeOffsetMs = packet.serverTimeMs - Date.now();
          if (this.pendingSession) {
            this.sendPacket({
              type: 'JOIN_GAME',
              name: this.pendingSession.heroName,
              classId: this.pendingSession.classId,
            });
          }
        } else if (packet.type === 'WORLD_STATE') {
          this.applyWorldState(packet);
        }
      } catch {
        // Ignore malformed packet
      }
    });


    this.ws.addEventListener('close', () => {
      setTimeout(() => this.connectWebSocket(), 1500);
    });
  }

  private sendPacket(packet: ClientPacket): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(packet));
    }
  }

  public isHostileToMe(ent: EntityBase): boolean {
    const me = this.getMyPlayer();
    if (!me || ent.id === me.id) return false;

    const myFaction = (me.factionId || '').toUpperCase();
    const entFaction = (ent.factionId || '').toUpperCase();

    if (ent.kind === 'NPC') {
      const npc = ent as NpcEntity;
      if (npc.npcType === 'TRAINING_DUMMY') return true;
      if (npc.npcType === 'ALLY_SPIRIT') return false;
      if (npc.isVoidIncursion) return true;

      // Same faction NPCs (citizens, leaders, trainers, guards, friendly creatures) are ALWAYS FRIENDLY!
      if (myFaction && entFaction && myFaction === entFaction) {
        return false;
      }
      if (npc.npcType === 'BASE_GUARD') {
        return true;
      }
      if (npc.npcType === 'QUARTERMASTER' || npc.npcType === 'FACTION_LEADER') {
        return false;
      }
      return npc.isHostile;
    }

    if (ent.kind === 'PLAYER') {
      const other = ent as PlayerEntity;
      const otherFaction = (other.factionId || '').toUpperCase();
      return myFaction !== otherFaction;
    }

    return false;
  }

  private getMyPlayer(): PlayerEntity | null {
    if (!this.myPlayerId) return null;
    return this.players.find((p) => p.id === this.myPlayerId) ?? null;
  }

  private getEntityById(id: string | null | undefined): EntityBase | null {
    if (!id) return null;
    return (
      this.npcs.find((n) => n.id === id) ??
      this.players.find((p) => p.id === id) ??
      null
    );
  }

  private getMyTarget(): EntityBase | null {
    const me = this.getMyPlayer();
    if (!me || !me.targetId) return null;
    return this.getEntityById(me.targetId);
  }

  private spawnVfxForNewEvents(events: CombatLogEvent[]): void {
    for (const ev of events) {
      if (this.seenVfxEventIds.has(ev.id)) continue;
      this.seenVfxEventIds.add(ev.id);

      if (ev.type === 'SPELL_DAMAGE' || ev.type === 'SPELL_HEAL') {
        const src = this.getEntityById(ev.sourceId);
        const dst = this.getEntityById(ev.targetId);
        if (src && dst && src.id !== dst.id) {
          const dist = Math.hypot(src.x - dst.x, src.y - dst.y);
          if (dist > 8) {
            this.world3D.spawnSpellProjectileVfx(src, dst, ev.school);
          }
        }
      }
    }
  }

  private teleportLocalPlayer(destX: number, destY: number): void {
    this.localPred.x = destX;
    this.localPred.z = destY;
    const dx = destX - (this.getMyPlayer()?.x ?? 0);
    const dy = destY - (this.getMyPlayer()?.y ?? 0);
    const steps = Math.min(40, Math.ceil(Math.hypot(dx, dy) / 3.5));
    let count = 0;
    const timer = setInterval(() => {
      count++;
      const frac = count / Math.max(1, steps);
      const curX = (this.getMyPlayer()?.x ?? destX) + dx * frac;
      const curY = (this.getMyPlayer()?.y ?? destY) + dy * frac;
      this.sendPacket({
        type: 'MOVE_INPUT',
        dx,
        dy,
        x: count >= steps ? destX : curX,
        y: count >= steps ? destY : curY,
        facingRad: Math.atan2(dy, dx),
        isSprinting: true,
      });
      if (count >= steps) clearInterval(timer);
    }, 15);
  }

  public triggerAbility(ability: AbilityDefinition): void {
    if (this.isPortalOpen) return;
    const me = this.getMyPlayer();
    if (!me || me.isDead) return;

    const now = Date.now() + this.serverTimeOffsetMs;

    // 1. Check Cooldown
    const cd = me.cooldowns[ability.id];
    if (cd) {
      const maxCharges = ability.maxCharges ?? 1;
      if (maxCharges > 1 && cd.chargesRemaining <= 0 && cd.readyAtMs > now) {
        this.hud.showFloatingError('Ability recharging');
        return;
      } else if (maxCharges === 1 && cd.readyAtMs > now) {
        this.hud.showFloatingError('Ability on cooldown');
        return;
      }
    }

    // 2. Check Global Cooldown
    if (!ability.isOffGCD && me.gcdEndsAtMs > now) {
      const gcdRemaining = me.gcdEndsAtMs - now;
      if (gcdRemaining > 350) {
        this.hud.showFloatingError('Not ready yet');
        return;
      }
    }

    // 3. Check Primary Resource Cost
    const zeroMana = me.auras.some((a) => a.definition.modifiers?.zeroManaCost);
    const cost = zeroMana ? 0 : ability.primaryResourceCost;
    if (cost > 0 && me.primaryResource < cost) {
      const resName =
        me.primaryResourceType === 'PRIMAL_FURY'
          ? 'Fury'
          : me.primaryResourceType === 'SHADOW_ENERGY'
          ? 'Energy'
          : 'Mana';
      this.hud.showFloatingError(`Not enough ${resName}`);
      return;
    }

    // 4. Ground Reticle handling
    if (ability.targetType === 'GROUND_RETICLE') {
      if (this.pendingReticleAbility?.id === ability.id) {
        // Double-tap ability key: cast immediately!
        const ab = this.pendingReticleAbility;
        this.pendingReticleAbility = null;
        this.world3D.updateReticlePreview(false, 0, 0, 8);
        this.world3D.triggerLocalHeroAttackVfx(
          this.localPred,
          ab.school,
          true,
          false
        );
        this.sendPacket({
          type: 'CAST_ABILITY',
          abilityId: ab.id,
          groundPosition: this.reticleWorldPos,
        });
        return;
      }

      this.pendingReticleAbility = ability;
      const target = this.getMyTarget();
      if (target && !target.isDead) {
        this.reticleWorldPos = { x: target.x, y: target.y };
      } else {
        this.reticleWorldPos = {
          x: this.localPred.x + Math.sin(this.localPred.rotY) * 12,
          y: this.localPred.z + Math.cos(this.localPred.rotY) * 12,
        };
      }
      this.world3D.updateReticlePreview(
        true,
        this.reticleWorldPos.x,
        this.reticleWorldPos.y,
        ability.radiusYards ?? 8
      );
      return;
    }

    let target = this.getMyTarget();

    // 5. Target & Range checks for ENEMY abilities
    if (ability.targetType === 'ENEMY') {
      const maxReach = Math.max(7.0, (ability.rangeYards || 5) + 3.0);
      if (!target || target.isDead || !this.isHostileToMe(target)) {
        const candidateHostiles = [...this.npcs, ...this.players]
          .filter((e) => !e.isDead && e.id !== me.id && this.isHostileToMe(e))
          .map((e) => ({ e, d: Math.hypot(e.x - this.localPred.x, e.y - this.localPred.z) }))
          .sort((a, b) => a.d - b.d);
        if (candidateHostiles.length > 0 && candidateHostiles[0].d <= maxReach) {
          target = candidateHostiles[0].e;
          this.sendPacket({ type: 'SELECT_TARGET', targetId: target.id });
        }
      }

      if (!target || target.isDead) {
        this.hud.showFloatingError('Requires enemy target');
        return;
      }

      const dist = Math.hypot(target.x - this.localPred.x, target.y - this.localPred.z);
      if (dist > maxReach) {
        this.hud.showFloatingError('Target is out of range');
        return;
      }

      // Face target immediately when attacking
      if (target.id !== me.id) {
        this.localPred.rotY = Math.atan2(
          target.x - this.localPred.x,
          target.y - this.localPred.z
        );
      }
    }

    // Play immediate 0ms-latency 3D ability VFX & attack animation on client ONLY when all checks pass
    this.world3D.triggerLocalHeroAbilityVfx({
      pos: this.localPred,
      school: ability.school,
      targetType: ability.targetType,
      isCast: ability.castTimeMs > 0,
      isRanged: ability.rangeYards > 8,
      targetPos: target ? { x: target.x, y: target.y, z: target.z ?? 0 } : undefined,
    });

    this.sendPacket({
      type: 'CAST_ABILITY',
      abilityId: ability.id,
      targetId: target?.id ?? me?.targetId ?? null,
    });
  }

  private triggerTacticalSlot(slotIndex: number): void {
    const me = this.getMyPlayer();
    if (!me) return;
    const abId = me.tacticalLoadout[slotIndex];
    if (abId && ALL_ABILITIES[abId]) {
      this.triggerAbility(ALL_ABILITIES[abId]);
    }
  }

  private bindInputListeners(): void {
    // Automatically blur active inputs when clicking or tapping anywhere outside them
    window.addEventListener('pointerdown', (ev) => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        if (active !== ev.target) {
          active.blur();
          this.canvas.focus();
        }
      }
    });

    window.addEventListener('keydown', (ev) => {
      if (this.isPortalOpen) return;
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        // If the focused input is in a hidden container or hidden itself, blur it and proceed to gameplay input!
        if (target.closest('.hidden') || target.offsetParent === null) {
          target.blur();
          this.canvas.focus();
        } else {
          return;
        }
      }

      if (ev.key === 'Alt') {
        ev.preventDefault();
        if (document.pointerLockElement) {
          document.exitPointerLock();
        } else if (this.hud.activeModal === 'NONE') {
          this.canvas.requestPointerLock();
        }
        return;
      }

      if (this.hud.listeningKeyAction) return;

      const cfg = keybindService.getConfig();

      const matchesKey = (bind: string): boolean => {
        if (!bind) return false;
        if (bind === 'Space') return ev.code === 'Space';
        if (bind === 'Shift') return ev.key === 'Shift';
        if (bind === 'Tab') return ev.key === 'Tab';
        return (
          ev.key.toLowerCase() === bind.toLowerCase() ||
          ev.code.toLowerCase() === bind.toLowerCase()
        );
      };

      if (matchesKey(cfg.tabTarget)) {
        ev.preventDefault();
        this.cycleTabTarget();
        return;
      }

      // Escape: Cancel reticle -> Close active modal -> Deselect target
      if (ev.key === 'Escape') {
        if (this.pendingReticleAbility) {
          this.pendingReticleAbility = null;
          this.world3D.updateReticlePreview(false, 0, 0, 8);
          return;
        }
        if (this.hud.activeModal !== 'NONE') {
          this.hud.toggleModal('NONE');
          return;
        }
        const me = this.getMyPlayer();
        if (me && me.targetId) {
          this.sendPacket({ type: 'SELECT_TARGET', targetId: null });
          return;
        }
        return;
      }

      const lower = ev.key.toLowerCase();

      // Arcanastride 180° smooth camera turn when pressing [S] or [ArrowDown] (ONLY if camera is NOT fixated by holding cursor)
      const isCameraFixated = this.isDraggingCamera || Boolean(document.pointerLockElement);
      if (
        (lower === 's' || lower === 'arrowdown' || ev.code === 'KeyS') &&
        !this.keysDown.has('s') &&
        !this.keysDown.has('keys') &&
        !this.keysDown.has('arrowdown') &&
        !isCameraFixated
      ) {
        this.sMovementYaw = this.world3D.cameraYaw;
        this.sTurnTargetYaw = this.world3D.cameraYaw + Math.PI;
      } else if (lower === 'w' || lower === 'arrowup' || ev.code === 'KeyW' || isCameraFixated) {
        this.sTurnTargetYaw = null;
        this.sMovementYaw = null;
      }

      // Modal Window Shortcuts: K, I, C, N, O
      if (!ev.ctrlKey && !ev.altKey) {
        if (matchesKey(cfg.openLoadout)) {
          this.hud.toggleModal('LOADOUT_K');
          return;
        }
        if (matchesKey(cfg.openQueue)) {
          this.hud.toggleModal('INSTANCE_I');
          return;
        }
        if (matchesKey(cfg.openHero)) {
          this.hud.toggleModal('HERO_C');
          return;
        }
        if (matchesKey(cfg.openTalents)) {
          this.hud.toggleModal('TALENTS_N');
          return;
        }
        if (matchesKey(cfg.openKeybinds)) {
          this.hud.toggleModal('KEYBINDS_O');
          return;
        }
      }

      // 3D Jump
      if (matchesKey(cfg.jump)) {
        ev.preventDefault();
        const me = this.getMyPlayer();
        if (me?.isMounted) {
          // When mounted, Space ascends smoothly into the air! Handled in 60FPS flight loop
          return;
        }
        const facingRad = Math.atan2(Math.cos(this.localPred.rotY), Math.sin(this.localPred.rotY));
        this.sendPacket({
          type: 'JUMP_OR_DODGE',
          action: 'JUMP',
          facingRad,
        });
        return;
      }

      // 3D Dodge Roll / Mobility Dash
      if (matchesKey(cfg.dodge) && !ev.repeat) {
        const dashDirX = Math.sin(this.localPred.rotY);
        const dashDirZ = Math.cos(this.localPred.rotY);
        const dashTargetX = Math.max(-750, Math.min(750, this.localPred.x + dashDirX * 8.5));
        const dashTargetZ = Math.max(-750, Math.min(750, this.localPred.z + dashDirZ * 8.5));
        const resolvedDash = collisionWorld.resolvePlayerPosition(
          dashTargetX,
          dashTargetZ,
          this.localPred.heightY,
          0.85,
          this.instanceInfo?.instanceId || 'open_world_nexus'
        );
        this.localPred.x = resolvedDash.x;
        this.localPred.z = resolvedDash.z;
        this.world3D.createBurst(this.localPred.x, 1.2, this.localPred.z, 0x38bdf8, 12);
        this.sendPacket({
          type: 'JUMP_OR_DODGE',
          action: 'DODGE',
          facingRad: Math.atan2(Math.cos(this.localPred.rotY), Math.sin(this.localPred.rotY)),
        });
        return;
      }

      // Harvest nearby 3D TCG Relic Node
      if (matchesKey(cfg.harvest)) {
        const node = this.relicNodes.find(
          (r) => r.isAvailable && Math.hypot(r.x - this.localPred.x, r.y - this.localPred.z) <= 10
        );
        if (node) {
          this.world3D.createBurst(node.x, 1.5, node.y, 0xfacc15, 18);
          this.sendPacket({ type: 'HARVEST_RELIC_NODE', nodeId: node.id });
          return;
        }
      }

      // Toggle Emberwing Hawk Mount (M)
      if (matchesKey(cfg.toggleMount)) {
        ev.preventDefault();
        this.sendPacket({ type: 'TOGGLE_MOUNT' });
        return;
      }

      // 6 Tactical slots
      if (matchesKey(cfg.slot0)) {
        this.triggerTacticalSlot(0);
        return;
      }
      if (matchesKey(cfg.slot1)) {
        this.triggerTacticalSlot(1);
        return;
      }
      if (matchesKey(cfg.slot2)) {
        this.triggerTacticalSlot(2);
        return;
      }
      if (matchesKey(cfg.slot3)) {
        this.triggerTacticalSlot(3);
        return;
      }
      if (matchesKey(cfg.slot4)) {
        this.triggerTacticalSlot(4);
        return;
      }
      if (matchesKey(cfg.slot5)) {
        this.triggerTacticalSlot(5);
        return;
      }

      this.keysDown.add(lower);
      this.keysDown.add(ev.code.toLowerCase());
    });

    window.addEventListener('keyup', (ev) => {
      const k = ev.key.toLowerCase();
      this.keysDown.delete(k);
      this.keysDown.delete(ev.code.toLowerCase());
      if (
        !this.keysDown.has('s') &&
        !this.keysDown.has('keys') &&
        !this.keysDown.has('arrowdown')
      ) {
        this.sMovementYaw = null;
      }
    });

    // Mouse Look (PointerLock or Drag)
    window.addEventListener('mousemove', (ev) => {
      if (this.isPortalOpen) return;
      if (document.pointerLockElement === this.canvas || this.isDraggingCamera) {
        this.sTurnTargetYaw = null;
        this.sMovementYaw = null;
        this.world3D.cameraYaw -= ev.movementX * 0.0055;
        this.world3D.cameraPitch = Math.max(
          0.14,
          Math.min(1.18, this.world3D.cameraPitch + ev.movementY * 0.005)
        );
      }

      if (this.pendingReticleAbility) {
        const ndcX = (ev.clientX / window.innerWidth) * 2 - 1;
        const ndcY = -(ev.clientY / window.innerHeight) * 2 + 1;
        const hit = this.world3D.raycastGroundPoint(ndcX, ndcY);
        if (hit) {
          this.reticleWorldPos = hit;
          this.world3D.updateReticlePreview(
            true,
            hit.x,
            hit.y,
            this.pendingReticleAbility.radiusYards ?? 8
          );
        }
      }
    });

    this.canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());

    this.canvas.addEventListener('mousedown', (ev) => {
      if (this.isPortalOpen || this.hud.activeModal !== 'NONE') return;

      // Ensure canvas has keyboard focus and active elements are blurred
      if (document.activeElement && document.activeElement !== this.canvas) {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
      this.canvas.focus();

      // Ground Reticle placement on Left Click
      if (ev.button === 0 && this.pendingReticleAbility) {
        const ab = this.pendingReticleAbility;
        this.pendingReticleAbility = null;
        this.world3D.updateReticlePreview(false, 0, 0, 8);
        const ndcX = (ev.clientX / window.innerWidth) * 2 - 1;
        const ndcY = -(ev.clientY / window.innerHeight) * 2 + 1;
        const hit = this.world3D.raycastGroundPoint(ndcX, ndcY);
        const groundPos = hit || this.reticleWorldPos;
        this.world3D.triggerLocalHeroAttackVfx(
          this.localPred,
          ab.school,
          true,
          false
        );
        this.sendPacket({
          type: 'CAST_ABILITY',
          abilityId: ab.id,
          groundPosition: groundPos,
        });
        return;
      }

      // Cancel Ground Reticle on Right Click
      if (ev.button === 2 && this.pendingReticleAbility) {
        this.pendingReticleAbility = null;
        this.world3D.updateReticlePreview(false, 0, 0, 8);
        return;
      }

      this.isDraggingCamera = true;
      this.sTurnTargetYaw = null;
      this.sMovementYaw = null;

      // Left Click: Target selection ONLY (Mouse buttons never fire abilities)
      if (ev.button === 0) {
        const ndcX = (ev.clientX / window.innerWidth) * 2 - 1;
        const ndcY = -(ev.clientY / window.innerHeight) * 2 + 1;

        // 1. Primary: Raycast character 3D model, mesh, and hitbox directly
        const hitEntityId = this.world3D.raycastEntity(ndcX, ndcY);
        if (hitEntityId) {
          const hitEnt = this.getEntityById(hitEntityId);
          if (hitEnt && !hitEnt.isDead && hitEnt.id !== this.myPlayerId) {
            this.sendPacket({ type: 'SELECT_TARGET', targetId: hitEnt.id });
            return;
          }
        }

        // 2. Fallback: Raycast ground projection around entity feet/circle
        const hit = this.world3D.raycastGroundPoint(ndcX, ndcY);
        if (hit) {
          let closest: EntityBase | null = null;
          let bestDist = 4.5;
          for (const ent of [...this.npcs, ...this.players]) {
            if (ent.isDead || ent.id === this.myPlayerId) continue;
            const d = Math.hypot(ent.x - hit.x, ent.y - hit.y);
            if (d < bestDist) {
              bestDist = d;
              closest = ent;
            }
          }
          if (closest) {
            this.sendPacket({ type: 'SELECT_TARGET', targetId: closest.id });
          }
        }
      }
    });

    window.addEventListener('mousedown', (ev) => {
      if (this.hud.activeModal !== 'NONE' || this.isPortalOpen) return;
      const target = ev.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'BUTTON' ||
          target.closest('button'))
      ) {
        return;
      }
      if (ev.button === 0 || ev.button === 1 || ev.button === 2) {
        this.isDraggingCamera = true;
        this.sTurnTargetYaw = null;
        this.sMovementYaw = null;
      }
    });

    window.addEventListener('mouseup', (ev) => {
      if ((ev.buttons & 7) === 0) {
        this.isDraggingCamera = false;
      }
    });

    window.addEventListener('blur', () => {
      this.isDraggingCamera = false;
      this.keysDown.clear();
      this.sTurnTargetYaw = null;
      this.sMovementYaw = null;
    });

    window.addEventListener('focus', () => {
      this.keysDown.clear();
      if (!this.isPortalOpen && this.hud.activeModal === 'NONE') {
        this.canvas.focus();
      }
    });

    // Prevent text / screen selection becoming blue
    window.addEventListener('selectstart', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      e.preventDefault();
    });
    window.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      e.preventDefault();
    });

    this.canvas.addEventListener(
      'wheel',
      (ev) => {
        if (this.isPortalOpen) return;
        ev.preventDefault();
        this.world3D.cameraDistance = Math.max(
          6.0,
          Math.min(28, this.world3D.cameraDistance + Math.sign(ev.deltaY) * 1.4)
        );
      },
      { passive: false }
    );
  }

  private cycleTabTarget(): void {
    const hostiles = this.npcs
      .filter((n) => !n.isDead && this.isHostileToMe(n))
      .map((n) => ({
        npc: n,
        dist: Math.hypot(n.x - this.localPred.x, n.y - this.localPred.z),
      }))
      .filter((item) => item.dist <= 45)
      .sort((a, b) => a.dist - b.dist);

    if (hostiles.length === 0) return;
    this.tabCycleIndex = (this.tabCycleIndex + 1) % hostiles.length;
    this.sendPacket({
      type: 'SELECT_TARGET',
      targetId: hostiles[this.tabCycleIndex].npc.id,
    });
  }

  private updateLocalMovement60Fps(dt: number): void {
    if (this.isPortalOpen) return;
    const me = this.getMyPlayer();
    if (me?.isDead) return;

    const isPinned = me?.auras.some(
      (a) =>
        a.definition.flags?.isStun ||
        a.definition.flags?.isRoot ||
        a.definition.flags?.isDisorient
    );
    if (isPinned) {
      if (this.localPred) {
        this.localPred.animState = 'Idle';
      }
      return;
    }

    let moveX = 0;
    let moveZ = 0;
    if (this.keysDown.has('w') || this.keysDown.has('keyw') || this.keysDown.has('arrowup')) moveZ -= 1;
    if (this.keysDown.has('s') || this.keysDown.has('keys') || this.keysDown.has('arrowdown')) moveZ += 1;
    if (this.keysDown.has('a') || this.keysDown.has('keya') || this.keysDown.has('arrowleft')) moveX -= 1;
    if (this.keysDown.has('d') || this.keysDown.has('keyd') || this.keysDown.has('arrowright')) moveX += 1;

    const isCameraFixated = this.isDraggingCamera || Boolean(document.pointerLockElement);
    if (isCameraFixated) {
      this.sTurnTargetYaw = null;
      this.sMovementYaw = null;
    }

    // Smooth camera rotation when pressing [S] or steering with [A]/[D] (from Arcanastride RPG)
    // NEVER rotate camera with WASD if cursor is held or pointer locked!
    if (!isCameraFixated && this.sTurnTargetYaw !== null) {
      if (moveZ > 0 && moveX !== 0 && this.sMovementYaw !== null) {
        this.sMovementYaw -= moveX * 2.1 * dt;
        this.sTurnTargetYaw = this.sMovementYaw + Math.PI;
      }
      this.world3D.cameraYaw = lerpAngle(
        this.world3D.cameraYaw,
        this.sTurnTargetYaw,
        Math.min(1, dt * 8.5)
      );
      let rem = ((this.sTurnTargetYaw - this.world3D.cameraYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (rem < -Math.PI) rem += Math.PI * 2;
      if (Math.abs(rem) < 0.015 && moveZ <= 0) {
        this.world3D.cameraYaw = this.sTurnTargetYaw;
        this.sTurnTargetYaw = null;
      }
    } else if (!isCameraFixated && moveX !== 0) {
      this.world3D.cameraYaw -= moveX * 1.9 * dt;
    }

    const isMounted = Boolean(me?.isMounted);
    const isSprinting = this.keysDown.has('shift');
    const isAscending = isMounted && (this.keysDown.has(' ') || this.keysDown.has('space'));
    const isDescending = isMounted && (this.keysDown.has('x') || this.keysDown.has('c'));

    if (isMounted) {
      if (isAscending) {
        this.localPred.heightY = Math.min(55, this.localPred.heightY + 18 * dt);
      } else if (isDescending) {
        this.localPred.heightY = Math.max(0, this.localPred.heightY - 18 * dt);
      } else if (this.localPred.heightY < 1.8 && !this.keysDown.has('x')) {
        this.localPred.heightY = Math.min(1.8, this.localPred.heightY + 4 * dt);
      }
    } else if (me && me.z === 0) {
      this.localPred.heightY = 0;
    }

    if (moveX !== 0 || moveZ !== 0) {
      const refYaw =
        !isCameraFixated && moveZ > 0 && this.sMovementYaw !== null
          ? this.sMovementYaw
          : this.world3D.cameraYaw;
      const moveAngle = Math.atan2(moveX, moveZ) + refYaw;
      this.lastLocalInputAtMs = performance.now();
      this.localPred.rotY = lerpAngle(this.localPred.rotY, moveAngle, Math.min(1, dt * 15));

      let baseSpeed = 16.5;
      if (isMounted) {
        baseSpeed = this.localPred.heightY > 2.5 ? (isSprinting ? 46.0 : 38.0) : 30.5;
      } else if (isSprinting) {
        baseSpeed = 22.0;
      }
      const speed = baseSpeed * (me?.computedStats.moveSpeedMultiplier ?? 1.0);

      this.localPred.x = Math.max(
        -750,
        Math.min(750, this.localPred.x + Math.sin(moveAngle) * speed * dt)
      );
      this.localPred.z = Math.max(
        -750,
        Math.min(750, this.localPred.z + Math.cos(moveAngle) * speed * dt)
      );

      // Solid Wall & Obstacle Collision with Tangential Sliding
      const resolved = collisionWorld.resolvePlayerPosition(
        this.localPred.x,
        this.localPred.z,
        this.localPred.heightY,
        0.85,
        this.instanceInfo?.instanceId || 'open_world_nexus'
      );
      this.localPred.x = resolved.x;
      this.localPred.z = resolved.z;

      this.localPred.animState = isMounted ? 'Flight' : (isSprinting ? 'Sprint' : 'Run');

      if (me) {
        me.x = this.localPred.x;
        me.y = this.localPred.z;
        me.z = this.localPred.heightY;
      }
    } else {
      if (isMounted) {
        this.localPred.animState = 'Flight';
        if (me) {
          me.x = this.localPred.x;
          me.y = this.localPred.z;
          me.z = this.localPred.heightY;
        }
      } else {
        this.localPred.animState = me?.activeCast
          ? me.activeCast.isChannel
            ? 'Channel_Loop'
            : 'Attack_Cast'
          : 'Idle';
      }
    }

    // Anti-stacking / entity soft collision against living actors
    if (this.localPred.heightY < 3.0) {
      for (const ent of [...this.npcs, ...this.players]) {
        if (ent.id === this.myPlayerId || ent.isDead) continue;
        if ((ent.z || 0) > 3.0) continue;

        const isBoss = (ent as any).npcType === 'ELITE_BOSS';
        const isDummy = (ent as any).npcType === 'TRAINING_DUMMY';
        // Only solid world bosses and training dummies have physical collision (players & friendly NPCs pass freely)
        if (!isBoss && !isDummy) continue;
        const entRadius = isBoss ? 2.0 : 1.2;
        const myRadius = 0.85;
        const minDist = entRadius + myRadius;

        const dx = this.localPred.x - ent.x;
        const dz = this.localPred.z - ent.y;
        if (Math.abs(dx) >= minDist || Math.abs(dz) >= minDist) continue;

        const distSq = dx * dx + dz * dz;
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - (dist || 0.0001);
          const nx = dist > 0.0001 ? dx / dist : 1.0;
          const nz = dist > 0.0001 ? dz / dist : 0.0;
          const push = Math.min(overlap, dt * 6.0);
          this.localPred.x += nx * push;
          this.localPred.z += nz * push;
          const resolvedPush = collisionWorld.resolvePlayerPosition(
            this.localPred.x,
            this.localPred.z,
            this.localPred.heightY,
            0.85,
            this.instanceInfo?.instanceId || 'open_world_nexus'
          );
          this.localPred.x = resolvedPush.x;
          this.localPred.z = resolvedPush.z;
          if (me) {
            me.x = this.localPred.x;
            me.y = this.localPred.z;
          }
        }
      }
    }

    this.checkZoneDiscovery();
  }

  private applyWorldState(packet: Extract<ServerPacket, { type: 'WORLD_STATE' }>): void {
    const prevInstanceId = this.instanceInfo?.instanceId;
    this.serverTimeOffsetMs = packet.serverTimeMs - Date.now();
    this.instanceInfo = packet.instanceInfo;
    this.queueStatus = packet.queueStatus;
    this.players = packet.players;
    this.npcs = packet.npcs;
    this.groundZones = packet.groundZones;
    this.relicNodes = packet.relicNodes;

    this.world3D.setInstanceEnvironmentTheme(packet.instanceInfo.templateId);
    const me = this.getMyPlayer();

    if (me) {
      const distFromPred = Math.hypot(me.x - this.localPred.x, me.y - this.localPred.z);
      const changedInstance = prevInstanceId && prevInstanceId !== packet.instanceInfo.instanceId;
      const hardDesyncThreshold = me.isMounted ? 95.0 : 80.0;
      // The server follows the client's reported position, so while the player has been moving
      // locally a far-away server position is just an old snapshot, not a correction. Treating it as
      // one is what rubberbanded the player back to where they started walking.
      const movedLocallyRecently = performance.now() - this.lastLocalInputAtMs < 2500;

      // Only snap on initial spawn, dungeon zone change, death respawn, or a genuine major teleport (>80yd).
      if (
        !this.hasSyncedInitialPos ||
        changedInstance ||
        me.isDead ||
        (distFromPred > hardDesyncThreshold && !movedLocallyRecently)
      ) {
        this.localPred.x = me.x;
        this.localPred.z = me.y;
        this.localPred.heightY = me.z;
        this.hasSyncedInitialPos = true;
      } else if (!me.isMounted && me.z === 0) {
        this.localPred.heightY = 0;
      }
    }

    this.world3D.syncWorldState({
      players: this.players,
      npcs: this.npcs,
      groundZones: this.groundZones,
      relicNodes: this.relicNodes,
      myPlayerId: this.myPlayerId,
      myTargetId: me?.targetId ?? null,
      isHostileToMe: (ent) => this.isHostileToMe(ent),
    });

    this.spawnVfxForNewEvents(packet.recentEvents);
    this.hud.ingestCombatEvents(packet.recentEvents);
  }

  private checkZoneDiscovery(): void {
    if (this.instanceInfo?.instanceId !== 'open_world_nexus') return;
    const x = this.localPred.x;
    const z = this.localPred.z;
    let biomeId: string | null = null;
    let title = '';
    let sub = '';
    let desc = '';

    // Check Faction Home Base Strongholds (Sanctuary Bases)
    if (Math.hypot(x - (-22), z - (-22)) <= 14) {
      biomeId = 'aether_base';
      title = 'ASTRAL CONCLAVE STRONGHOLD';
      sub = 'AETHER HOME BASE • SANCTUARY';
      desc = 'Home of the Chronosavants & Riftblades • Safe Sanctuary';
    } else if (Math.hypot(x - 22, z - (-22)) <= 14) {
      biomeId = 'solari_base';
      title = 'SUNSPIRE DAWN CITADEL';
      sub = 'SOLARI HOME BASE • SANCTUARY';
      desc = 'Home of the Sunforged Paladins & Clerics • Safe Sanctuary';
    } else if (Math.hypot(x - 22, z - 22) <= 14) {
      biomeId = 'terra_base';
      title = 'ROOTDEEP GROVE SANCTUARY';
      sub = 'TERRA HOME BASE • SANCTUARY';
      desc = 'Home of the Cragwardens & Sylvan Weavers • Safe Sanctuary';
    } else if (Math.hypot(x - (-22), z - 22) <= 14) {
      biomeId = 'umbri_base';
      title = 'DUSKVEIL SHADOW HAVEN';
      sub = 'UMBRI HOME BASE • SANCTUARY';
      desc = 'Home of the Nightblades & Hexbinders • Safe Sanctuary';
    } else if (Math.hypot(x, z) <= 24) {
      biomeId = 'nexus';
      title = 'THE NEXUS SANCTUARY';
      sub = 'CENTRAL SAFE HAVEN';
      desc = 'Sanctuary Hub • Target Dummies, Relic Archivist & Dungeon Matchmaking';
    } else if (Math.hypot(x, z) <= 65) {
      biomeId = 'starter_wilds';
      title = 'VERDANT PERIMETER WILDS';
      sub = 'STARTER LEVELING ZONE • LV. 1–5';
      desc = 'Forest Wasps, Burrowers, Skeletal Scouts & Outlaw Chieftain Gorgar';
    } else if (Math.hypot(x, z) <= 130) {
      biomeId = 'crossroad_valley';
      title = 'THE CONTESTED CROSSROAD VALLEY';
      sub = 'MIXED FACTION SKIRMISH ZONE • LV. 6–15';
      desc = 'Clashing Vanguard forces from all 4 Factions & Warlord Kraag';
    } else if (x > 60 && z < -60) {
      biomeId = 'solari';
      title = 'SOLARI SUN-DUNES';
      sub = 'FACTION WARZONE • LV. 16–28';
      desc = 'Sunspire Ascent • Solar Zealots & High Inquisitor Valerius';
    } else if (x > 60 && z > 60) {
      biomeId = 'terra';
      title = 'TERRA ROOTDEEP WILDS';
      sub = 'FACTION WARZONE • LV. 28–40';
      desc = 'Primeval Grove • Moss Treants, Brambles & Colossus of Rootdeep';
    } else if (x < -60 && z > 60) {
      biomeId = 'umbri';
      title = 'UMBRI DUSKVEIL UNDERCROFT';
      sub = 'FACTION WARZONE • LV. 40–52';
      desc = 'Twilight Swamplands & Trenches • Assassins & Shadowlord Malakor';
    } else if (x < -60 && z < -60) {
      biomeId = 'aether';
      title = 'AETHER ASTRAL RIFT FRACTURE';
      sub = 'MYTHIC ELITE WARZONE • LV. 52–60';
      desc = 'Cosmic Singularity Fracture • Void Titans & Sovereign of Time';
    }

    if (biomeId && biomeId !== this.currentDiscoveredBiome) {
      this.currentDiscoveredBiome = biomeId;
      this.hud.showZoneBanner(title, sub, desc);
    }
  }

  private sendMovementTick(): void {
    if (this.isPortalOpen) return;
    const me = this.getMyPlayer();
    if (!me) return;

    const isMoving =
      this.keysDown.has('w') ||
      this.keysDown.has('keyw') ||
      this.keysDown.has('s') ||
      this.keysDown.has('keys') ||
      this.keysDown.has('a') ||
      this.keysDown.has('keya') ||
      this.keysDown.has('d') ||
      this.keysDown.has('keyd') ||
      this.keysDown.has('arrowup') ||
      this.keysDown.has('arrowdown') ||
      this.keysDown.has('arrowleft') ||
      this.keysDown.has('arrowright');

    const isMounted = Boolean(me.isMounted);
    const isHeightChanging =
      isMounted && (this.keysDown.has(' ') || this.keysDown.has('space') || this.keysDown.has('x') || this.keysDown.has('c'));

    const dx = isMoving ? Math.sin(this.localPred.rotY) : 0;
    const dy = isMoving ? Math.cos(this.localPred.rotY) : 0;
    const facingRad = Math.atan2(Math.cos(this.localPred.rotY), Math.sin(this.localPred.rotY));

    const serverDist = Math.hypot(me.x - this.localPred.x, me.y - this.localPred.z);
    if (isMoving || isHeightChanging || this.wasMovingLastTick || serverDist > 0.05) {
      this.wasMovingLastTick = isMoving || isHeightChanging;
      this.sendPacket({
        type: 'MOVE_INPUT',
        dx,
        dy,
        x: this.localPred.x,
        y: this.localPred.z,
        z: this.localPred.heightY,
        facingRad,
        isSprinting: this.keysDown.has('shift'),
      });
    }
  }

  private renderLoop(): void {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastFrameTimeMs) / 1000);
    this.lastFrameTimeMs = now;

    try {
      if (this.pendingWorldStateRaw !== null) {
        const raw = this.pendingWorldStateRaw;
        this.pendingWorldStateRaw = null;
        this.applyWorldState(JSON.parse(raw));
      }
      this.updateLocalMovement60Fps(dt);
      const me = this.getMyPlayer();
      this.world3D.renderFrame(me, this.isPortalOpen ? null : this.localPred);
      if (!this.isPortalOpen) {
        this.hud.updateFrame();
      }
    } catch (err) {
      console.error('[Glimmerfall] Frame render error:', err);
    }
    requestAnimationFrame(() => this.renderLoop());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Glimmerfall3DClient();
});

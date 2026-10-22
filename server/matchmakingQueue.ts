import {
  ClassId,
  InstanceTemplateId,
  PlayerEntity,
  QueueRole,
  QueueStatusState,
} from '../shared/types';
import { INSTANCES_REGISTRY } from '../shared/instancesRegistry';
import { WorldManager } from './worldManager';
import { CombatEngine } from './combatEngine';

interface QueuedPlayerTicket {
  playerId: string;
  templateId: InstanceTemplateId;
  role: QueueRole;
  queuedAtMs: number;
  popReady: boolean;
  popInstanceId: string | null;
  popExpiresAtMs: number;
  partyPreview: { name: string; role: QueueRole; classId: ClassId; isAi: boolean }[];
}

export class MatchmakingQueue {
  private world: WorldManager;
  private combat: CombatEngine;
  private tickets: Map<string, QueuedPlayerTicket> = new Map();
  private aiSeq = 1;

  constructor(world: WorldManager, combat: CombatEngine) {
    this.world = world;
    this.combat = combat;
  }

  public joinQueue(
    player: PlayerEntity,
    templateId: InstanceTemplateId,
    role: QueueRole,
    now: number
  ): void {
    if (templateId === 'open_world_nexus') return;
    player.queueRole = role;
    this.tickets.set(player.id, {
      playerId: player.id,
      templateId,
      role,
      queuedAtMs: now,
      popReady: false,
      popInstanceId: null,
      popExpiresAtMs: 0,
      partyPreview: this.buildPartyPreview(player, role),
    });
  }

  public leaveQueue(playerId: string): void {
    this.tickets.delete(playerId);
  }

  public triggerInstantAiPop(
    player: PlayerEntity,
    templateId: InstanceTemplateId,
    role: QueueRole,
    now: number
  ): void {
    if (templateId === 'open_world_nexus') return;
    player.queueRole = role;
    const preview = this.buildPartyPreview(player, role);
    this.tickets.set(player.id, {
      playerId: player.id,
      templateId,
      role,
      queuedAtMs: now,
      popReady: true,
      popInstanceId: null,
      popExpiresAtMs: now + 45000,
      partyPreview: preview,
    });
  }

  public acceptQueuePop(player: PlayerEntity, now: number): void {
    const ticket = this.tickets.get(player.id);
    if (!ticket || !ticket.popReady) return;

    const templateId = ticket.templateId;
    const def = INSTANCES_REGISTRY[templateId];
    this.tickets.delete(player.id);

    // 1. Save exact 3D Open-World coordinates if currently in open world
    if (player.instanceId === 'open_world_nexus') {
      player.savedOpenWorldPos = {
        x: player.x,
        y: player.y,
        z: player.z,
      };
    } else {
      const oldInst = player.instanceId;
      player.instanceId = 'open_world_nexus';
      this.world.cleanupEmptyInstance(oldInst);
    }

    // 2. Create isolated Server Instance Room
    const instanceId = this.world.createInstanceRoom(templateId, now);

    // 3. Teleport player into the Instance Spawn Point
    player.instanceId = instanceId;
    player.x = def.spawnPoint.x;
    player.y = def.spawnPoint.y;
    player.z = def.spawnPoint.z;
    player.hp = player.maxHp;
    player.primaryResource = player.maxPrimaryResource;
    player.animState = 'Idle';

    // Do not pre-register target for human player; allow user to pick their own target
    const firstBoss = Array.from(this.world.npcs.values()).find(
      (n) => n.instanceId === instanceId && n.isHostile
    );
    player.targetId = null;

    // 4. Spawn AI Hero Companions from partyPreview
    ticket.partyPreview.forEach((member, idx) => {
      if (!member.isAi) return;
      const aiId = `ai_companion_${this.aiSeq++}`;
      const aiHero = this.combat.createPlayer(
        aiId,
        member.name,
        member.classId,
        now,
        true,
        instanceId
      );
      aiHero.queueRole = member.role;
      aiHero.tankStance = member.role === 'TANK';
      aiHero.x = def.spawnPoint.x + (idx - 2) * 3.2;
      aiHero.y = def.spawnPoint.y + 2.5;
      aiHero.z = 0;
      aiHero.targetId = firstBoss?.id ?? null;
      this.world.players.set(aiHero.id, aiHero);
    });

    this.combat.emitEvent({
      instanceId,
      timestampMs: now,
      type: 'AURA_APPLIED',
      sourceId: player.id,
      sourceName: player.name,
      targetId: player.id,
      targetName: player.name,
      message: `⚔️ Entered [${def.name}] (${instanceId}) with AI Companion Party! Saved open-world coordinates for return.`,
    });
  }

  public returnToOpenWorld(player: PlayerEntity, now: number): void {
    if (player.instanceId === 'open_world_nexus') return;

    const oldInstanceId = player.instanceId;
    const instSummary = this.world.instances.get(oldInstanceId);

    player.instanceId = 'open_world_nexus';
    if (player.savedOpenWorldPos) {
      player.x = player.savedOpenWorldPos.x;
      player.y = player.savedOpenWorldPos.y;
      player.z = player.savedOpenWorldPos.z;
      player.savedOpenWorldPos = null;
    } else {
      player.x = 0;
      player.y = -8;
      player.z = 0;
    }

    player.hp = player.maxHp;
    player.primaryResource = player.maxPrimaryResource;
    player.targetId = null;
    player.animState = 'Idle';

    this.world.cleanupEmptyInstance(oldInstanceId);

    this.combat.emitEvent({
      instanceId: 'open_world_nexus',
      timestampMs: now,
      type: 'AURA_APPLIED',
      sourceId: player.id,
      sourceName: player.name,
      targetId: player.id,
      targetName: player.name,
      message: instSummary?.isCompleted
        ? `🏆 ${player.name} returned to Glimmerfall Expanse victorious with [${instSummary.completionRewardText}]!`
        : `🌀 ${player.name} teleported back to saved coordinates in the Glimmerfall Expanse.`,
    });
  }

  public tick(now: number): void {
    for (const [playerId, ticket] of this.tickets.entries()) {
      const elapsedSec = Math.floor((now - ticket.queuedAtMs) / 1000);
      // Automatically pop queue with AI companions if waiting >= 15 seconds
      if (!ticket.popReady && elapsedSec >= 15) {
        ticket.popReady = true;
        ticket.popExpiresAtMs = now + 45000;
      }
      if (ticket.popReady && now > ticket.popExpiresAtMs) {
        this.tickets.delete(playerId);
      }
    }
  }

  public getPlayerQueueStatus(player: PlayerEntity, now: number): QueueStatusState {
    const ticket = this.tickets.get(player.id);
    if (!ticket) {
      return {
        isQueued: false,
        templateId: null,
        role: player.queueRole,
        queuedAtMs: 0,
        elapsedSec: 0,
        canInstantAiPop: true,
        popReady: false,
        popInstanceId: null,
        popTemplateId: null,
        popExpiresAtMs: 0,
        partyPreview: [],
      };
    }

    const elapsedSec = Math.max(0, Math.floor((now - ticket.queuedAtMs) / 1000));
    return {
      isQueued: true,
      templateId: ticket.templateId,
      role: ticket.role,
      queuedAtMs: ticket.queuedAtMs,
      elapsedSec,
      canInstantAiPop: true,
      popReady: ticket.popReady,
      popInstanceId: ticket.popInstanceId,
      popTemplateId: ticket.templateId,
      popExpiresAtMs: ticket.popExpiresAtMs,
      partyPreview: ticket.partyPreview,
    };
  }

  private buildPartyPreview(
    player: PlayerEntity,
    playerRole: QueueRole
  ): { name: string; role: QueueRole; classId: ClassId; isAi: boolean }[] {
    const party: { name: string; role: QueueRole; classId: ClassId; isAi: boolean }[] = [
      {
        name: `${player.name} (You)`,
        role: playerRole,
        classId: player.classId,
        isAi: false,
      },
    ];

    if (playerRole !== 'TANK') {
      party.push({
        name: 'Templar Auron [AI]',
        role: 'TANK',
        classId: 'SUNFORGED_PALADIN',
        isAi: true,
      });
    } else {
      party.push({
        name: 'Riftblade Kael [AI]',
        role: 'DPS',
        classId: 'RIFTBLADE_SPELLWEAVER',
        isAi: true,
      });
    }

    if (playerRole !== 'HEALER') {
      party.push({
        name: 'Arch-Weaver Lyra [AI]',
        role: 'HEALER',
        classId: 'SYLVAN_WEAVER',
        isAi: true,
      });
    } else {
      party.push({
        name: 'Hexbinder Morvath [AI]',
        role: 'DPS',
        classId: 'HEXBINDER_WARLOCK',
        isAi: true,
      });
    }

    party.push(
      {
        name: 'Nightblade Vex [AI]',
        role: 'DPS',
        classId: 'NIGHTBLADE_ASSASSIN',
        isAi: true,
      },
      {
        name: 'Chronosavant Seraph [AI]',
        role: 'DPS',
        classId: 'CHRONOSAVANT_MAGE',
        isAi: true,
      }
    );

    return party;
  }
}

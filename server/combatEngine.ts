import {
  AbilityDefinition,
  ActiveAura,
  AuraDefinition,
  ClassId,
  CombatEventType,
  CombatLogEvent,
  ComputedStats,
  EntityBase,
  GroundZone,
  NpcEntity,
  PlayerEntity,
  PrimaryAttributes,
  QueueRole,
  SecondaryAttributes,
  SpellSchool,
} from '../shared/types';
import { ALL_ABILITIES, CLASSES_REGISTRY } from '../shared/classesRegistry';
import {
  DEFAULT_DECK_BY_FACTION,
  FACTIONS_REGISTRY,
  TCG_RELIC_BY_ID,
  ZENITH_RADIANT_BURN_AURA,
  ZENITH_STATE_AURA,
} from '../shared/factionsRegistry';
import { collisionWorld } from '../shared/collisionEngine';
import { TALENT_NODE_BY_ID } from '../shared/talentsRegistry';
import { WorldManager } from './worldManager';
import { characterStore } from './characterStore';

export class CombatEngine {
  private world: WorldManager;
  public recentEvents: CombatLogEvent[] = [];
  private eventSeq = 1;
  private auraSeq = 1;
  private zoneSeq = 1;

  public readonly SPELL_QUEUE_WINDOW_MS = 400;
  public readonly BASE_GCD_MS = 1500;
  public readonly MIN_GCD_MS = 750;

  constructor(world: WorldManager) {
    this.world = world;
  }

  public isEntityHostileTo(source: EntityBase, target: EntityBase): boolean {
    if (source.id === target.id) return false;

    // Target dummies are always attackable practice targets
    if (target.kind === 'NPC' && (target as NpcEntity).npcType === 'TRAINING_DUMMY') {
      return true;
    }
    // Ally spirits are always friendly healing targets
    if (target.kind === 'NPC' && (target as NpcEntity).npcType === 'ALLY_SPIRIT') {
      return false;
    }

    // Void Incursion mobs attacking the realm are hostile to all mortal factions
    if (target.kind === 'NPC' && (target as NpcEntity).isVoidIncursion) {
      return true;
    }
    if (source.kind === 'NPC' && (source as NpcEntity).isVoidIncursion) {
      return true;
    }

    const sFac = (source.factionId || '').toUpperCase();
    const tFac = (target.factionId || '').toUpperCase();

    // Player perspective
    if (source.kind === 'PLAYER') {
      const player = source as PlayerEntity;
      if (target.kind === 'NPC') {
        const npc = target as NpcEntity;
        // Same faction NPCs (guards, leaders, quartermasters, allies, faction members) are ALWAYS friendly!
        if (sFac && tFac && sFac === tFac) {
          return false;
        }
        // Opposing faction base guards defend against opposing faction intruders
        if (npc.npcType === 'BASE_GUARD') {
          return true;
        }
        // Peaceful quartermasters and faction leaders are neutral/friendly
        if (npc.npcType === 'QUARTERMASTER' || npc.npcType === 'FACTION_LEADER') {
          return false;
        }
        // Different faction NPCs in warzones or opposing bases are hostile
        return npc.isHostile;
      }
      if (target.kind === 'PLAYER') {
        const otherPlayer = target as PlayerEntity;
        return sFac !== tFac;
      }
    }

    // NPC perspective
    if (source.kind === 'NPC') {
      const npc = source as NpcEntity;
      if (npc.npcType === 'TRAINING_DUMMY' || npc.npcType === 'ALLY_SPIRIT') {
        return false;
      }
      if (target.kind === 'PLAYER') {
        const targetPlayer = target as PlayerEntity;
        // NPCs never attack players of their own faction!
        if (sFac && tFac && sFac === tFac) {
          return false;
        }
        // Opposing faction base guards defend against intruders
        if (npc.npcType === 'BASE_GUARD') {
          return true;
        }
        if (npc.npcType === 'QUARTERMASTER' || npc.npcType === 'FACTION_LEADER') {
          return false;
        }
        return npc.isHostile;
      }
      if (target.kind === 'NPC') {
        const otherNpc = target as NpcEntity;
        return sFac !== tFac && (npc.isHostile || npc.npcType === 'BASE_GUARD');
      }
    }

    return false;
  }

  public getDefaultTacticalLoadout(classId: ClassId): [string, string, string, string, string, string] {
    const cls = CLASSES_REGISTRY[classId];
    const abs = cls.abilities;
    // [LMB (Builder/Primary), RMB (Spender/Secondary), Q (Skill 1), E (Skill 2), R (Skill 3), F (Ultimate)]
    return [
      abs[0]?.id ?? '',
      abs[1]?.id ?? '',
      abs[2]?.id ?? '',
      abs[3]?.id ?? '',
      abs[4]?.id ?? '',
      abs[8]?.id ?? abs[6]?.id ?? '',
    ];
  }

  public getDefaultQueueRole(classId: ClassId): QueueRole {
    const role = CLASSES_REGISTRY[classId].role;
    if (role === 'TANK') return 'TANK';
    if (role === 'HEALER') return 'HEALER';
    return 'DPS';
  }

  public createPlayer(
    id: string,
    name: string,
    classId: ClassId,
    now: number,
    isAiCompanion = false,
    instanceId = 'open_world_nexus'
  ): PlayerEntity {
    const cls = CLASSES_REGISTRY[classId];
    const faction = FACTIONS_REGISTRY[cls.factionId];

    const actionBars: (string | null)[] = new Array(24).fill(null);
    cls.abilities.forEach((ab, idx) => {
      if (idx < 24) {
        actionBars[idx] = ab.id;
      }
    });

    const maxPrimary =
      faction.primaryResource === 'PRIMAL_FURY' || faction.primaryResource === 'SHADOW_ENERGY'
        ? 100
        : 1000 + cls.baseAttributes.intellect * 15;

    const maxSecondary =
      faction.secondaryResource === 'SOLAR_CHARGE'
        ? 100
        : faction.secondaryResource === 'ASTRAL_RESONANCE'
        ? 4
        : 5;

    const player: PlayerEntity = {
      id,
      instanceId,
      name,
      kind: 'PLAYER',
      classId,
      factionId: cls.factionId,
      role: cls.role,
      queueRole: this.getDefaultQueueRole(classId),
      isAiCompanion,
      tankStance: cls.role === 'TANK',
      level: 1,
      x: faction.sanctuaryOffset.x + (Math.random() * 4 - 2),
      y: faction.sanctuaryOffset.y + (Math.random() * 4 - 2),
      z: 0,
      facingRad: -Math.PI / 2,
      hp: cls.baseAttributes.stamina * 15,
      maxHp: cls.baseAttributes.stamina * 15,
      isDead: false,
      targetId: null,
      auras: [],
      activeCast: null,
      schoolLockouts: {},
      animState: 'Idle',
      animUpdatedAtMs: now,
      primaryResourceType: faction.primaryResource,
      primaryResource: faction.primaryResource === 'PRIMAL_FURY' ? 50 : maxPrimary,
      maxPrimaryResource: maxPrimary,
      secondaryResourceType: faction.secondaryResource,
      secondaryResource: 0,
      maxSecondaryResource: maxSecondary,
      attributes: { ...cls.baseAttributes },
      secondaryAttributes: { ...cls.baseSecondary },
      computedStats: {
        maxHp: cls.baseAttributes.stamina * 15,
        maxPrimaryResource: maxPrimary,
        maxSecondaryResource: maxSecondary,
        spellPower: 200,
        attackPower: 200,
        armor: 500,
        blockChancePct: 10,
        blockValue: 80,
        dodgeChancePct: 8,
        critChancePct: 15,
        hastePct: 0.1,
        masteryPct: 0.12,
        versatilityDmgPct: 0.05,
        versatilityDrPct: 0.025,
        gcdDurationMs: 1360,
        moveSpeedMultiplier: 1.0,
        damageMultiplier: 1.0,
        healingMultiplier: 1.0,
        damageTakenMultiplier: 1.0,
      },
      gcdStartedAtMs: 0,
      gcdEndsAtMs: 0,
      queuedSpell: null,
      cooldowns: {},
      actionBars,
      tacticalLoadout: this.getDefaultTacticalLoadout(classId),
      dodgeCooldownEndsAtMs: 0,
      jumpEndsAtMs: 0,
      talents: {},
      talentPointsAvailable: 60,
      equippedRelicDeck: [...DEFAULT_DECK_BY_FACTION[cls.factionId]] as [string, string, string],
      currentXp: 0,
      maxXp: 300,
      attributePointsAvailable: 5,
      abilityPointsAvailable: 1,
      abilityRanks: Object.fromEntries(cls.abilities.map((a) => [a.id, 1])),
      allocatedAttributes: { stamina: 0, intellect: 0, strength: 0, agility: 0, spirit: 0 },
      inCombat: false,
      lastCombatAtMs: now,
      savedOpenWorldPos: null,
      rewindSnapshot: null,
      portalPosition: null,
    };

    this.recalculatePlayerStats(player);
    player.hp = player.maxHp;
    if (player.primaryResourceType !== 'PRIMAL_FURY') {
      player.primaryResource = player.maxPrimaryResource;
    }

    return player;
  }

  public switchPlayerClass(player: PlayerEntity, newClassId: ClassId, now: number): void {
    const cls = CLASSES_REGISTRY[newClassId];
    const faction = FACTIONS_REGISTRY[cls.factionId];

    player.classId = newClassId;
    player.factionId = cls.factionId;
    player.role = cls.role;
    player.queueRole = this.getDefaultQueueRole(newClassId);
    player.tankStance = cls.role === 'TANK';
    player.attributes = { ...cls.baseAttributes };
    player.secondaryAttributes = { ...cls.baseSecondary };
    player.primaryResourceType = faction.primaryResource;
    player.secondaryResourceType = faction.secondaryResource;
    player.secondaryResource = 0;
    player.auras = [];
    player.activeCast = null;
    player.queuedSpell = null;
    player.cooldowns = {};
    player.talents = {};
    player.talentPointsAvailable = 60;
    player.equippedRelicDeck = [...DEFAULT_DECK_BY_FACTION[cls.factionId]] as [
      string,
      string,
      string,
    ];

    player.actionBars = new Array(24).fill(null);
    cls.abilities.forEach((ab, idx) => {
      if (idx < 24) {
        player.actionBars[idx] = ab.id;
      }
    });
    player.tacticalLoadout = this.getDefaultTacticalLoadout(newClassId);

    this.recalculatePlayerStats(player);
    player.hp = player.maxHp;
    player.primaryResource =
      player.primaryResourceType === 'PRIMAL_FURY' ? 50 : player.maxPrimaryResource;
    player.lastCombatAtMs = now;
  }

  public handleJumpOrDodge(
    player: PlayerEntity,
    action: 'JUMP' | 'DODGE',
    facingRad: number,
    now: number
  ): void {
    if (player.isDead) return;
    player.facingRad = facingRad;

    if (action === 'JUMP') {
      if (now < player.jumpEndsAtMs) return;
      player.jumpEndsAtMs = now + 650;
      player.z = 2.6;
      player.animState = 'Jump';
      player.animUpdatedAtMs = now;
    } else if (action === 'DODGE') {
      if (now < player.dodgeCooldownEndsAtMs) return;
      player.dodgeCooldownEndsAtMs = now + 4000;
      const dashDist = 8.5;
      player.x = Math.max(-750, Math.min(750, player.x + Math.sin(facingRad) * dashDist));
      player.y = Math.max(-750, Math.min(750, player.y + Math.cos(facingRad) * dashDist));
      player.animState = 'Sprint';
      player.animUpdatedAtMs = now;
      // Clear roots on dodge roll
      player.auras = player.auras.filter((a) => !a.definition.flags?.isRoot);
    }
  }

  public handleHarvestRelicNode(player: PlayerEntity, nodeId: string, now: number): void {
    const node = this.world.relicNodes.get(nodeId);
    if (!node || !node.isAvailable || node.instanceId !== player.instanceId) return;
    const dist = Math.hypot(node.x - player.x, node.y - player.y);
    if (dist > 10) return;

    node.isAvailable = false;
    node.respawnAtMs = now + 25000;

    // Socket harvested card into slot 1 if not already equipped
    if (!player.equippedRelicDeck.includes(node.rewardCardId)) {
      player.equippedRelicDeck = [
        node.rewardCardId,
        player.equippedRelicDeck[0],
        player.equippedRelicDeck[1],
      ];
      this.recalculatePlayerStats(player);
    }

    const card = TCG_RELIC_BY_ID[node.rewardCardId];
    this.emitEvent({
      instanceId: player.instanceId,
      timestampMs: now,
      type: 'AURA_APPLIED',
      sourceId: player.id,
      sourceName: player.name,
      targetId: player.id,
      targetName: player.name,
      auraName: card?.name ?? node.name,
      message: `✨ ${player.name} harvested ${node.name} and unlocked TCG Relic Card [${card?.name ?? node.rewardCardId}]!`,
    });
    this.awardExperience(player, 250, now);
  }

  public awardExperience(player: PlayerEntity, amount: number, now: number): void {
    if (player.isDead) return;
    if (player.currentXp === undefined) player.currentXp = 0;
    if (player.maxXp === undefined) player.maxXp = Math.round((player.level || 1) * 300);
    player.currentXp += amount;

    while (player.currentXp >= player.maxXp) {
      player.currentXp -= player.maxXp;
      player.level += 1;
      player.maxXp = Math.round(player.level * 300 * 1.25);
      player.attributePointsAvailable = (player.attributePointsAvailable || 0) + 2;
      player.abilityPointsAvailable = (player.abilityPointsAvailable || 0) + 1;
      this.recalculatePlayerStats(player);
      player.hp = player.maxHp;
      if (player.primaryResourceType !== 'PRIMAL_FURY') {
        player.primaryResource = player.maxPrimaryResource;
      }
      this.emitEvent({
        instanceId: player.instanceId,
        timestampMs: now,
        type: 'LEVEL_UP',
        sourceId: player.id,
        sourceName: player.name,
        targetId: player.id,
        targetName: player.name,
        amount: player.level,
        message: `🎉 LEVEL UP! ${player.name} has advanced to Level ${player.level}! (+2 Attribute Points, +1 Ability Point, Vitals Restored)`,
      });
    }
    characterStore.savePlayer(player);
  }

  public recalculatePlayerStats(player: PlayerEntity): ComputedStats {
    const cls = CLASSES_REGISTRY[player.classId];
    const primary: PrimaryAttributes = { ...cls.baseAttributes };
    const secondary: SecondaryAttributes = { ...cls.baseSecondary };

    // 0. Add Level attribute bonuses (+2 to all stats per level above 1)
    const levelBonus = Math.max(0, (player.level || 1) - 1) * 2;
    primary.stamina += levelBonus;
    primary.intellect += levelBonus;
    primary.strength += levelBonus;
    primary.agility += levelBonus;
    primary.spirit += levelBonus;

    // Add manually allocated attribute points
    if (player.allocatedAttributes) {
      if (player.allocatedAttributes.stamina) primary.stamina += player.allocatedAttributes.stamina;
      if (player.allocatedAttributes.intellect) primary.intellect += player.allocatedAttributes.intellect;
      if (player.allocatedAttributes.strength) primary.strength += player.allocatedAttributes.strength;
      if (player.allocatedAttributes.agility) primary.agility += player.allocatedAttributes.agility;
      if (player.allocatedAttributes.spirit) primary.spirit += player.allocatedAttributes.spirit;
    }

    let bonusCritPct = 0;
    let bonusHastePct = 0;
    let bonusDamageDonePct = 0;
    let bonusHealingDonePct = 0;
    let bonusDamageReductionPct = 0;

    // 1. Apply Talent Modifiers
    for (const [nodeId, rank] of Object.entries(player.talents)) {
      if (rank <= 0) continue;
      const node = TALENT_NODE_BY_ID[nodeId];
      if (!node) continue;
      const mod = node.modifierPerRank;
      if (mod.stat && mod.flatBonus) {
        if (mod.stat in primary) {
          primary[mod.stat as keyof PrimaryAttributes] += mod.flatBonus * rank;
        } else if (mod.stat in secondary) {
          secondary[mod.stat as keyof SecondaryAttributes] += mod.flatBonus * rank;
        }
      }
      if (mod.critBonusPct) bonusCritPct += mod.critBonusPct * rank;
      if (mod.hasteBonusPct) bonusHastePct += mod.hasteBonusPct * rank;
      if (mod.healingDonePct) bonusHealingDonePct += mod.healingDonePct * rank;
      if (mod.damageReductionPct) bonusDamageReductionPct += mod.damageReductionPct * rank;
      if (mod.damageSchoolPct) {
        for (const val of Object.values(mod.damageSchoolPct)) {
          if (val) bonusDamageDonePct += val * rank;
        }
      }
    }

    // 2. Apply Socketed 3-Card Glimmerfall TCG Relic Deck Modifiers
    for (const cardId of player.equippedRelicDeck) {
      const card = TCG_RELIC_BY_ID[cardId];
      if (!card) continue;
      if (card.modifier.bonusPrimaryStat) {
        for (const [k, v] of Object.entries(card.modifier.bonusPrimaryStat)) {
          if (v) primary[k as keyof PrimaryAttributes] += v;
        }
      }
      if (card.modifier.bonusSecondaryStat) {
        for (const [k, v] of Object.entries(card.modifier.bonusSecondaryStat)) {
          if (v) secondary[k as keyof SecondaryAttributes] += v;
        }
      }
    }

    // 3. Apply Active Aura Modifiers
    let maxHpMultiplier = 1.0;
    let spellPowerMultiplier = 1.0;
    let moveSpeedMultiplier = 1.0;
    let blockBonusPct = 0;
    let damageTakenMultiplier = 1.0 - bonusDamageReductionPct;

    for (const aura of player.auras) {
      const m = aura.definition.modifiers;
      if (!m) continue;
      const s = aura.stacks;
      if (m.damageDealtPct) bonusDamageDonePct += m.damageDealtPct * s;
      if (m.healingDonePct) bonusHealingDonePct += m.healingDonePct * s;
      if (m.hastePct) bonusHastePct += m.hastePct * s;
      if (m.moveSpeedPct) moveSpeedMultiplier += m.moveSpeedPct * s;
      if (m.blockChancePct) blockBonusPct += m.blockChancePct * 100 * s;
      if (m.maxHpPct) maxHpMultiplier += m.maxHpPct * s;
      if (m.spellPowerPct) spellPowerMultiplier += m.spellPowerPct * s;
      if (m.damageTakenPct) damageTakenMultiplier *= Math.max(0.1, 1 + m.damageTakenPct * s);
    }

    if (player.secondaryResourceType === 'ASTRAL_RESONANCE' && player.secondaryResource > 0) {
      bonusDamageDonePct += 0.15 * player.secondaryResource;
    }

    player.attributes = primary;
    player.secondaryAttributes = secondary;

    const maxHp = Math.round(primary.stamina * 15 * maxHpMultiplier);
    const maxPrimaryResource =
      player.primaryResourceType === 'PRIMAL_FURY' ||
      player.primaryResourceType === 'SHADOW_ENERGY'
        ? 100
        : 1000 + primary.intellect * 15;
    const maxSecondaryResource =
      player.secondaryResourceType === 'SOLAR_CHARGE'
        ? 100
        : player.secondaryResourceType === 'ASTRAL_RESONANCE'
        ? 4
        : 5;

    const spellPower = Math.round(primary.intellect * 2.4 * spellPowerMultiplier);
    const attackPower = Math.round(primary.strength * 2.1 + primary.agility * 2.0);
    const blockValue = Math.round(primary.strength * 0.9);
    const blockChancePct = Math.min(75, 10 + blockBonusPct);
    const dodgeChancePct = Math.min(45, +(5 + primary.agility * 0.04).toFixed(1));
    const critChancePct = Math.min(
      80,
      +(5 + primary.agility * 0.04 + secondary.critRating / 12 + bonusCritPct * 100).toFixed(1)
    );
    const hastePct = +(secondary.hasteRating / 900 + bonusHastePct).toFixed(3);
    const masteryPct = +(0.08 + secondary.masteryRating / 950).toFixed(3);
    const versatilityDmgPct = +(secondary.versatilityRating / 1000).toFixed(3);
    const versatilityDrPct = +(versatilityDmgPct / 2).toFixed(3);

    const gcdDurationMs = Math.max(
      this.MIN_GCD_MS,
      Math.round(this.BASE_GCD_MS / (1 + hastePct))
    );

    const computed: ComputedStats = {
      maxHp,
      maxPrimaryResource,
      maxSecondaryResource,
      spellPower,
      attackPower,
      armor: cls.armorType === 'HEAVY_PLATE' || cls.armorType === 'ROCKPLATE_MAIL' ? 1850 : 750,
      blockChancePct,
      blockValue,
      dodgeChancePct,
      critChancePct,
      hastePct,
      masteryPct,
      versatilityDmgPct,
      versatilityDrPct,
      gcdDurationMs,
      moveSpeedMultiplier,
      damageMultiplier: +(1 + bonusDamageDonePct + versatilityDmgPct + masteryPct * 0.6).toFixed(3),
      healingMultiplier: +(1 + bonusHealingDonePct + versatilityDmgPct + masteryPct * 0.6).toFixed(3),
      damageTakenMultiplier: Math.max(
        0.1,
        +(damageTakenMultiplier * (1 - versatilityDrPct)).toFixed(3)
      ),
    };

    player.computedStats = computed;
    player.maxHp = maxHp;
    player.maxPrimaryResource = maxPrimaryResource;
    player.maxSecondaryResource = maxSecondaryResource;
    if (player.hp > player.maxHp) {
      player.hp = player.maxHp;
    }

    return computed;
  }

  public handleCastRequest(
    player: PlayerEntity,
    abilityId: string,
    targetId?: string | null,
    groundPosition?: { x: number; y: number },
    now: number = Date.now()
  ): { ok: boolean; reason?: string; queued?: boolean } {
    if (player.isDead) {
      return { ok: false, reason: 'You are dead.' };
    }

    const ability = ALL_ABILITIES[abilityId];
    if (!ability || ability.classId !== player.classId) {
      return { ok: false, reason: 'Invalid ability for your class.' };
    }

    const isCrowdControlled = player.auras.some(
      (a) => a.definition.flags?.isStun || a.definition.flags?.isDisorient || a.definition.flags?.isFear
    );
    if (isCrowdControlled && ability.id !== 'mag_blink_step') {
      return { ok: false, reason: 'Cannot cast while crowd-controlled.' };
    }

    const isSilenced = player.auras.some((a) => a.definition.flags?.isSilence);
    if (isSilenced && ability.school !== 'PHYSICAL') {
      return { ok: false, reason: 'Silenced!' };
    }

    const schoolUnlockAt = player.schoolLockouts[ability.school] ?? 0;
    if (schoolUnlockAt > now) {
      return { ok: false, reason: `${ability.school} school locked!` };
    }

    if (!ability.isOffGCD) {
      const gcdRemaining = Math.max(0, player.gcdEndsAtMs - now);
      const castRemaining = player.activeCast ? Math.max(0, player.activeCast.endsAtMs - now) : 0;
      const busyRemaining = Math.max(gcdRemaining, castRemaining);

      if (busyRemaining > 0) {
        if (busyRemaining <= this.SPELL_QUEUE_WINDOW_MS) {
          player.queuedSpell = {
            abilityId,
            targetId: targetId ?? player.targetId ?? undefined,
            targetPosition: groundPosition,
            queuedAtMs: now,
          };
          return { ok: true, queued: true };
        }
        return { ok: false, reason: 'Global Cooldown active.' };
      }
    }

    return this.executeAbilityNow(player, ability, targetId, groundPosition, now);
  }

  private executeAbilityNow(
    player: PlayerEntity,
    ability: AbilityDefinition,
    explicitTargetId?: string | null,
    groundPosition?: { x: number; y: number },
    now: number = Date.now()
  ): { ok: boolean; reason?: string } {
    this.recalculatePlayerStats(player);

    const cdState = player.cooldowns[ability.id];
    const maxCharges = ability.maxCharges ?? 1;
    if (cdState) {
      if (maxCharges > 1) {
        if (cdState.chargesRemaining <= 0 && cdState.readyAtMs > now) {
          return { ok: false, reason: 'Ability recharging.' };
        }
      } else if (cdState.readyAtMs > now) {
        return { ok: false, reason: 'Ability on cooldown.' };
      }
    }

    if (ability.special?.requiresCasterAuraId) {
      const hasReq = player.auras.some((a) => a.auraId === ability.special?.requiresCasterAuraId);
      const hasBypass =
        ability.special.bypassRequirementAuraId &&
        player.auras.some((a) => a.auraId === ability.special?.bypassRequirementAuraId);
      if (!hasReq && !hasBypass) {
        return { ok: false, reason: `Requires ${ability.special.requiresCasterAuraId}` };
      }
    }

    // Resolve Target Entity in the same instance (with smart soft-target fallback for 3D action combat!)
    const resolvedTargetId = explicitTargetId ?? player.targetId;
    let targetEntity: EntityBase | undefined;
    if (ability.targetType === 'SELF' || ability.targetType === 'PBAOE') {
      targetEntity = player;
    } else if (ability.targetType === 'ALLY') {
      const candidate = resolvedTargetId
        ? this.world.players.get(resolvedTargetId) ?? this.world.npcs.get(resolvedTargetId)
        : player;
      if (
        candidate &&
        candidate.instanceId === player.instanceId &&
        !this.isEntityHostileTo(player, candidate)
      ) {
        targetEntity = candidate;
      } else {
        targetEntity = player;
      }
    } else if (ability.targetType === 'ENEMY' || ability.targetType === 'CONE') {
      if (resolvedTargetId) {
        const candidate =
          this.world.npcs.get(resolvedTargetId) ?? this.world.players.get(resolvedTargetId);
        if (candidate && candidate.instanceId === player.instanceId && !candidate.isDead) {
          if (this.isEntityHostileTo(player, candidate)) {
            targetEntity = candidate;
          } else if (ability.targetType === 'ENEMY') {
            return { ok: false, reason: 'Cannot attack friendly faction ally!' };
          }
        }
      }
      // Action-MMO Soft-Target Fallback: automatically pick closest hostile in front within reach
      if (!targetEntity) {
        const effectiveReach = ability.rangeYards > 0 ? ability.rangeYards + 2.0 : 6.0;
        const searchRange = Math.min(38, effectiveReach);
        const nearby = this.world
          .getEntitiesWithinRadius(player.x, player.y, searchRange, player.instanceId)
          .filter((e) => !e.isDead && this.isEntityHostileTo(player, e));
        nearby.sort(
          (a, b) =>
            Math.hypot(a.x - player.x, a.y - player.y) -
            Math.hypot(b.x - player.x, b.y - player.y)
        );
        if (nearby[0]) {
          targetEntity = nearby[0];
          player.targetId = nearby[0].id;
        }
      }
      if (!targetEntity && ability.targetType === 'ENEMY') {
        return { ok: false, reason: 'No valid enemy target in range.' };
      }
    }

    if (targetEntity && targetEntity.id !== player.id && ability.rangeYards > 0) {
      const dist = Math.hypot(targetEntity.x - player.x, targetEntity.y - player.y);
      if (dist > ability.rangeYards + 2.5) {
        return { ok: false, reason: 'Target out of range.' };
      }
      if (ability.rangeYards > 8) {
        for (const zone of this.world.groundZones.values()) {
          if (zone.instanceId === player.instanceId && zone.blocksRangedTargetingInside) {
            const targetInSmoke =
              Math.hypot(targetEntity.x - zone.x, targetEntity.y - zone.y) <= zone.radiusYards;
            const casterInSmoke =
              Math.hypot(player.x - zone.x, player.y - zone.y) <= zone.radiusYards;
            if (targetInSmoke && !casterInSmoke) {
              return { ok: false, reason: 'Target is obscured by Smoke Bomb of Dusk!' };
            }
          }
        }
      }
    }

    if (ability.special?.executeBelowHpPct && targetEntity) {
      const targetHpPct = (targetEntity.hp / targetEntity.maxHp) * 100;
      const hasOverrideAura =
        ability.special.usableWithAuraId &&
        player.auras.some((a) => a.auraId === ability.special?.usableWithAuraId);
      if (targetHpPct > ability.special.executeBelowHpPct && !hasOverrideAura) {
        return {
          ok: false,
          reason: `Requires target below ${ability.special.executeBelowHpPct}% HP or Zenith State.`,
        };
      }
    }

    if (ability.special?.requiresNoWeakenedSoul && targetEntity) {
      if (targetEntity.auras.some((a) => a.definition.flags?.isWeakenedSoul)) {
        return { ok: false, reason: 'Target has Weakened Soul!' };
      }
    }

    const zeroMana = player.auras.some((a) => a.definition.modifiers?.zeroManaCost);
    let primaryCost = zeroMana ? 0 : ability.primaryResourceCost;
    if (
      !zeroMana &&
      player.secondaryResourceType === 'ASTRAL_RESONANCE' &&
      player.secondaryResource > 0 &&
      primaryCost > 0
    ) {
      primaryCost = Math.round(primaryCost * (1 + 0.35 * player.secondaryResource));
    }

    if (player.primaryResource < primaryCost) {
      return { ok: false, reason: 'Insufficient primary resource.' };
    }

    const minSec = ability.special?.minSecondaryResource ?? ability.secondaryResourceCost;
    if (minSec > 0 && player.secondaryResource < minSec) {
      return { ok: false, reason: 'Insufficient secondary resource.' };
    }

    if (!ability.isOffGCD) {
      player.gcdStartedAtMs = now;
      player.gcdEndsAtMs = now + player.computedStats.gcdDurationMs;
    }

    const hasteFactor = 1 + player.computedStats.hastePct;
    const isNightfallInstant =
      ability.id === 'wlk_umbral_bolt' &&
      player.auras.some((a) => a.definition.flags?.isNightfall);

    const effectiveCastTimeMs = isNightfallInstant
      ? 0
      : Math.round(ability.castTimeMs / hasteFactor);

    const targetPos =
      groundPosition ??
      (targetEntity
        ? { x: targetEntity.x, y: targetEntity.y }
        : {
            x: player.x + Math.cos(player.facingRad) * 10,
            y: player.y + Math.sin(player.facingRad) * 10,
          });

    // Update 3D Skeletal Animation State
    player.animState =
      ability.channelDurationMs > 0
        ? 'Channel_Loop'
        : ability.rangeYards <= 8 && ability.damageCoeff > 0
        ? 'Attack_Melee_1'
        : 'Attack_Cast';
    player.animUpdatedAtMs = now;

    if (effectiveCastTimeMs > 0) {
      player.activeCast = {
        abilityId: ability.id,
        abilityName: ability.name,
        icon: ability.icon,
        targetId: targetEntity?.id,
        targetPosition: targetPos,
        startedAtMs: now,
        endsAtMs: now + effectiveCastTimeMs,
        isChannel: false,
      };
      this.emitEvent({
        instanceId: player.instanceId,
        timestampMs: now,
        type: 'SPELL_CAST_START',
        sourceId: player.id,
        sourceName: player.name,
        targetId: targetEntity?.id ?? player.id,
        targetName: targetEntity?.name ?? player.name,
        abilityId: ability.id,
        abilityName: ability.name,
        school: ability.school,
        message: `${player.name} begins casting ${ability.name}.`,
      });
      return { ok: true };
    }

    this.completeAbilityExecution(player, ability, targetEntity, targetPos, now);

    if (ability.channelDurationMs > 0) {
      const effectiveChannelMs = Math.round(ability.channelDurationMs / hasteFactor);
      const ticks = ability.channelTicks ?? 4;
      const tickInterval = Math.max(250, Math.round(effectiveChannelMs / ticks));
      player.activeCast = {
        abilityId: ability.id,
        abilityName: ability.name,
        icon: ability.icon,
        targetId: targetEntity?.id,
        targetPosition: targetPos,
        startedAtMs: now,
        endsAtMs: now + effectiveChannelMs,
        isChannel: true,
        channelTickIntervalMs: tickInterval,
        nextChannelTickAtMs: now + tickInterval,
      };
    }

    return { ok: true };
  }

  private completeAbilityExecution(
    player: PlayerEntity,
    ability: AbilityDefinition,
    targetEntity: EntityBase | undefined,
    targetPosition: { x: number; y: number },
    now: number
  ): void {
    player.inCombat = true;
    player.lastCombatAtMs = now;

    if (ability.id !== 'asn_duskveil_cloak') {
      this.removeAuraById(player, 'aura_duskveil_stealth', now);
    }
    if (ability.id === 'wlk_umbral_bolt') {
      this.removeAuraById(player, 'aura_nightfall_proc', now);
    }
    if (ability.id === 'mag_arcane_missiles') {
      this.removeAuraById(player, 'aura_clearcasting', now);
    }

    const zeroMana = player.auras.some((a) => a.definition.modifiers?.zeroManaCost);
    let primaryCost = zeroMana ? 0 : ability.primaryResourceCost;
    if (
      !zeroMana &&
      player.secondaryResourceType === 'ASTRAL_RESONANCE' &&
      player.secondaryResource > 0 &&
      primaryCost > 0
    ) {
      primaryCost = Math.round(primaryCost * (1 + 0.35 * player.secondaryResource));
    }

    player.primaryResource = Math.max(
      0,
      Math.min(
        player.maxPrimaryResource,
        player.primaryResource - primaryCost + ability.primaryResourceGain
      )
    );

    const consumedSecondaryStacks = ability.special?.consumesAllSecondary
      ? player.secondaryResource
      : ability.secondaryResourceCost;

    if (ability.special?.consumesAllSecondary) {
      player.secondaryResource = 0;
    } else {
      player.secondaryResource = Math.max(0, player.secondaryResource - ability.secondaryResourceCost);
    }

    if (ability.secondaryResourceGain > 0) {
      player.secondaryResource = Math.min(
        player.maxSecondaryResource,
        player.secondaryResource + ability.secondaryResourceGain
      );
    }

    if (
      player.secondaryResourceType === 'SOLAR_CHARGE' &&
      player.secondaryResource >= 100
    ) {
      player.secondaryResource = 0;
      this.applyAura(player, player, ZENITH_STATE_AURA, now);
    }

    if (
      player.secondaryResourceType === 'VERDANT_SEEDS' &&
      consumedSecondaryStacks > 0
    ) {
      for (const cardId of player.equippedRelicDeck) {
        const card = TCG_RELIC_BY_ID[cardId];
        if (card?.modifier.overgrowthHealPulseCoeff) {
          const pulseAmount = Math.round(
            player.computedStats.spellPower *
              card.modifier.overgrowthHealPulseCoeff *
              consumedSecondaryStacks
          );
          this.applyHeal(player, player, ability, pulseAmount, false, now);
        }
      }
    }

    if (
      player.secondaryResourceType === 'ASTRAL_RESONANCE' &&
      consumedSecondaryStacks > 0
    ) {
      for (const cardId of player.equippedRelicDeck) {
        const card = TCG_RELIC_BY_ID[cardId];
        if (card?.modifier.astralPurgeCdrMs) {
          for (const cd of Object.values(player.cooldowns)) {
            cd.readyAtMs = Math.max(now, cd.readyAtMs - card.modifier.astralPurgeCdrMs);
          }
        }
      }
    }

    let cooldownMs = ability.cooldownMs;
    for (const [nodeId, rank] of Object.entries(player.talents)) {
      const node = TALENT_NODE_BY_ID[nodeId];
      if (!node || rank <= 0) continue;
      if (node.modifierPerRank.cooldownReductionPct) {
        cooldownMs = Math.round(cooldownMs * (1 - node.modifierPerRank.cooldownReductionPct * rank));
      }
      if (
        node.modifierPerRank.abilityEmpowerment?.abilityId === ability.id &&
        node.modifierPerRank.abilityEmpowerment.reducedCooldownMs
      ) {
        cooldownMs = Math.max(
          1000,
          cooldownMs - node.modifierPerRank.abilityEmpowerment.reducedCooldownMs * rank
        );
      }
    }

    if (cooldownMs > 0) {
      const maxCharges = ability.maxCharges ?? 1;
      const existing = player.cooldowns[ability.id];
      if (maxCharges > 1) {
        const currentCharges = existing ? existing.chargesRemaining : maxCharges;
        player.cooldowns[ability.id] = {
          abilityId: ability.id,
          chargesRemaining: Math.max(0, currentCharges - 1),
          maxCharges,
          readyAtMs: now + cooldownMs,
          durationMs: cooldownMs,
        };
      } else {
        player.cooldowns[ability.id] = {
          abilityId: ability.id,
          chargesRemaining: 0,
          maxCharges: 1,
          readyAtMs: now + cooldownMs,
          durationMs: cooldownMs,
        };
      }
    }

    this.emitEvent({
      instanceId: player.instanceId,
      timestampMs: now,
      type: 'SPELL_CAST_SUCCESS',
      sourceId: player.id,
      sourceName: player.name,
      targetId: targetEntity?.id ?? player.id,
      targetName: targetEntity?.name ?? player.name,
      abilityId: ability.id,
      abilityName: ability.name,
      school: ability.school,
      message: `${player.name} casts ${ability.name}.`,
    });

    this.handleSpecialMovement(player, ability, targetEntity, targetPosition, now);

    if (ability.selfAura) {
      this.applyAura(player, player, ability.selfAura, now);
    }

    this.handleSpecialUtility(
      player,
      ability,
      targetEntity,
      consumedSecondaryStacks,
      now
    );

    if (ability.special?.spawnsGroundZone) {
      const gzCfg = ability.special.spawnsGroundZone;
      const zoneId = `zone_${this.zoneSeq++}`;
      const zone: GroundZone = {
        id: zoneId,
        instanceId: player.instanceId,
        ownerId: player.id,
        ownerFaction: player.factionId,
        abilityId: ability.id,
        name: gzCfg.name,
        school: ability.school,
        x: ability.targetType === 'GROUND_RETICLE' ? targetPosition.x : player.x,
        y: ability.targetType === 'GROUND_RETICLE' ? targetPosition.y : player.y,
        radiusYards: gzCfg.radiusYards,
        createdAtMs: now,
        expiresAtMs: now + gzCfg.durationMs,
        tickIntervalMs: gzCfg.tickIntervalMs,
        nextTickAtMs: now + gzCfg.tickIntervalMs,
        tickDamageCoeff: gzCfg.tickDamageCoeff ?? 0,
        tickHealCoeff: gzCfg.tickHealCoeff ?? 0,
        pullToCenter: gzCfg.pullToCenter,
        blocksRangedTargetingInside: gzCfg.blocksRangedTargetingInside,
        trapsEnemiesInside: gzCfg.trapsEnemiesInside,
        reducesEnemyHitChancePct: gzCfg.reducesEnemyHitChancePct,
        delayedDetonationMs: gzCfg.delayedDetonationMs,
        detonationDamageCoeff: gzCfg.detonationDamageCoeff,
      };
      this.world.groundZones.set(zone.id, zone);
    }

    const targets = this.collectAbilityTargets(player, ability, targetEntity, targetPosition);

    for (const t of targets) {
      const isFriendly = !this.isEntityHostileTo(player, t);

      if (!isFriendly && ability.special?.interruptsCast && t.activeCast) {
        const interruptedName = t.activeCast.abilityName;
        const lockedSchool: SpellSchool = 'ARCANE';
        t.activeCast = null;
        if (ability.special.interruptLockDurationMs) {
          t.schoolLockouts[lockedSchool] = now + ability.special.interruptLockDurationMs;
        }
        this.emitEvent({
          instanceId: player.instanceId,
          timestampMs: now,
          type: 'SPELL_INTERRUPTED',
          sourceId: player.id,
          sourceName: player.name,
          targetId: t.id,
          targetName: t.name,
          abilityId: ability.id,
          abilityName: ability.name,
          interruptedAbilityName: interruptedName,
          message: `${player.name} interrupted ${t.name}'s ${interruptedName} with ${ability.name}!`,
        });
      }

      if (!isFriendly && ability.special?.isTaunt && t.kind === 'NPC') {
        this.applyTaunt(player, t as NpcEntity, ability.special.tauntLockDurationMs ?? 3000, now);
      }

      if (ability.special?.pullTargetToCaster && t.id !== player.id) {
        t.x = player.x + Math.cos(player.facingRad) * 2.5;
        t.y = player.y + Math.sin(player.facingRad) * 2.5;
      }

      if (!isFriendly && ability.damageCoeff > 0) {
        let coeff = ability.damageCoeff + this.getTalentAbilityBonus(player, ability.id);
        const abilityRank = player.abilityRanks?.[ability.id] ?? 1;
        if (abilityRank > 1) {
          coeff *= 1 + (abilityRank - 1) * 0.15;
        }
        if (ability.special?.isFinisher && consumedSecondaryStacks > 0) {
          coeff *= consumedSecondaryStacks;
          for (const cardId of player.equippedRelicDeck) {
            const card = TCG_RELIC_BY_ID[cardId];
            if (card?.modifier.finisherBonusDamagePct) {
              coeff *= 1 + card.modifier.finisherBonusDamagePct;
            }
          }
        }
        if (
          ability.special?.lowHpBonusDamageThresholdPct &&
          (t.hp / t.maxHp) * 100 <= ability.special.lowHpBonusDamageThresholdPct
        ) {
          coeff *= ability.special.lowHpBonusDamageMultiplier ?? 2.0;
        }

        const power = Math.max(player.computedStats.spellPower, player.computedStats.attackPower);
        const isCrit = Math.random() * 100 < player.computedStats.critChancePct;
        const critMult = isCrit ? 1.5 : 1.0;
        const rawDamage = Math.round(
          power * coeff * player.computedStats.damageMultiplier * critMult
        );

        this.applyDamage(player, t, ability, rawDamage, isCrit, now);

        if (player.auras.some((a) => a.definition.flags?.isZenithState)) {
          this.applyAura(player, t, ZENITH_RADIANT_BURN_AURA, now);
        }

        if (ability.rangeYards <= 8) {
          for (const cardId of player.equippedRelicDeck) {
            const card = TCG_RELIC_BY_ID[cardId];
            if (card?.modifier.meleeBonusRadiantCoeff) {
              const bonusBurn = Math.round(power * card.modifier.meleeBonusRadiantCoeff);
              this.applyDamage(player, t, ability, bonusBurn, false, now);
            }
          }
        }
      }

      if (isFriendly && ability.healCoeff > 0) {
        let coeff = ability.healCoeff + this.getTalentAbilityBonus(player, ability.id);
        const abilityRank = player.abilityRanks?.[ability.id] ?? 1;
        if (abilityRank > 1) {
          coeff *= 1 + (abilityRank - 1) * 0.15;
        }
        const power = Math.max(player.computedStats.spellPower, player.computedStats.attackPower);
        const isCrit = Math.random() * 100 < player.computedStats.critChancePct;
        const critMult = isCrit ? 1.5 : 1.0;
        const rawHeal = Math.round(
          power * coeff * player.computedStats.healingMultiplier * critMult
        );

        this.applyHeal(player, t, ability, rawHeal, isCrit, now);

        if (ability.targetType === 'ALLY') {
          for (const cardId of player.equippedRelicDeck) {
            const card = TCG_RELIC_BY_ID[cardId];
            if (card?.modifier.chainHealTargets) {
              const allies = this.world
                .getEntitiesWithinRadius(t.x, t.y, 20, player.instanceId)
                .filter(
                  (e) =>
                    e.id !== t.id &&
                    !this.isEntityHostileTo(player, e)
                )
                .slice(0, card.modifier.chainHealTargets);
              for (const ally of allies) {
                this.applyHeal(player, ally, ability, Math.round(rawHeal * 0.45), false, now);
              }
            }
          }
        }
      }

      if (ability.targetAura) {
        const auraTargetMatches =
          (ability.targetAura.type === 'DEBUFF' && !isFriendly) ||
          (ability.targetAura.type === 'BUFF' && isFriendly);
        if (auraTargetMatches) {
          let customDuration = ability.targetAura.durationMs;
          if (ability.id === 'asn_crimson_rupture' && consumedSecondaryStacks > 0) {
            customDuration = consumedSecondaryStacks * 4000;
          }
          this.applyAura(player, t, ability.targetAura, now, customDuration);

          if (ability.special?.requiresNoWeakenedSoul) {
            this.applyAura(
              player,
              t,
              {
                id: 'aura_weakened_soul',
                name: 'Weakened Soul',
                icon: '💔',
                type: 'DEBUFF',
                school: 'RADIANT',
                dispelType: 'NONE',
                durationMs: 12000,
                maxStacks: 1,
                flags: { isWeakenedSoul: true },
              },
              now
            );
          }
        }
      }
    }

    if (
      ability.special?.procChance &&
      ability.special.procAura &&
      Math.random() < ability.special.procChance
    ) {
      this.applyAura(player, player, ability.special.procAura, now);
    }

    this.recalculatePlayerStats(player);
  }

  private getTalentAbilityBonus(player: PlayerEntity, abilityId: string): number {
    let bonus = 0;
    for (const [nodeId, rank] of Object.entries(player.talents)) {
      if (rank <= 0) continue;
      const node = TALENT_NODE_BY_ID[nodeId];
      if (node?.modifierPerRank.abilityEmpowerment?.abilityId === abilityId) {
        bonus +=
          (node.modifierPerRank.abilityEmpowerment.bonusDamageCoeff ??
            node.modifierPerRank.abilityEmpowerment.bonusHealCoeff ??
            0) * rank;
      }
    }
    return bonus;
  }

  private handleSpecialMovement(
    player: PlayerEntity,
    ability: AbilityDefinition,
    targetEntity: EntityBase | undefined,
    targetPosition: { x: number; y: number },
    now: number
  ): void {
    const moveType = ability.special?.movementType;
    if (!moveType) return;

    if (moveType === 'SHADOWSTEP_BEHIND' && targetEntity) {
      player.x = targetEntity.x - Math.cos(targetEntity.facingRad) * 2.0;
      player.y = targetEntity.y - Math.sin(targetEntity.facingRad) * 2.0;
    } else if (moveType === 'BLINK_FORWARD') {
      const dist = ability.special?.movementDistanceYards ?? 20;
      player.x += Math.cos(player.facingRad) * dist;
      player.y += Math.sin(player.facingRad) * dist;
      player.auras = player.auras.filter(
        (a) => !a.definition.flags?.isStun && !a.definition.flags?.isRoot
      );
    } else if (moveType === 'LEAP_TO_RETICLE') {
      player.x = targetPosition.x;
      player.y = targetPosition.y;
    } else if (moveType === 'WARP_LUNGE' && targetEntity) {
      player.x = targetEntity.x - Math.cos(player.facingRad) * 2.5;
      player.y = targetEntity.y - Math.sin(player.facingRad) * 2.5;
    } else if (moveType === 'TIME_WARP_REWIND') {
      if (player.rewindSnapshot && player.rewindSnapshot.expiresAtMs > now) {
        player.hp = player.rewindSnapshot.hp;
        player.primaryResource = player.rewindSnapshot.primaryResource;
        player.x = player.rewindSnapshot.x;
        player.y = player.rewindSnapshot.y;
        player.rewindSnapshot = null;
      } else {
        player.rewindSnapshot = {
          hp: player.hp,
          primaryResource: player.primaryResource,
          x: player.x,
          y: player.y,
          expiresAtMs: now + 6000,
        };
        delete player.cooldowns[ability.id];
      }
    } else if (moveType === 'PORTAL_PLACE_OR_USE') {
      if (
        player.portalPosition &&
        player.portalPosition.expiresAtMs > now &&
        Math.hypot(player.x - player.portalPosition.x, player.y - player.portalPosition.y) <= 35
      ) {
        player.x = player.portalPosition.x;
        player.y = player.portalPosition.y;
      } else {
        player.portalPosition = {
          x: player.x,
          y: player.y,
          expiresAtMs: now + 120000,
        };
      }
    }
  }

  private handleSpecialUtility(
    player: PlayerEntity,
    ability: AbilityDefinition,
    targetEntity: EntityBase | undefined,
    consumedSecondaryStacks: number,
    now: number
  ): void {
    const sp = ability.special;
    if (!sp) return;

    if (ability.id === 'syl_stags_stride') {
      player.auras = player.auras.filter((a) => !a.definition.flags?.isRoot);
    }

    if (sp.sacrificeHpPct) {
      const sac = Math.round(player.maxHp * sp.sacrificeHpPct);
      player.hp = Math.max(1, player.hp - sac);
    }
    if (sp.restorePrimaryResourcePct) {
      player.primaryResource = Math.min(
        player.maxPrimaryResource,
        player.primaryResource + Math.round(player.maxPrimaryResource * sp.restorePrimaryResourcePct)
      );
    }

    if (sp.restoreMissingHpPct) {
      const missing = Math.max(0, player.maxHp - player.hp);
      const bonusFromSeeds = 1 + consumedSecondaryStacks * 0.12;
      const healAmount = Math.round(missing * sp.restoreMissingHpPct * bonusFromSeeds);
      this.applyHeal(player, player, ability, healAmount, false, now);
    }

    if (sp.refundMaxManaPctPerStack && consumedSecondaryStacks > 0) {
      const refund = Math.round(
        player.maxPrimaryResource * sp.refundMaxManaPctPerStack * consumedSecondaryStacks
      );
      player.primaryResource = Math.min(player.maxPrimaryResource, player.primaryResource + refund);
    }

    if (sp.dispelCount && sp.dispelTypes && targetEntity) {
      let removed = 0;
      const remaining: ActiveAura[] = [];
      for (const aura of targetEntity.auras) {
        if (
          removed < sp.dispelCount &&
          aura.type === 'DEBUFF' &&
          sp.dispelTypes.includes(aura.dispelType)
        ) {
          removed++;
          if (aura.definition.flags?.unstableBacklashCoeff) {
            const backlash = Math.round(
              player.computedStats.spellPower * aura.definition.flags.unstableBacklashCoeff
            );
            this.applyDamage(player, player, ability, backlash, true, now);
          }
          this.emitEvent({
            instanceId: player.instanceId,
            timestampMs: now,
            type: 'AURA_REMOVED',
            sourceId: player.id,
            sourceName: player.name,
            targetId: targetEntity.id,
            targetName: targetEntity.name,
            auraName: aura.name,
            message: `${player.name} dispelled ${aura.name} from ${targetEntity.name}.`,
          });
        } else {
          remaining.push(aura);
        }
      }
      targetEntity.auras = remaining;
    }

    if (sp.stealEnemyMagicBuff && targetEntity) {
      const idx = targetEntity.auras.findIndex(
        (a) => a.type === 'BUFF' && a.dispelType === 'MAGIC'
      );
      if (idx >= 0) {
        const [stolen] = targetEntity.auras.splice(idx, 1);
        this.applyAura(player, player, stolen.definition, now);
      }
    }

    if (sp.spreadsCasterDebuffsRadiusYards && targetEntity) {
      const casterDebuffs = targetEntity.auras.filter(
        (a) => a.casterId === player.id && a.type === 'DEBUFF'
      );
      const nearby = this.world.getEntitiesWithinRadius(
        targetEntity.x,
        targetEntity.y,
        sp.spreadsCasterDebuffsRadiusYards,
        player.instanceId
      );
      for (const other of nearby) {
        if (other.id !== targetEntity.id && !other.isDead && this.isEntityHostileTo(player, other)) {
          for (const d of casterDebuffs) {
            this.applyAura(player, other, d.definition, now);
          }
        }
      }
    }
  }

  private collectAbilityTargets(
    player: PlayerEntity,
    ability: AbilityDefinition,
    primaryTarget: EntityBase | undefined,
    targetPosition: { x: number; y: number }
  ): EntityBase[] {
    if (ability.targetType === 'SELF') {
      return [player];
    }
    if (ability.targetType === 'ENEMY' || ability.targetType === 'ALLY') {
      return primaryTarget ? [primaryTarget] : [];
    }
    if (ability.targetType === 'PBAOE') {
      const radius = ability.radiusYards ?? 10;
      return this.world.getEntitiesWithinRadius(player.x, player.y, radius, player.instanceId);
    }
    if (ability.targetType === 'GROUND_RETICLE') {
      const radius = ability.radiusYards ?? 10;
      return this.world.getEntitiesWithinRadius(
        targetPosition.x,
        targetPosition.y,
        radius,
        player.instanceId
      );
    }
    if (ability.targetType === 'CONE') {
      const range = ability.rangeYards ?? 12;
      const candidates = this.world.getEntitiesWithinRadius(
        player.x,
        player.y,
        range,
        player.instanceId
      );
      return candidates.filter((e) => {
        if (e.id === player.id) return false;
        const angleToTarget = Math.atan2(e.y - player.y, e.x - player.x);
        let diff = Math.abs(angleToTarget - player.facingRad);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        return diff <= Math.PI / 2.2;
      });
    }
    return primaryTarget ? [primaryTarget] : [];
  }

  public applyDamage(
    source: EntityBase,
    target: EntityBase,
    ability: AbilityDefinition | null,
    rawAmount: number,
    isCrit: boolean,
    now: number
  ): void {
    if (target.isDead) return;

    if (target.auras.some((a) => a.definition.flags?.isInvulnerable)) {
      this.emitEvent({
        instanceId: source.instanceId,
        timestampMs: now,
        type: ability ? 'SPELL_DAMAGE' : 'SWING_DAMAGE',
        sourceId: source.id,
        sourceName: source.name,
        targetId: target.id,
        targetName: target.name,
        abilityName: ability?.name ?? 'Auto Attack',
        amount: 0,
        absorbedAmount: rawAmount,
        message: `${target.name} is invulnerable to ${source.name}'s ${ability?.name ?? 'Attack'}!`,
      });
      return;
    }

    if (
      ability &&
      ability.school !== 'PHYSICAL' &&
      target.auras.some((a) => a.definition.flags?.isSpellImmune)
    ) {
      return;
    }

    if (
      ability &&
      ability.school !== 'PHYSICAL' &&
      target.auras.some((a) => a.definition.flags?.isSpellReflect)
    ) {
      this.removeAuraById(target, 'aura_spell_reflect_ward', now);
      this.applyDamage(target, source, ability, rawAmount, isCrit, now);
      return;
    }

    let finalDamage = rawAmount;
    if (target.kind === 'PLAYER') {
      finalDamage = Math.round(
        finalDamage * (target as PlayerEntity).computedStats.damageTakenMultiplier
      );
    } else {
      const brittle = target.auras.find((a) => a.auraId === 'aura_brittle_armor');
      if (brittle) {
        finalDamage = Math.round(finalDamage * (1 + 0.05 * brittle.stacks));
      }
    }

    let absorbed = 0;
    for (const aura of target.auras) {
      if (aura.absorbRemaining > 0 && finalDamage > 0) {
        const take = Math.min(aura.absorbRemaining, finalDamage);
        aura.absorbRemaining -= take;
        finalDamage -= take;
        absorbed += take;
      }
    }

    target.hp = Math.max(0, target.hp - finalDamage);

    if (source.kind === 'PLAYER' && target.kind === 'NPC' && finalDamage > 0) {
      this.awardExperience(source as PlayerEntity, 15, now);
    }

    if (target.kind === 'NPC' && (target as NpcEntity).npcType === 'TRAINING_DUMMY') {
      if (target.hp < target.maxHp * 0.08) {
        target.hp = target.maxHp;
      }
    } else if (target.hp <= 0) {
      target.isDead = true;
      target.hp = 0;
      target.targetId = null;
      target.activeCast = null;
      target.auras = [];
      target.animState = 'Death';
      target.animUpdatedAtMs = now;
      if (target.kind === 'NPC') {
        const npc = target as NpcEntity;
        npc.threatList = [];
        this.world.threatTables.set(npc.id, { npcId: npc.id, entries: {} });
        this.world.updateInstanceProgress(target.instanceId);
        const xpAmount = npc.xpReward ?? (npc.npcType === 'ELITE_BOSS' ? 1200 : 250);
        if (source.kind === 'PLAYER') {
          this.awardExperience(source as PlayerEntity, xpAmount, now);
        }
      } else if (target.kind === 'PLAYER') {
        const player = target as PlayerEntity;
        player.inCombat = false;
        // Immediately drop all threat and targets towards this dead player across all NPCs
        for (const npc of this.world.npcs.values()) {
          const table = this.world.threatTables.get(npc.id);
          if (table && table.entries[player.id] !== undefined) {
            delete table.entries[player.id];
            if (table.tauntLockedTargetId === player.id) {
              delete table.tauntLockedTargetId;
              delete table.tauntLockExpiresAtMs;
            }
            this.syncNpcThreatList(npc, table, now);
          }
          if (npc.targetId === player.id) {
            npc.targetId = null;
            npc.activeCast = null;
            npc.threatList = [];
            this.world.threatTables.set(npc.id, { npcId: npc.id, entries: {} });
          }
        }
      }
    } else if (now - target.animUpdatedAtMs > 500 && !target.activeCast) {
      target.animState = 'Hit_React';
      target.animUpdatedAtMs = now;
    }

    if (target.auras.some((a) => a.definition.flags?.lifestealToAttackerPct)) {
      const healBack = Math.round(source.maxHp * 0.015);
      source.hp = Math.min(source.maxHp, source.hp + healBack);
    }

    const thornbark = target.auras.find((a) => a.definition.modifiers?.ReflectNatureCoeff);
    if (thornbark && source.id !== target.id) {
      const reflectDmg = Math.round(finalDamage * 0.25);
      source.hp = Math.max(1, source.hp - reflectDmg);
    }

    if (isCrit && source.kind === 'PLAYER') {
      const p = source as PlayerEntity;
      for (const cardId of p.equippedRelicDeck) {
        const card = TCG_RELIC_BY_ID[cardId];
        if (card?.modifier.resourceRefundOnCrit) {
          p.primaryResource = Math.min(
            p.maxPrimaryResource,
            p.primaryResource + card.modifier.resourceRefundOnCrit
          );
        }
      }
    }

    if (target.kind === 'NPC' && source.kind === 'PLAYER' && !target.isDead) {
      const p = source as PlayerEntity;
      const stanceMult = p.tankStance ? 3.5 : 1.0;
      const abilityMult = ability?.threatMultiplier ?? 1.0;
      const threatAdded = Math.round((finalDamage + absorbed) * stanceMult * abilityMult);
      this.addThreat(target as NpcEntity, p, threatAdded, now);
    }

    const eventType: CombatEventType = ability ? 'SPELL_DAMAGE' : 'SWING_DAMAGE';
    this.emitEvent({
      instanceId: source.instanceId,
      timestampMs: now,
      type: eventType,
      sourceId: source.id,
      sourceName: source.name,
      targetId: target.id,
      targetName: target.name,
      abilityId: ability?.id,
      abilityName: ability?.name ?? 'Melee Swing',
      school: ability?.school ?? 'PHYSICAL',
      amount: finalDamage,
      absorbedAmount: absorbed > 0 ? absorbed : undefined,
      isCrit,
      message: `${source.name}'s ${ability?.name ?? 'Melee Swing'} hits ${target.name} for ${finalDamage}${isCrit ? ' (CRIT!)' : ''}${absorbed > 0 ? ` (${absorbed} absorbed)` : ''}.`,
    });
  }

  public applyHeal(
    source: EntityBase,
    target: EntityBase,
    ability: AbilityDefinition | null,
    rawAmount: number,
    isCrit: boolean,
    now: number
  ): void {
    if (target.isDead) return;
    let finalHeal = rawAmount;

    for (const aura of target.auras) {
      if (aura.definition.modifiers?.healingReceivedPct) {
        finalHeal = Math.round(
          finalHeal * (1 + aura.definition.modifiers.healingReceivedPct * aura.stacks)
        );
      }
    }

    target.hp = Math.min(target.maxHp, target.hp + finalHeal);

    this.emitEvent({
      instanceId: source.instanceId,
      timestampMs: now,
      type: 'SPELL_HEAL',
      sourceId: source.id,
      sourceName: source.name,
      targetId: target.id,
      targetName: target.name,
      abilityId: ability?.id,
      abilityName: ability?.name ?? 'Periodic Heal',
      school: ability?.school ?? 'NATURE',
      amount: finalHeal,
      isCrit,
      message: `${source.name}'s ${ability?.name ?? 'Heal'} restores ${finalHeal} HP to ${target.name}${isCrit ? ' (CRIT!)' : ''}.`,
    });
  }

  public applyAura(
    caster: EntityBase,
    target: EntityBase,
    definition: AuraDefinition,
    now: number,
    overrideDurationMs?: number
  ): void {
    const duration = overrideDurationMs ?? definition.durationMs;
    const existing = target.auras.find((a) => a.auraId === definition.id);

    const power =
      caster.kind === 'PLAYER'
        ? Math.max(
            (caster as PlayerEntity).computedStats.spellPower,
            (caster as PlayerEntity).computedStats.attackPower
          )
        : 200;

    const initialAbsorb = definition.absorbCoeff ? Math.round(power * definition.absorbCoeff) : 0;

    if (existing) {
      const prevStacks = existing.stacks;
      existing.stacks = Math.min(definition.maxStacks, existing.stacks + 1);
      existing.expiresAtMs = now + duration;
      existing.durationMs = duration;
      if (initialAbsorb > 0) {
        existing.absorbRemaining = initialAbsorb;
      }
      this.emitEvent({
        instanceId: caster.instanceId,
        timestampMs: now,
        type: prevStacks !== existing.stacks ? 'AURA_STACK_CHANGE' : 'AURA_APPLIED',
        sourceId: caster.id,
        sourceName: caster.name,
        targetId: target.id,
        targetName: target.name,
        auraName: definition.name,
        stacks: existing.stacks,
        school: definition.school,
        message: `${definition.name} on ${target.name} refreshed (${existing.stacks} stack${existing.stacks > 1 ? 's' : ''}).`,
      });
    } else {
      const active: ActiveAura = {
        instanceId: `aura_inst_${this.auraSeq++}`,
        auraId: definition.id,
        name: definition.name,
        icon: definition.icon,
        type: definition.type,
        school: definition.school,
        dispelType: definition.dispelType,
        casterId: caster.id,
        targetId: target.id,
        appliedAtMs: now,
        expiresAtMs: now + duration,
        durationMs: duration,
        tickIntervalMs: definition.tickIntervalMs,
        nextTickAtMs: definition.tickIntervalMs ? now + definition.tickIntervalMs : undefined,
        stacks: 1,
        maxStacks: definition.maxStacks,
        absorbRemaining: initialAbsorb,
        anchorX: definition.flags?.dimensionalAnchorOrigin ? target.x : undefined,
        anchorY: definition.flags?.dimensionalAnchorOrigin ? target.y : undefined,
        definition,
      };
      target.auras.push(active);
      this.emitEvent({
        instanceId: caster.instanceId,
        timestampMs: now,
        type: 'AURA_APPLIED',
        sourceId: caster.id,
        sourceName: caster.name,
        targetId: target.id,
        targetName: target.name,
        auraName: definition.name,
        stacks: 1,
        school: definition.school,
        message: `${caster.name} applies ${definition.name} to ${target.name}.`,
      });
    }

    if (target.kind === 'PLAYER') {
      this.recalculatePlayerStats(target as PlayerEntity);
    }
  }

  public removeAuraById(target: EntityBase, auraId: string, now: number): void {
    const idx = target.auras.findIndex((a) => a.auraId === auraId);
    if (idx >= 0) {
      const [removed] = target.auras.splice(idx, 1);
      this.emitEvent({
        instanceId: target.instanceId,
        timestampMs: now,
        type: 'AURA_REMOVED',
        sourceId: removed.casterId,
        sourceName: target.name,
        targetId: target.id,
        targetName: target.name,
        auraName: removed.name,
        message: `${removed.name} fades from ${target.name}.`,
      });
      if (target.kind === 'PLAYER') {
        this.recalculatePlayerStats(target as PlayerEntity);
      }
    }
  }

  public addThreat(npc: NpcEntity, player: PlayerEntity, amount: number, now: number): void {
    if (npc.isDead || player.isDead) return;
    let table = this.world.threatTables.get(npc.id);
    if (!table) {
      table = { npcId: npc.id, entries: {} };
      this.world.threatTables.set(npc.id, table);
    }
    table.entries[player.id] = (table.entries[player.id] ?? 0) + amount;
    this.syncNpcThreatList(npc, table, now);
  }

  public applyTaunt(
    player: PlayerEntity,
    npc: NpcEntity,
    lockDurationMs: number,
    now: number
  ): void {
    if (npc.isDead || player.isDead) return;
    let table = this.world.threatTables.get(npc.id);
    if (!table) {
      table = { npcId: npc.id, entries: {} };
      this.world.threatTables.set(npc.id, table);
    }
    const maxThreat = Math.max(100, ...Object.values(table.entries));
    table.entries[player.id] = Math.round(maxThreat * 1.1);
    table.tauntLockedTargetId = player.id;
    table.tauntLockExpiresAtMs = now + lockDurationMs;
    this.syncNpcThreatList(npc, table, now);
  }

  private syncNpcThreatList(
    npc: NpcEntity,
    table: {
      entries: Record<string, number>;
      tauntLockedTargetId?: string;
      tauntLockExpiresAtMs?: number;
    },
    now: number
  ): void {
    if (npc.isDead) {
      npc.targetId = null;
      npc.threatList = [];
      return;
    }
    const validEntries: Array<{ id: string; name: string; val: number }> = [];
    for (const [pid, val] of Object.entries(table.entries)) {
      const p = this.world.players.get(pid);
      if (p && !p.isDead && p.instanceId === npc.instanceId) {
        validEntries.push({ id: pid, name: p.name, val });
      }
    }
    validEntries.sort((a, b) => b.val - a.val);

    let topTargetId: string | null = validEntries[0]?.id ?? null;
    if (
      table.tauntLockedTargetId &&
      table.tauntLockExpiresAtMs &&
      table.tauntLockExpiresAtMs > now
    ) {
      const lockedPlayer = this.world.players.get(table.tauntLockedTargetId);
      if (lockedPlayer && !lockedPlayer.isDead && lockedPlayer.instanceId === npc.instanceId) {
        topTargetId = lockedPlayer.id;
      }
    }

    npc.targetId = topTargetId;
    const highestVal = validEntries[0]?.val || 1;
    npc.threatList = validEntries.map((item) => ({
      entityId: item.id,
      entityName: item.name,
      threatValue: item.val,
      threatPct: Math.min(100, Math.round((item.val / highestVal) * 100)),
      isTanking: item.id === topTargetId,
    }));
  }

  public tick(now: number, dtMs: number): void {
    this.world.rebuildSpatialIndex();

    // Respawn harvested open-world TCG Relic Nodes
    for (const node of this.world.relicNodes.values()) {
      if (!node.isAvailable && now >= node.respawnAtMs) {
        node.isAvailable = true;
      }
    }

    // 1. Tick Players & AI Companions
    for (const player of this.world.players.values()) {
      if (player.isDead) {
        // Auto-revive players after 5 seconds at sanctuary/instance spawn
        if (now - player.animUpdatedAtMs > 5000) {
          player.isDead = false;
          player.hp = player.maxHp;
          player.primaryResource = player.maxPrimaryResource;
          player.targetId = null;
          player.activeCast = null;
          player.auras = [];
          player.inCombat = false;
          player.animState = 'Idle';
          player.animUpdatedAtMs = now;
          if (player.instanceId === 'open_world_nexus') {
            const cls = CLASSES_REGISTRY[player.classId];
            const faction = FACTIONS_REGISTRY[cls?.factionId ?? 'SOLARI'];
            player.x = faction.sanctuaryOffset.x + (Math.random() * 4 - 2);
            player.y = faction.sanctuaryOffset.y + (Math.random() * 4 - 2);
            player.z = 0;
          }
          this.applyAura(
            player,
            player,
            {
              id: 'aura_resurrection_grace',
              name: 'Sanctuary Grace',
              icon: '🕊️',
              type: 'BUFF',
              school: 'RADIANT',
              dispelType: 'NONE',
              durationMs: 8000,
              maxStacks: 1,
              flags: { isInvulnerable: true },
            },
            now
          );
          // Clear all threats and targets across all NPCs for this revived player
          for (const npc of this.world.npcs.values()) {
            const table = this.world.threatTables.get(npc.id);
            if (table && table.entries[player.id] !== undefined) {
              delete table.entries[player.id];
              if (table.tauntLockedTargetId === player.id) {
                delete table.tauntLockedTargetId;
                delete table.tauntLockExpiresAtMs;
              }
              this.syncNpcThreatList(npc, table, now);
            }
            if (npc.targetId === player.id) {
              npc.targetId = null;
              npc.activeCast = null;
              npc.threatList = [];
              this.world.threatTables.set(npc.id, { npcId: npc.id, entries: {} });
            }
          }
        }
        continue;
      }

      // Gravity return from Jump
      if (player.z > 0 && !player.isMounted && now >= player.jumpEndsAtMs) {
        player.z = 0;
        if (player.animState === 'Jump') {
          player.animState = 'Idle';
        }
      }

      // Reset one-shot combat animations back to Idle after 550ms
      if (
        !player.activeCast &&
        (player.animState === 'Attack_Melee_1' ||
          player.animState === 'Attack_Cast' ||
          player.animState === 'Hit_React' ||
          player.animState === 'Sprint') &&
        now - player.animUpdatedAtMs > 550
      ) {
        player.animState = 'Idle';
      }

      // Watchdog: If a player has stopped moving for 350ms and is not mounted/casting, ensure Idle
      if (
        !player.isAiCompanion &&
        !player.isMounted &&
        !player.activeCast &&
        (player.animState === 'Run' || player.animState === 'Sprint') &&
        player.lastMoveAtMs &&
        now - player.lastMoveAtMs > 350
      ) {
        player.animState = 'Idle';
      }

      // AI Companion Autonomous Behavior inside Dungeons & Battlegrounds
      if (player.isAiCompanion) {
        this.tickAiCompanion(player, now);
      }

      // Recharge multi-charge abilities
      for (const cd of Object.values(player.cooldowns)) {
        if (cd.maxCharges > 1 && cd.chargesRemaining < cd.maxCharges && now >= cd.readyAtMs) {
          cd.chargesRemaining++;
          if (cd.chargesRemaining < cd.maxCharges) {
            cd.readyAtMs = now + cd.durationMs;
          }
        }
      }

      // Active Cast / Channel completion
      if (player.activeCast) {
        const ability = ALL_ABILITIES[player.activeCast.abilityId];
        if (player.activeCast.isChannel && ability) {
          player.animState = 'Channel_Loop';
          if (
            player.activeCast.nextChannelTickAtMs &&
            now >= player.activeCast.nextChannelTickAtMs
          ) {
            player.activeCast.nextChannelTickAtMs +=
              player.activeCast.channelTickIntervalMs ?? 1000;
            const target = player.activeCast.targetId
              ? this.world.npcs.get(player.activeCast.targetId) ??
                this.world.players.get(player.activeCast.targetId)
              : player;
            const pos = player.activeCast.targetPosition ?? { x: player.x, y: player.y };
            const targets = this.collectAbilityTargets(player, ability, target, pos);
            const power = Math.max(
              player.computedStats.spellPower,
              player.computedStats.attackPower
            );
            for (const t of targets) {
              const isFriendly = !this.isEntityHostileTo(player, t);
              if (!isFriendly && ability.damageCoeff > 0) {
                this.applyDamage(
                  player,
                  t,
                  ability,
                  Math.round(power * ability.damageCoeff * 0.45),
                  false,
                  now
                );
              }
              if (isFriendly && ability.healCoeff > 0) {
                this.applyHeal(
                  player,
                  t,
                  ability,
                  Math.round(power * ability.healCoeff * 0.5),
                  false,
                  now
                );
              }
            }
          }
          if (now >= player.activeCast.endsAtMs) {
            player.activeCast = null;
            player.animState = 'Idle';
          }
        } else if (now >= player.activeCast.endsAtMs) {
          const castState = player.activeCast;
          player.activeCast = null;
          if (ability) {
            const target = castState.targetId
              ? this.world.npcs.get(castState.targetId) ??
                this.world.players.get(castState.targetId)
              : undefined;
            this.completeAbilityExecution(
              player,
              ability,
              target,
              castState.targetPosition ?? { x: player.x, y: player.y },
              now
            );
          }
        }
      }

      if (
        player.queuedSpell &&
        now >= player.gcdEndsAtMs &&
        !player.activeCast
      ) {
        const q = player.queuedSpell;
        player.queuedSpell = null;
        const ability = ALL_ABILITIES[q.abilityId];
        if (ability) {
          this.executeAbilityNow(player, ability, q.targetId, q.targetPosition, now);
        }
      }

      const dtSec = dtMs / 1000;
      if (player.primaryResourceType === 'SHADOW_ENERGY') {
        let energyMult = 1.0;
        for (const a of player.auras) {
          if (a.definition.modifiers?.energyRegenMultiplier) {
            energyMult *= a.definition.modifiers.energyRegenMultiplier;
          }
        }
        player.primaryResource = Math.min(
          player.maxPrimaryResource,
          +(player.primaryResource + 10 * energyMult * dtSec).toFixed(1)
        );
      } else if (
        player.primaryResourceType === 'DIVINE' ||
        player.primaryResourceType === 'ARCANE_MANA'
      ) {
        const regenPerSec = 14 + player.attributes.spirit * 0.25;
        player.primaryResource = Math.min(
          player.maxPrimaryResource,
          Math.round(player.primaryResource + regenPerSec * dtSec)
        );
      }

      if (now - player.lastCombatAtMs > 6000) {
        player.inCombat = false;
      }

      this.tickEntityAuras(player, now);
    }

    // 2. Tick Ground Zones
    for (const [zoneId, zone] of this.world.groundZones.entries()) {
      if (now >= zone.expiresAtMs) {
        this.world.groundZones.delete(zoneId);
        continue;
      }

      const owner = this.world.players.get(zone.ownerId);
      const power = owner
        ? Math.max(owner.computedStats.spellPower, owner.computedStats.attackPower)
        : 220;

      if (
        zone.delayedDetonationMs &&
        !zone.detonated &&
        now >= zone.createdAtMs + zone.delayedDetonationMs
      ) {
        zone.detonated = true;
        const entities = this.world.getEntitiesWithinRadius(
          zone.x,
          zone.y,
          zone.radiusYards,
          zone.instanceId
        );
        for (const e of entities) {
          if (owner && !e.isDead && this.isEntityHostileTo(owner, e)) {
            this.applyDamage(
              owner,
              e,
              ALL_ABILITIES[zone.abilityId] ?? null,
              Math.round(power * (zone.detonationDamageCoeff ?? 1.2)),
              false,
              now
            );
          }
        }
      }

      if (now >= zone.nextTickAtMs) {
        zone.nextTickAtMs += zone.tickIntervalMs;
        const entities = this.world.getEntitiesWithinRadius(
          zone.x,
          zone.y,
          zone.radiusYards,
          zone.instanceId
        );
        for (const e of entities) {
          const isFriendly = owner ? !this.isEntityHostileTo(owner, e) : (e.kind === 'PLAYER');
          if (!isFriendly && zone.tickDamageCoeff > 0 && owner) {
            this.applyDamage(
              owner,
              e,
              ALL_ABILITIES[zone.abilityId] ?? null,
              Math.round(power * zone.tickDamageCoeff),
              false,
              now
            );
            if (zone.pullToCenter) {
              e.x += (zone.x - e.x) * 0.35;
              e.y += (zone.y - e.y) * 0.35;
            }
          }
          if (isFriendly && zone.tickHealCoeff > 0 && owner) {
            this.applyHeal(
              owner,
              e,
              ALL_ABILITIES[zone.abilityId] ?? null,
              Math.round(power * zone.tickHealCoeff),
              false,
              now
            );
          }
        }
      }
    }

    // 3. Tick NPCs
    for (const npc of this.world.npcs.values()) {
      if (npc.isDead) {
        // Only auto-respawn Open World mobs after 12s; Dungeon bosses stay defeated for instance victory!
        if (npc.instanceId === 'open_world_nexus' && now - npc.animUpdatedAtMs > 12000) {
          npc.isDead = false;
          npc.hp = npc.maxHp;
          npc.x = npc.spawnX;
          npc.y = npc.spawnY;
          npc.targetId = null;
          npc.activeCast = null;
          npc.auras = [];
          npc.threatList = [];
          npc.animState = 'Idle';
          npc.animUpdatedAtMs = now;
          npc.respawnGraceUntilMs = now + 12000;
          npc.nextSwingAtMs = now + 1500;
          npc.nextCastAtMs = now + (npc.castCooldownMs ?? 5000);
          this.world.threatTables.delete(npc.id);
          this.world.threatTables.set(npc.id, { npcId: npc.id, entries: {} });
        }
        continue;
      }

      if (npc.npcType === 'ALLY_SPIRIT' && npc.hp > npc.maxHp * 0.75) {
        npc.hp = Math.round(npc.maxHp * 0.45);
      }

      this.tickEntityAuras(npc, now);

      const isStunnedOrCC = npc.auras.some(
        (a) =>
          a.definition.flags?.isStun ||
          a.definition.flags?.isDisorient ||
          a.definition.flags?.isFear
      );
      if (isStunnedOrCC) continue;

      if (npc.activeCast && now >= npc.activeCast.endsAtMs) {
        const castName = npc.activeCast.abilityName;
        npc.activeCast = null;
        npc.animState = 'Attack_Cast';
        npc.animUpdatedAtMs = now;
        if (npc.targetId) {
          const targetPlayer = this.world.players.get(npc.targetId);
          if (targetPlayer && !targetPlayer.isDead && targetPlayer.instanceId === npc.instanceId) {
            this.applyDamage(npc, targetPlayer, null, Math.round(npc.baseDamage * 1.5), false, now);
            this.emitEvent({
              instanceId: npc.instanceId,
              timestampMs: now,
              type: 'SPELL_CAST_SUCCESS',
              sourceId: npc.id,
              sourceName: npc.name,
              targetId: targetPlayer.id,
              targetName: targetPlayer.name,
              abilityName: castName,
              message: `${npc.name} finishes casting ${castName} on ${targetPlayer.name}!`,
            });
          }
        }
      }

      // Proximity aggro for hostile mobs and hostile guards
      if (!npc.targetId && npc.isHostile && npc.aggroRadiusYards > 0 && npc.npcType !== 'TRAINING_DUMMY') {
        const isGraceActive = npc.respawnGraceUntilMs && now < npc.respawnGraceUntilMs;
        const isNpcInSanctuary = this.world.isInsideSanctuary(npc.x, npc.y, npc.instanceId);
        if (!isGraceActive && !isNpcInSanctuary) {
          const candidates = this.world.getEntitiesWithinRadius(npc.x, npc.y, npc.aggroRadiusYards, npc.instanceId);
          for (const ent of candidates) {
            if (ent.kind === 'PLAYER' && !ent.isDead) {
              const p = ent as PlayerEntity;
              if (p.z > 10) continue; // Flying high above aggro range
              const isTargetInSanctuary = this.world.isInsideSanctuary(p.x, p.y, p.instanceId);
              if (!isTargetInSanctuary && this.isEntityHostileTo(npc, p)) {
                this.addThreat(npc, p, 10, now);
                break;
              }
            }
          }
        }
      }

      // If mob has NO target, smoothly return to its spawn point and sit Idle!
      if (!npc.targetId && npc.npcType !== 'TRAINING_DUMMY') {
        const distFromSpawn = Math.hypot(npc.x - npc.spawnX, npc.y - npc.spawnY);
        if (distFromSpawn > 1.2) {
          const angle = Math.atan2(npc.spawnY - npc.y, npc.spawnX - npc.x);
          npc.facingRad = angle;
          npc.x += Math.cos(angle) * 0.45;
          npc.y += Math.sin(angle) * 0.45;
          const resolved = collisionWorld.resolvePlayerPosition(npc.x, npc.y, npc.z || 0, 1.2, npc.instanceId);
          npc.x = resolved.x;
          npc.y = resolved.z;
          npc.animState = 'Run';
          npc.animUpdatedAtMs = now;
          npc.hp = Math.min(npc.maxHp, npc.hp + Math.round(npc.maxHp * 0.05));
        } else {
          npc.x = npc.spawnX;
          npc.y = npc.spawnY;
          if (npc.animState === 'Run' || npc.animState === 'Sprint') {
            npc.animState = 'Idle';
            npc.animUpdatedAtMs = now;
          }
        }
      }

      if (npc.targetId) {
        const targetPlayer = this.world.players.get(npc.targetId);
        const distFromSpawn = Math.hypot(npc.x - npc.spawnX, npc.y - npc.spawnY);
        const distTargetFromSpawn = targetPlayer ? Math.hypot(targetPlayer.x - npc.spawnX, targetPlayer.y - npc.spawnY) : 999;
        const isTargetInSanctuary = targetPlayer ? this.world.isInsideSanctuary(targetPlayer.x, targetPlayer.y, npc.instanceId) : false;

        if (
          !targetPlayer ||
          targetPlayer.isDead ||
          targetPlayer.instanceId !== npc.instanceId ||
          isTargetInSanctuary ||
          (targetPlayer && targetPlayer.z > 14) ||
          distFromSpawn > npc.leashRadiusYards ||
          distTargetFromSpawn > (npc.leashRadiusYards + 15) ||
          !this.isEntityHostileTo(npc, targetPlayer)
        ) {
          npc.targetId = null;
          npc.activeCast = null;
          npc.threatList = [];
          this.world.threatTables.set(npc.id, { npcId: npc.id, entries: {} });
          continue;
        }

        if (npc.npcType !== 'TRAINING_DUMMY') {
          const isRooted = npc.auras.some((a) => a.definition.flags?.isRoot);
          const dist = Math.hypot(targetPlayer.x - npc.x, targetPlayer.y - npc.y);
          if (!isRooted && dist > 3.5) {
            const angle = Math.atan2(targetPlayer.y - npc.y, targetPlayer.x - npc.x);
            npc.facingRad = angle;
            npc.x += Math.cos(angle) * 0.24;
            npc.y += Math.sin(angle) * 0.24;
            const resolved = collisionWorld.resolvePlayerPosition(npc.x, npc.y, npc.z || 0, 1.2, npc.instanceId);
            npc.x = resolved.x;
            npc.y = resolved.z;
            npc.animState = 'Run';
          } else if (now - npc.animUpdatedAtMs > 550) {
            npc.animState = 'Idle';
          }
        }

        if (
          npc.npcType !== 'TRAINING_DUMMY' &&
          npc.castAbilityName &&
          npc.castCooldownMs &&
          npc.nextCastAtMs &&
          now >= npc.nextCastAtMs &&
          !npc.activeCast
        ) {
          npc.nextCastAtMs = now + npc.castCooldownMs;
          npc.activeCast = {
            abilityId: 'npc_spell_cast',
            abilityName: npc.castAbilityName,
            icon: '⚡',
            targetId: targetPlayer.id,
            startedAtMs: now,
            endsAtMs: now + 2600,
            isChannel: false,
          };
          npc.animState = 'Channel_Loop';
          this.emitEvent({
            instanceId: npc.instanceId,
            timestampMs: now,
            type: 'SPELL_CAST_START',
            sourceId: npc.id,
            sourceName: npc.name,
            targetId: targetPlayer.id,
            targetName: targetPlayer.name,
            abilityName: npc.castAbilityName,
            message: `${npc.name} begins casting ${npc.castAbilityName}! (Interruptible)`,
          });
        }

        const distToTarget = Math.hypot(targetPlayer.x - npc.x, targetPlayer.y - npc.y);
        if (
          npc.npcType !== 'TRAINING_DUMMY' &&
          npc.baseDamage > 0 &&
          npc.swingTimerMs > 0 &&
          now >= npc.nextSwingAtMs &&
          distToTarget <= 8.5
        ) {
          npc.nextSwingAtMs = now + npc.swingTimerMs;
          npc.animState = 'Attack_Melee_1';
          npc.animUpdatedAtMs = now;
          this.applyDamage(npc, targetPlayer, null, npc.baseDamage, false, now);
        }
      }
    }

    // 4. Resolve anti-stacking / entity separation across all active entities
    this.resolveEntityCollisions();
  }

  private resolveEntityCollisions(): void {
    // Group active living entities by instance
    const instances = new Map<string, (PlayerEntity | NpcEntity)[]>();
    for (const p of this.world.players.values()) {
      if (p.isDead) continue;
      // Human players have client-authoritative movement prediction.
      // Only AI companion bots participate in server flocking/anti-stacking.
      if (!p.isAiCompanion) continue;
      if (p.z > 3.0) continue;
      let list = instances.get(p.instanceId);
      if (!list) {
        list = [];
        instances.set(p.instanceId, list);
      }
      list.push(p);
    }
    for (const n of this.world.npcs.values()) {
      if (n.isDead) continue;
      let list = instances.get(n.instanceId);
      if (!list) {
        list = [];
        instances.set(n.instanceId, list);
      }
      list.push(n);
    }

    for (const entities of instances.values()) {
      const len = entities.length;
      if (len < 2) continue;

      // 2 iterations for smooth relaxation in crowded fights
      for (let iter = 0; iter < 2; iter++) {
        for (let i = 0; i < len; i++) {
          const a = entities[i];
          const isBossA = (a as NpcEntity).npcType === 'ELITE_BOSS';
          const isDummyA = (a as NpcEntity).npcType === 'TRAINING_DUMMY';
          const radiusA = isBossA ? 2.4 : isDummyA ? 1.3 : 0.95;

          for (let j = i + 1; j < len; j++) {
            const b = entities[j];
            const isBossB = (b as NpcEntity).npcType === 'ELITE_BOSS';
            const isDummyB = (b as NpcEntity).npcType === 'TRAINING_DUMMY';
            const radiusB = isBossB ? 2.4 : isDummyB ? 1.3 : 0.95;

            const minDist = radiusA + radiusB;
            let dx = a.x - b.x;
            let dy = a.y - b.y;

            // Fast bounding box pruning
            if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) continue;

            const distSq = dx * dx + dy * dy;
            if (distSq < minDist * minDist) {
              let dist = Math.sqrt(distSq);
              if (dist < 0.0001) {
                // If completely stacked at the exact same point, disperse deterministically
                const ang = ((i * 73 + j * 37) % 360) * (Math.PI / 180);
                dx = Math.cos(ang);
                dy = Math.sin(ang);
                dist = 0.0001;
              }

              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;

              // Mass & Immovability weights:
              // Training dummies are completely immovable
              // Bosses have heavy inertia
              if (isDummyA && !isDummyB) {
                b.x -= nx * overlap;
                b.y -= ny * overlap;
              } else if (!isDummyA && isDummyB) {
                a.x += nx * overlap;
                a.y += ny * overlap;
              } else if (isBossA && !isBossB) {
                a.x += nx * overlap * 0.05;
                a.y += ny * overlap * 0.05;
                b.x -= nx * overlap * 0.95;
                b.y -= ny * overlap * 0.95;
              } else if (!isBossA && isBossB) {
                a.x += nx * overlap * 0.95;
                a.y += ny * overlap * 0.95;
                b.x -= nx * overlap * 0.05;
                b.y -= ny * overlap * 0.05;
              } else {
                const push = overlap * 0.5;
                a.x += nx * push;
                a.y += ny * push;
                b.x -= nx * push;
                b.y -= ny * push;
              }

              a.x = Math.max(-750, Math.min(750, a.x));
              a.y = Math.max(-750, Math.min(750, a.y));
              b.x = Math.max(-750, Math.min(750, b.x));
              b.y = Math.max(-750, Math.min(750, b.y));
            }
          }
        }
      }
    }
  }

  private tickAiCompanion(ai: PlayerEntity, now: number): void {
    // Find human leader in same instance
    const humanLeader = Array.from(this.world.players.values()).find(
      (p) => p.instanceId === ai.instanceId && !p.isAiCompanion && !p.isDead
    );
    // Find nearest live hostile NPC in instance
    const hostiles = Array.from(this.world.npcs.values())
      .filter((n) => n.instanceId === ai.instanceId && !n.isDead && this.isEntityHostileTo(ai, n))
      .sort(
        (a, b) =>
          Math.hypot(a.x - ai.x, a.y - ai.y) - Math.hypot(b.x - ai.x, b.y - ai.y)
      );

    const primaryBoss = hostiles[0];
    if (!primaryBoss) {
      if (humanLeader) {
        const d = Math.hypot(humanLeader.x - ai.x, humanLeader.y - ai.y);
        if (d > 5) {
          const ang = Math.atan2(humanLeader.y - ai.y, humanLeader.x - ai.x);
          ai.facingRad = ang;
          ai.x += Math.cos(ang) * 0.32;
          ai.y += Math.sin(ang) * 0.32;
          ai.animState = 'Run';
        } else {
          ai.animState = 'Idle';
        }
      } else {
        ai.animState = 'Idle';
      }
      return;
    }

    const distToBoss = Math.hypot(primaryBoss.x - ai.x, primaryBoss.y - ai.y);
    const desiredRange = ai.queueRole === 'TANK' ? 3.2 : 12.0;

    if (distToBoss > desiredRange) {
      const ang = Math.atan2(primaryBoss.y - ai.y, primaryBoss.x - ai.x);
      ai.facingRad = ang;
      ai.x += Math.cos(ang) * 0.34;
      ai.y += Math.sin(ang) * 0.34;
      ai.animState = 'Run';
    } else {
      if (!ai.activeCast && ai.animState === 'Run') {
        ai.animState = 'Idle';
      }
      if (now >= ai.gcdEndsAtMs && !ai.activeCast) {
      ai.facingRad = Math.atan2(primaryBoss.y - ai.y, primaryBoss.x - ai.x);
      if (ai.queueRole === 'HEALER') {
        const allies = Array.from(this.world.players.values())
          .filter((p) => p.instanceId === ai.instanceId && !p.isDead)
          .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        const lowest = allies[0];
        if (lowest && lowest.hp < lowest.maxHp * 0.85) {
          ai.targetId = lowest.id;
          this.handleCastRequest(ai, ai.tacticalLoadout[1], lowest.id, undefined, now);
          return;
        }
      }
      ai.targetId = primaryBoss.id;
      const skillToCast =
        Math.random() < 0.35 ? ai.tacticalLoadout[2] : ai.tacticalLoadout[0];
      this.handleCastRequest(ai, skillToCast, primaryBoss.id, undefined, now);
    }
  }
}

  private tickEntityAuras(entity: EntityBase, now: number): void {
    const remaining: ActiveAura[] = [];
    for (const aura of entity.auras) {
      if (
        aura.definition.flags?.dimensionalAnchorOrigin &&
        aura.anchorX !== undefined &&
        aura.anchorY !== undefined
      ) {
        const dist = Math.hypot(entity.x - aura.anchorX, entity.y - aura.anchorY);
        if (dist > 8) {
          entity.x = aura.anchorX;
          entity.y = aura.anchorY;
          const caster = this.world.players.get(aura.casterId) ?? entity;
          this.applyAura(
            caster,
            entity,
            {
              id: 'aura_dimensional_snap_stun',
              name: 'Dimensional Snap Stun',
              icon: '⚓',
              type: 'DEBUFF',
              school: 'ARCANE',
              dispelType: 'MAGIC',
              durationMs: 2000,
              maxStacks: 1,
              flags: { isStun: true },
            },
            now
          );
          continue;
        }
      }

      if (aura.nextTickAtMs && aura.tickIntervalMs && now >= aura.nextTickAtMs) {
        aura.nextTickAtMs += aura.tickIntervalMs;
        const caster = this.world.players.get(aura.casterId);
        const power = caster
          ? Math.max(caster.computedStats.spellPower, caster.computedStats.attackPower)
          : 200;

        if (aura.definition.tickDamageCoeff && caster) {
          const fiendMult = caster.auras.some((a) => a.definition.flags?.umbriFiendActive)
            ? 2.0
            : 1.0;
          const dmg = Math.round(
            power * aura.definition.tickDamageCoeff * aura.stacks * fiendMult
          );
          this.applyDamage(caster, entity, null, dmg, false, now);

          if (aura.definition.flags?.duskPointPerTick) {
            caster.secondaryResource = Math.min(
              caster.maxSecondaryResource,
              caster.secondaryResource + aura.definition.flags.duskPointPerTick
            );
          }

          if (aura.definition.flags?.drainTransferToLowestAlly) {
            this.applyHeal(caster, caster, null, dmg, false, now);
          }
        }

        if (aura.definition.tickHealCoeff) {
          const heal = Math.round(power * aura.definition.tickHealCoeff * aura.stacks);
          this.applyHeal(caster ?? entity, entity, null, heal, false, now);
        }

        if (aura.definition.flags?.orbitingBladesDamageCoeff && caster) {
          const nearby = this.world.getEntitiesWithinRadius(
            entity.x,
            entity.y,
            8,
            entity.instanceId
          );
          for (const e of nearby) {
            if (!e.isDead && this.isEntityHostileTo(caster, e)) {
              this.applyDamage(
                caster,
                e,
                null,
                Math.round(power * aura.definition.flags.orbitingBladesDamageCoeff),
                false,
                now
              );
            }
          }
        }
      }

      if (now >= aura.expiresAtMs) {
        if (aura.definition.expireHealCoeff) {
          const caster = this.world.players.get(aura.casterId);
          const power = caster ? caster.computedStats.spellPower : 220;
          const burst = Math.round(power * aura.definition.expireHealCoeff * aura.stacks);
          this.applyHeal(caster ?? entity, entity, null, burst, false, now);
        }
        this.emitEvent({
          instanceId: entity.instanceId,
          timestampMs: now,
          type: 'AURA_REMOVED',
          sourceId: aura.casterId,
          sourceName: entity.name,
          targetId: entity.id,
          targetName: entity.name,
          auraName: aura.name,
          message: `${aura.name} fades from ${entity.name}.`,
        });
      } else {
        remaining.push(aura);
      }
    }

    if (remaining.length !== entity.auras.length) {
      entity.auras = remaining;
      if (entity.kind === 'PLAYER') {
        this.recalculatePlayerStats(entity as PlayerEntity);
      }
    } else {
      entity.auras = remaining;
    }
  }

  public emitEvent(event: Omit<CombatLogEvent, 'id'>): void {
    const full: CombatLogEvent = {
      id: `evt_${this.eventSeq++}`,
      ...event,
    };
    this.recentEvents.push(full);
    if (this.recentEvents.length > 80) {
      this.recentEvents.splice(0, this.recentEvents.length - 80);
    }
  }
}

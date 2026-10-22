export type FactionId = 'SOLARI' | 'TERRA' | 'UMBRI' | 'AETHER';

export type ClassId =
  | 'SUNFORGED_PALADIN'
  | 'LUMINARY_CLERIC'
  | 'CRAGWARDEN_JUGGERNAUT'
  | 'SYLVAN_WEAVER'
  | 'NIGHTBLADE_ASSASSIN'
  | 'HEXBINDER_WARLOCK'
  | 'CHRONOSAVANT_MAGE'
  | 'RIFTBLADE_SPELLWEAVER';

export type CombatRole = 'TANK' | 'HEALER' | 'MELEE_DPS' | 'RANGED_DPS' | 'HYBRID_DPS';

export type QueueRole = 'TANK' | 'HEALER' | 'DPS';

export type AnimClipName =
  | 'Idle'
  | 'Run'
  | 'Sprint'
  | 'Flight'
  | 'Jump'
  | 'Attack_Melee_1'
  | 'Attack_Cast'
  | 'Channel_Loop'
  | 'Hit_React'
  | 'Death';

export type TacticalSlotKey = 'LMB' | 'RMB' | 'Q' | 'E' | 'R' | 'F';

export type ArmorType = 'CLOTH' | 'LEATHER' | 'MEDIUM_MAIL' | 'ROCKPLATE_MAIL' | 'HEAVY_PLATE';

export type SpellSchool = 'PHYSICAL' | 'RADIANT' | 'NATURE' | 'SHADOW' | 'ARCANE';

export type DispelType = 'MAGIC' | 'CURSE' | 'POISON' | 'BLEED' | 'NONE';

export type PrimaryResourceType = 'DIVINE' | 'PRIMAL_FURY' | 'SHADOW_ENERGY' | 'ARCANE_MANA';

export type SecondaryResourceType =
  | 'SOLAR_CHARGE'      // 0..100 (100 triggers Zenith State)
  | 'VERDANT_SEEDS'     // 0..5 stacks (consuming triggers Overgrowth)
  | 'DUSK_POINTS'       // 0..5 combo points (builders & finishers)
  | 'ASTRAL_RESONANCE'; // 0..4 stacks (+15% dmg, +35% mana cost per stack)

export type TargetType =
  | 'ENEMY'
  | 'ALLY'
  | 'SELF'
  | 'GROUND_RETICLE'
  | 'CONE'
  | 'PBAOE';

export type CombatEventType =
  | 'SWING_DAMAGE'
  | 'SPELL_CAST_START'
  | 'SPELL_CAST_SUCCESS'
  | 'SPELL_CAST_FAILED'
  | 'SPELL_DAMAGE'
  | 'SPELL_HEAL'
  | 'AURA_APPLIED'
  | 'AURA_STACK_CHANGE'
  | 'AURA_REMOVED'
  | 'SPELL_INTERRUPTED'
  | 'LEVEL_UP'
  | 'ANNOUNCEMENT';

export interface PrimaryAttributes {
  stamina: number;   // 1 Stamina = 15 HP
  intellect: number; // Spell Power & Mana Pool
  strength: number;  // Melee Attack Power & Shield Block value
  agility: number;   // Melee/Ranged Attack Power, Dodge % & Crit %
  spirit: number;    // Combat & out-of-combat regeneration
}

export interface SecondaryAttributes {
  critRating: number;        // 150% base damage/healing on crit
  hasteRating: number;       // Reduces cast time, channel duration & GCD (floor 0.75s)
  masteryRating: number;     // Empowers faction-specific passive mechanics
  versatilityRating: number; // Flat damage/healing increase & damage reduction
}

export interface ComputedStats {
  maxHp: number;
  maxPrimaryResource: number;
  maxSecondaryResource: number;
  spellPower: number;
  attackPower: number;
  armor: number;
  blockChancePct: number;
  blockValue: number;
  dodgeChancePct: number;
  critChancePct: number;
  hastePct: number;
  masteryPct: number;
  versatilityDmgPct: number;
  versatilityDrPct: number;
  gcdDurationMs: number;
  moveSpeedMultiplier: number;
  damageMultiplier: number;
  healingMultiplier: number;
  damageTakenMultiplier: number;
}

export interface AuraDefinition {
  id: string;
  name: string;
  icon: string;
  type: 'BUFF' | 'DEBUFF';
  school: SpellSchool;
  dispelType: DispelType;
  durationMs: number;
  tickIntervalMs?: number;
  maxStacks: number;
  tickDamageCoeff?: number;
  tickHealCoeff?: number;
  absorbCoeff?: number;
  expireHealCoeff?: number;
  modifiers?: {
    damageDealtPct?: number;
    healingDonePct?: number;
    healingReceivedPct?: number;
    damageTakenPct?: number;
    hastePct?: number;
    moveSpeedPct?: number;
    armorPct?: number;
    blockChancePct?: number;
    maxHpPct?: number;
    spellPowerPct?: number;
    hitChancePct?: number;
    attackSpeedPct?: number;
    energyRegenMultiplier?: number;
    zeroManaCost?: boolean;
    ReflectNatureCoeff?: number;
  };
  flags?: {
    isStun?: boolean;
    isRoot?: boolean;
    isSilence?: boolean;
    isDisorient?: boolean;
    isFear?: boolean;
    isInvulnerable?: boolean;
    isSpellImmune?: boolean;
    isStealth?: boolean;
    enableCombatStealth?: boolean;
    isSpellReflect?: boolean;
    isTauntLock?: boolean;
    isZenithState?: boolean;
    isClearcasting?: boolean;
    isNightfall?: boolean;
    isWeakenedSoul?: boolean;
    isTemporalExhaustion?: boolean;
    knockbackStunImmune?: boolean;
    lifestealToAttackerPct?: number;
    unstableBacklashCoeff?: number;
    dimensionalAnchorOrigin?: boolean;
    orbitingBladesDamageCoeff?: number;
    umbriFiendActive?: boolean;
    duskPointPerTick?: number;
    drainTransferToLowestAlly?: boolean;
  };
}

export interface ActiveAura {
  instanceId: string;
  auraId: string;
  name: string;
  icon: string;
  type: 'BUFF' | 'DEBUFF';
  school: SpellSchool;
  dispelType: DispelType;
  casterId: string;
  targetId: string;
  appliedAtMs: number;
  expiresAtMs: number;
  durationMs: number;
  tickIntervalMs?: number;
  nextTickAtMs?: number;
  stacks: number;
  maxStacks: number;
  absorbRemaining: number;
  anchorX?: number;
  anchorY?: number;
  definition: AuraDefinition;
}

export interface AbilitySpecialMechanics {
  isFinisher?: boolean;
  minSecondaryResource?: number;
  consumesAllSecondary?: boolean;
  executeBelowHpPct?: number;
  usableWithAuraId?: string;
  requiresCasterAuraId?: string;
  bypassRequirementAuraId?: string;
  interruptsCast?: boolean;
  interruptLockDurationMs?: number;
  isTaunt?: boolean;
  tauntLockDurationMs?: number;
  pullTargetToCaster?: boolean;
  movementType?:
    | 'SHADOWSTEP_BEHIND'
    | 'BLINK_FORWARD'
    | 'LEAP_TO_RETICLE'
    | 'WARP_LUNGE'
    | 'TIME_WARP_REWIND'
    | 'PORTAL_PLACE_OR_USE';
  movementDistanceYards?: number;
  dispelCount?: number;
  dispelTypes?: DispelType[];
  stealEnemyMagicBuff?: boolean;
  detonatesVerdantSeeds?: boolean;
  spreadsCasterDebuffsRadiusYards?: number;
  sacrificeHpPct?: number;
  restorePrimaryResourcePct?: number;
  restoreMissingHpPct?: number;
  refundMaxManaPctPerStack?: number;
  seedsNearestWoundedAlly?: boolean;
  lowHpBonusDamageThresholdPct?: number;
  lowHpBonusDamageMultiplier?: number;
  procChance?: number;
  procAura?: AuraDefinition;
  requiresNoWeakenedSoul?: boolean;
  spawnsGroundZone?: {
    name: string;
    durationMs: number;
    radiusYards: number;
    tickIntervalMs: number;
    tickDamageCoeff?: number;
    tickHealCoeff?: number;
    pullToCenter?: boolean;
    blocksRangedTargetingInside?: boolean;
    trapsEnemiesInside?: boolean;
    reducesEnemyHitChancePct?: number;
    delayedDetonationMs?: number;
    detonationDamageCoeff?: number;
  };
}

export interface AbilityDefinition {
  id: string;
  classId: ClassId;
  factionId: FactionId;
  slotIndex: number; // 1..9 core class kit index
  name: string;
  description: string;
  icon: string;
  school: SpellSchool;
  targetType: TargetType;
  rangeYards: number;
  radiusYards?: number;
  castTimeMs: number;
  channelDurationMs: number;
  channelTicks?: number;
  cooldownMs: number;
  maxCharges?: number;
  isOffGCD: boolean;
  primaryResourceCost: number;
  primaryResourceGain: number;
  secondaryResourceCost: number;
  secondaryResourceGain: number;
  damageCoeff: number;
  healCoeff: number;
  threatMultiplier: number;
  selfAura?: AuraDefinition;
  targetAura?: AuraDefinition;
  special?: AbilitySpecialMechanics;
}

export interface FactionDefinition {
  id: FactionId;
  name: string;
  title: string;
  lore: string;
  bannerColor: string;
  accentColor: string;
  primaryResource: PrimaryResourceType;
  secondaryResource: SecondaryResourceType;
  resourceDescription: string;
  masteryName: string;
  masteryDescription: string;
  sanctuaryOffset: { x: number; y: number };
  warzoneBounds: { name: string; centerX: number; centerY: number; radius: number };
  classes: [ClassId, ClassId];
}

export interface ClassDefinition {
  id: ClassId;
  name: string;
  factionId: FactionId;
  role: CombatRole;
  armorType: ArmorType;
  description: string;
  specializations: [string, string, string];
  baseAttributes: PrimaryAttributes;
  baseSecondary: SecondaryAttributes;
  abilities: AbilityDefinition[];
}

export interface TalentNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 1 | 2 | 3 | 4 | 5;
  maxRanks: number;
  modifierPerRank: {
    stat?: keyof PrimaryAttributes | keyof SecondaryAttributes;
    flatBonus?: number;
    damageSchoolPct?: Partial<Record<SpellSchool, number>>;
    healingDonePct?: number;
    damageReductionPct?: number;
    critBonusPct?: number;
    hasteBonusPct?: number;
    cooldownReductionPct?: number;
    abilityEmpowerment?: {
      abilityId: string;
      bonusDamageCoeff?: number;
      bonusHealCoeff?: number;
      reducedCooldownMs?: number;
    };
  };
}

export interface TalentBranch {
  id: string;
  name: string;
  roleFocus: 'OFFENSIVE' | 'DEFENSIVE_UTILITY' | 'FACTION_MASTERY';
  description: string;
  nodes: TalentNode[];
}

export interface ClassTalentTree {
  classId: ClassId;
  branches: [TalentBranch, TalentBranch, TalentBranch];
}

export interface TcgRelicCard {
  id: string;
  name: string;
  factionId: FactionId;
  rarity: 'RARE' | 'EPIC' | 'MYTHIC_RELIC';
  cardNumber: string;
  loreQuote: string;
  effectSummary: string;
  icon: string;
  modifier: {
    bonusPrimaryStat?: Partial<PrimaryAttributes>;
    bonusSecondaryStat?: Partial<SecondaryAttributes>;
    chainHealTargets?: number;
    meleeBonusRadiantCoeff?: number;
    dotTickHasteScaling?: boolean;
    resourceRefundOnCrit?: number;
    shieldBonusMoveSpeedPct?: number;
    finisherBonusDamagePct?: number;
    overgrowthHealPulseCoeff?: number;
    astralPurgeCdrMs?: number;
  };
}

export interface ThreatEntry {
  entityId: string;
  entityName: string;
  threatValue: number;
  threatPct: number;
  isTanking: boolean;
}

export interface ThreatTable {
  npcId: string;
  entries: Record<string, number>;
  tauntLockedTargetId?: string;
  tauntLockExpiresAtMs?: number;
}

export interface ActiveCastState {
  abilityId: string;
  abilityName: string;
  icon: string;
  targetId?: string;
  targetPosition?: { x: number; y: number };
  startedAtMs: number;
  endsAtMs: number;
  isChannel: boolean;
  nextChannelTickAtMs?: number;
  channelTickIntervalMs?: number;
}

export interface QueuedSpellState {
  abilityId: string;
  targetId?: string;
  targetPosition?: { x: number; y: number };
  queuedAtMs: number;
}

export interface AbilityCooldownState {
  abilityId: string;
  chargesRemaining: number;
  maxCharges: number;
  readyAtMs: number;
  durationMs: number;
}

export interface GroundZone {
  id: string;
  instanceId: string;
  ownerId: string;
  ownerFaction: FactionId;
  abilityId: string;
  name: string;
  school: SpellSchool;
  x: number;
  y: number;
  radiusYards: number;
  createdAtMs: number;
  expiresAtMs: number;
  tickIntervalMs: number;
  nextTickAtMs: number;
  tickDamageCoeff: number;
  tickHealCoeff: number;
  pullToCenter?: boolean;
  blocksRangedTargetingInside?: boolean;
  trapsEnemiesInside?: boolean;
  reducesEnemyHitChancePct?: number;
  delayedDetonationMs?: number;
  detonated?: boolean;
  detonationDamageCoeff?: number;
}

export interface RelicNodeEntity {
  id: string;
  instanceId: string;
  name: string;
  factionId: FactionId;
  x: number;
  y: number;
  z: number;
  isAvailable: boolean;
  respawnAtMs: number;
  rewardCardId: string;
}

export interface EntityBase {
  id: string;
  instanceId: string;
  name: string;
  kind: 'PLAYER' | 'NPC';
  factionId: FactionId;
  level: number;
  x: number;
  y: number;
  z: number; // 3D Vertical Height / Jump elevation
  facingRad: number;
  hp: number;
  maxHp: number;
  isDead: boolean;
  targetId: string | null;
  auras: ActiveAura[];
  activeCast: ActiveCastState | null;
  schoolLockouts: Partial<Record<SpellSchool, number>>;
  animState: AnimClipName;
  animUpdatedAtMs: number;
}

export interface PlayerEntity extends EntityBase {
  kind: 'PLAYER';
  classId: ClassId;
  role: CombatRole;
  queueRole: QueueRole;
  isAiCompanion?: boolean;
  tankStance: boolean;
  primaryResourceType: PrimaryResourceType;
  primaryResource: number;
  maxPrimaryResource: number;
  secondaryResourceType: SecondaryResourceType;
  secondaryResource: number;
  maxSecondaryResource: number;
  attributes: PrimaryAttributes;
  secondaryAttributes: SecondaryAttributes;
  computedStats: ComputedStats;
  gcdStartedAtMs: number;
  gcdEndsAtMs: number;
  queuedSpell: QueuedSpellState | null;
  cooldowns: Record<string, AbilityCooldownState>;
  actionBars: (string | null)[]; // 24 slots preserved
  /** 6-Slot Tactical Action Cluster: [LMB, RMB, Q, E, R, F] */
  tacticalLoadout: [string, string, string, string, string, string];
  dodgeCooldownEndsAtMs: number;
  jumpEndsAtMs: number;
  talents: Record<string, number>;
  talentPointsAvailable: number;
  equippedRelicDeck: [string, string, string];
  currentXp: number;
  maxXp: number;
  attributePointsAvailable: number;
  abilityPointsAvailable: number;
  abilityRanks: Record<string, number>;
  allocatedAttributes: Partial<PrimaryAttributes>;
  inCombat: boolean;
  lastCombatAtMs: number;
  savedOpenWorldPos: { x: number; y: number; z: number } | null;
  rewindSnapshot: {
    hp: number;
    primaryResource: number;
    x: number;
    y: number;
    expiresAtMs: number;
  } | null;
  portalPosition: {
    x: number;
    y: number;
    expiresAtMs: number;
  } | null;
  isMounted?: boolean;
  mountType?: 'EMBERWING_HAWK';
  lastMoveAtMs?: number;
}

export interface NpcEntity extends EntityBase {
  kind: 'NPC';
  npcType:
    | 'TRAINING_DUMMY'
    | 'ALLY_SPIRIT'
    | 'WARZONE_MOB'
    | 'ELITE_BOSS'
    | 'BASE_GUARD'
    | 'FACTION_LEADER'
    | 'QUARTERMASTER';
  tier?: 1 | 2 | 3 | 4 | 5;
  xpReward?: number;
  title: string;
  modelId: string;
  isHostile: boolean;
  isVoidIncursion?: boolean;
  spawnX: number;
  spawnY: number;
  aggroRadiusYards: number;
  leashRadiusYards: number;
  swingTimerMs: number;
  nextSwingAtMs: number;
  baseDamage: number;
  castAbilityName?: string;
  castCooldownMs?: number;
  nextCastAtMs?: number;
  threatList: ThreatEntry[];
  respawnGraceUntilMs?: number;
}

export type InstanceTemplateId =
  | 'open_world_nexus'
  | 'dungeon_sunspire_vaults'
  | 'dungeon_duskveil_catacombs'
  | 'bg_aether_rift_basin'
  | 'bg_glimmerfall_arena';

export type InstanceCategory = 'OPEN_WORLD' | 'PVE_DUNGEON' | 'PVP_BATTLEGROUND';

export interface InstanceBossSpec {
  id: string;
  name: string;
  title: string;
  factionId: FactionId;
  modelId: string;
  x: number;
  y: number;
  maxHp: number;
  baseDamage: number;
  castAbilityName: string;
}

export interface InstanceDefinition {
  id: InstanceTemplateId;
  name: string;
  subtitle: string;
  category: InstanceCategory;
  factionTheme: FactionId;
  description: string;
  requiredPlayers: number;
  roleComposition: { tanks: number; healers: number; dps: number };
  spawnPoint: { x: number; y: number; z: number };
  skyColor: string;
  fogColor: string;
  groundColor: string;
  rewardSummary: string;
  bosses: InstanceBossSpec[];
}

export interface QueueStatusState {
  isQueued: boolean;
  templateId: InstanceTemplateId | null;
  role: QueueRole;
  queuedAtMs: number;
  elapsedSec: number;
  canInstantAiPop: boolean;
  popReady: boolean;
  popInstanceId: string | null;
  popTemplateId: InstanceTemplateId | null;
  popExpiresAtMs: number;
  partyPreview: { name: string; role: QueueRole; classId: ClassId; isAi: boolean }[];
}

export interface ActiveInstanceSummary {
  instanceId: string;
  templateId: InstanceTemplateId;
  name: string;
  category: InstanceCategory;
  objectiveText: string;
  bossesDefeated: number;
  totalBosses: number;
  solariScore: number;
  umbriScore: number;
  isCompleted: boolean;
  completionRewardText?: string;
}

export interface CombatLogEvent {
  id: string;
  instanceId: string;
  timestampMs: number;
  type: CombatEventType;
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  abilityId?: string;
  abilityName?: string;
  school?: SpellSchool;
  amount?: number;
  absorbedAmount?: number;
  isCrit?: boolean;
  auraName?: string;
  stacks?: number;
  interruptedAbilityName?: string;
  message: string;
}

export type ClientPacket =
  | {
      type: 'JOIN_GAME';
      name: string;
      classId: ClassId;
    }
  | {
      type: 'MOVE_INPUT';
      dx: number;
      dy: number;
      x?: number;
      y?: number;
      z?: number;
      facingRad: number;
      isSprinting?: boolean;
    }
  | {
      type: 'JUMP_OR_DODGE';
      action: 'JUMP' | 'DODGE';
      facingRad: number;
    }
  | {
      type: 'SELECT_TARGET';
      targetId: string | null;
    }
  | {
      type: 'CAST_ABILITY';
      abilityId: string;
      targetId?: string | null;
      groundPosition?: { x: number; y: number };
    }
  | {
      type: 'SWITCH_CLASS';
      classId: ClassId;
    }
  | {
      type: 'TOGGLE_TANK_STANCE';
    }
  | {
      type: 'ALLOCATE_TALENT';
      nodeId: string;
    }
  | {
      type: 'RESET_TALENTS';
    }
  | {
      type: 'EQUIP_RELIC_DECK';
      cardIds: [string, string, string];
    }
  | {
      type: 'ALLOCATE_ATTRIBUTE';
      attribute: keyof PrimaryAttributes;
    }
  | {
      type: 'UPGRADE_ABILITY';
      abilityId: string;
    }
  | {
      type: 'UPDATE_ACTION_BAR';
      slotIndex: number;
      abilityId: string | null;
    }
  | {
      type: 'UPDATE_TACTICAL_LOADOUT';
      tacticalIndex: number; // 0..5 (LMB, RMB, Q, E, R, F)
      abilityId: string;
    }
  | {
      type: 'QUEUE_JOIN';
      templateId: InstanceTemplateId;
      role: QueueRole;
    }
  | {
      type: 'QUEUE_LEAVE';
    }
  | {
      type: 'QUEUE_INSTANT_AI_POP';
      templateId: InstanceTemplateId;
      role: QueueRole;
    }
  | {
      type: 'QUEUE_ACCEPT_POP';
    }
  | {
      type: 'LEAVE_INSTANCE';
    }
  | {
      type: 'HARVEST_RELIC_NODE';
      nodeId: string;
    }
  | {
      type: 'TOGGLE_MOUNT';
    };

export type ServerPacket =
  | {
      type: 'WELCOME';
      playerId: string;
      serverTimeMs: number;
    }
  | {
      type: 'WORLD_STATE';
      serverTimeMs: number;
      instanceInfo: ActiveInstanceSummary;
      queueStatus: QueueStatusState;
      players: PlayerEntity[];
      npcs: NpcEntity[];
      groundZones: GroundZone[];
      relicNodes: RelicNodeEntity[];
      recentEvents: CombatLogEvent[];
    };

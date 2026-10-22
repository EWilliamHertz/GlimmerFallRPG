import { ClassId, ClassTalentTree, TalentNode } from './types';

function createClassTalentTree(
  classId: ClassId,
  specNames: [string, string, string],
  primarySchool: 'RADIANT' | 'NATURE' | 'SHADOW' | 'ARCANE' | 'PHYSICAL',
  primaryStat: 'strength' | 'intellect' | 'agility',
  keyAbilityIds: [string, string, string]
): ClassTalentTree {
  const prefix = classId.toLowerCase();
  return {
    classId,
    branches: [
      {
        id: `${prefix}_branch_offensive`,
        name: specNames[0],
        roleFocus: 'OFFENSIVE',
        description: `Specialization & Offensive output enhancements for ${specNames[0]}.`,
        nodes: [
          {
            id: `${prefix}_off_t1`,
            name: 'Honed Conviction',
            description: 'Increases Critical Strike chance by 2% per rank.',
            icon: '⚔️',
            tier: 1,
            maxRanks: 5,
            modifierPerRank: {
              critBonusPct: 0.02,
            },
          },
          {
            id: `${prefix}_off_t2`,
            name: 'Ascendant Might',
            description: `Increases primary ${primaryStat} by 8 per rank.`,
            icon: '🔥',
            tier: 2,
            maxRanks: 5,
            modifierPerRank: {
              stat: primaryStat,
              flatBonus: 8,
            },
          },
          {
            id: `${prefix}_off_t3`,
            name: 'Signature Mastery',
            description: 'Increases the base damage/healing coefficient of your primary builder by +12% per rank.',
            icon: '✨',
            tier: 3,
            maxRanks: 5,
            modifierPerRank: {
              abilityEmpowerment: {
                abilityId: keyAbilityIds[0],
                bonusDamageCoeff: 0.12,
                bonusHealCoeff: 0.12,
              },
            },
          },
          {
            id: `${prefix}_off_t4`,
            name: 'Relentless Tempo',
            description: 'Increases Haste by 2.5% per rank.',
            icon: '⚡',
            tier: 4,
            maxRanks: 3,
            modifierPerRank: {
              hasteBonusPct: 0.025,
            },
          },
          {
            id: `${prefix}_off_t5`,
            name: `${specNames[0]} Capstone`,
            description: `Increases all ${primarySchool} damage and healing by 6% per rank.`,
            icon: '👑',
            tier: 5,
            maxRanks: 2,
            modifierPerRank: {
              damageSchoolPct: { [primarySchool]: 0.06 },
              healingDonePct: 0.06,
            },
          },
        ],
      },
      {
        id: `${prefix}_branch_defensive`,
        name: specNames[1],
        roleFocus: 'DEFENSIVE_UTILITY',
        description: `Survivability, crowd-control recovery, and defensive cooldown reduction for ${specNames[1]}.`,
        nodes: [
          {
            id: `${prefix}_def_t1`,
            name: 'Fortified Vitality',
            description: 'Increases Stamina by 10 per rank (+150 HP per rank).',
            icon: '🛡️',
            tier: 1,
            maxRanks: 5,
            modifierPerRank: {
              stat: 'stamina',
              flatBonus: 10,
            },
          },
          {
            id: `${prefix}_def_t2`,
            name: 'Hardened Resolve',
            description: 'Reduces all damage taken by 2% per rank.',
            icon: '🪨',
            tier: 2,
            maxRanks: 5,
            modifierPerRank: {
              damageReductionPct: 0.02,
            },
          },
          {
            id: `${prefix}_def_t3`,
            name: 'Tactical Readiness',
            description: 'Reduces the cooldown of your signature tactical/defensive skill by 1.0s per rank.',
            icon: '⏳',
            tier: 3,
            maxRanks: 5,
            modifierPerRank: {
              abilityEmpowerment: {
                abilityId: keyAbilityIds[1],
                reducedCooldownMs: 1000,
              },
            },
          },
          {
            id: `${prefix}_def_t4`,
            name: 'Versatile Adaptation',
            description: 'Increases Versatility Rating by 15 per rank.',
            icon: '💠',
            tier: 4,
            maxRanks: 3,
            modifierPerRank: {
              stat: 'versatilityRating',
              flatBonus: 15,
            },
          },
          {
            id: `${prefix}_def_t5`,
            name: `${specNames[1]} Sanctuary`,
            description: 'Reduces all ability cooldowns by 5% per rank and increases healing received.',
            icon: '🏛️',
            tier: 5,
            maxRanks: 2,
            modifierPerRank: {
              cooldownReductionPct: 0.05,
              damageReductionPct: 0.03,
            },
          },
        ],
      },
      {
        id: `${prefix}_branch_mastery`,
        name: specNames[2],
        roleFocus: 'FACTION_MASTERY',
        description: `Empowers faction-specific secondary resources and capstone executions for ${specNames[2]}.`,
        nodes: [
          {
            id: `${prefix}_mas_t1`,
            name: 'Leyline Attunement',
            description: 'Increases Spirit by 10 per rank, boosting resource regeneration.',
            icon: '🌟',
            tier: 1,
            maxRanks: 5,
            modifierPerRank: {
              stat: 'spirit',
              flatBonus: 10,
            },
          },
          {
            id: `${prefix}_mas_t2`,
            name: 'Faction Conduit',
            description: 'Increases Mastery Rating by 16 per rank.',
            icon: '🔮',
            tier: 2,
            maxRanks: 5,
            modifierPerRank: {
              stat: 'masteryRating',
              flatBonus: 16,
            },
          },
          {
            id: `${prefix}_mas_t3`,
            name: 'Ultimate Amplification',
            description: 'Empowers your capstone/finisher skill by +20% damage/healing per rank.',
            icon: '☄️',
            tier: 3,
            maxRanks: 5,
            modifierPerRank: {
              abilityEmpowerment: {
                abilityId: keyAbilityIds[2],
                bonusDamageCoeff: 0.2,
                bonusHealCoeff: 0.2,
              },
            },
          },
          {
            id: `${prefix}_mas_t4`,
            name: 'Overcharged Reservoir',
            description: 'Increases Critical Strike Rating and Haste Rating by 12 per rank.',
            icon: '🔋',
            tier: 4,
            maxRanks: 3,
            modifierPerRank: {
              stat: 'critRating',
              flatBonus: 12,
            },
          },
          {
            id: `${prefix}_mas_t5`,
            name: `Avatar of ${specNames[2]}`,
            description: `Increases all ${primarySchool} output by 8% per rank and Critical Strike chance by 3% per rank.`,
            icon: '🌌',
            tier: 5,
            maxRanks: 2,
            modifierPerRank: {
              damageSchoolPct: { [primarySchool]: 0.08 },
              critBonusPct: 0.03,
            },
          },
        ],
      },
    ],
  };
}

export const TALENTS_REGISTRY: Record<ClassId, ClassTalentTree> = {
  SUNFORGED_PALADIN: createClassTalentTree(
    'SUNFORGED_PALADIN',
    ['Dawnbreaker Retribution', 'Sunspire Bastion', 'Solar Adjudicator'],
    'RADIANT',
    'strength',
    ['pal_strike_of_dawn', 'pal_aegis_of_the_sunspire', 'pal_supernova_execution']
  ),
  LUMINARY_CLERIC: createClassTalentTree(
    'LUMINARY_CLERIC',
    ['Solar Arbitrage', 'Dawnlight Grace', 'Prism Sovereign'],
    'RADIANT',
    'intellect',
    ['cle_solar_flare', 'cle_flash_of_radiance', 'cle_halo_of_solari']
  ),
  CRAGWARDEN_JUGGERNAUT: createClassTalentTree(
    'CRAGWARDEN_JUGGERNAUT',
    ['Worldbreaker', 'Tectonic Colossus', 'Briarheart Guardian'],
    'NATURE',
    'strength',
    ['jug_tectonic_slam', 'jug_thornbark_carapace', 'jug_worldbreaker_crater']
  ),
  SYLVAN_WEAVER: createClassTalentTree(
    'SYLVAN_WEAVER',
    ['Bramble Siphon', 'Verdant Lifebinder', 'Ancient Overgrowth'],
    'NATURE',
    'intellect',
    ['syl_wrath_of_the_bramble', 'syl_spore_cloud', 'syl_germinate']
  ),
  NIGHTBLADE_ASSASSIN: createClassTalentTree(
    'NIGHTBLADE_ASSASSIN',
    ['Duskveil Executioner', 'Voidstalker', 'Crimson Venomancer'],
    'SHADOW',
    'agility',
    ['asn_serrated_mutilate', 'asn_kick_of_the_syndicate', 'asn_eviscerating_bite']
  ),
  HEXBINDER_WARLOCK: createClassTalentTree(
    'HEXBINDER_WARLOCK',
    ['Withered Affliction', 'Soul Harvester', 'Abyssal Hexology'],
    'SHADOW',
    'intellect',
    ['wlk_umbral_bolt', 'wlk_plague_contagion', 'wlk_unstable_hex']
  ),
  CHRONOSAVANT_MAGE: createClassTalentTree(
    'CHRONOSAVANT_MAGE',
    ['Astral Savant', 'Chronomancy', 'Singularity Weaver'],
    'ARCANE',
    'intellect',
    ['mag_astral_barrage', 'mag_blink_step', 'mag_aether_purge']
  ),
  RIFTBLADE_SPELLWEAVER: createClassTalentTree(
    'RIFTBLADE_SPELLWEAVER',
    ['Aetherial Duelist', 'Spellbreaker', 'Riftblade Vanguard'],
    'ARCANE',
    'intellect',
    ['rft_phase_strike', 'rft_warp_lunge', 'rft_aetherial_blades']
  ),
};

export const TALENT_NODE_BY_ID: Record<string, TalentNode> = Object.fromEntries(
  Object.values(TALENTS_REGISTRY).flatMap((tree) =>
    tree.branches.flatMap((branch) => branch.nodes.map((node) => [node.id, node]))
  )
);

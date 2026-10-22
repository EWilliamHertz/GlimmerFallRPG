import { AuraDefinition, FactionDefinition, FactionId, TcgRelicCard } from './types';

export const ZENITH_STATE_AURA: AuraDefinition = {
  id: 'aura_zenith_state',
  name: 'Zenith State',
  icon: '☀️',
  type: 'BUFF',
  school: 'RADIANT',
  dispelType: 'NONE',
  durationMs: 8000,
  maxStacks: 1,
  modifiers: {
    hastePct: 0.20,
    damageDealtPct: 0.15,
  },
  flags: {
    isZenithState: true,
  },
};

export const ZENITH_RADIANT_BURN_AURA: AuraDefinition = {
  id: 'aura_zenith_radiant_burn',
  name: 'Zenith Sear',
  icon: '🔥',
  type: 'DEBUFF',
  school: 'RADIANT',
  dispelType: 'MAGIC',
  durationMs: 6000,
  tickIntervalMs: 2000,
  maxStacks: 3,
  tickDamageCoeff: 0.22,
};

export const FACTIONS_REGISTRY: Record<FactionId, FactionDefinition> = {
  SOLARI: {
    id: 'SOLARI',
    name: 'Solari',
    title: 'The Sunspire Dominion',
    lore: 'Radiant zealots, sun-forged templars, and solar clerics who channel the blinding heart of the Sunspire.',
    bannerColor: '#f59e0b',
    accentColor: '#fde047',
    primaryResource: 'DIVINE',
    secondaryResource: 'SOLAR_CHARGE',
    resourceDescription:
      'Divine + Solar Charge (0 to 100) — Building Solar Charge empowers abilities; reaching 100 triggers Zenith State (+20% Haste and radiant burn on all hits for 8s).',
    masteryName: 'Mastery: Heart of the Sunspire',
    masteryDescription:
      'Increases all Radiant damage and healing by 8% + Master Rating%, and increases Zenith State burn potency.',
    sanctuaryOffset: { x: 22, y: -22 },
    warzoneBounds: {
      name: 'Sunspire Ascent (Solari Warzone)',
      centerX: 180,
      centerY: -180,
      radius: 140,
    },
    classes: ['SUNFORGED_PALADIN', 'LUMINARY_CLERIC'],
  },
  TERRA: {
    id: 'TERRA',
    name: 'Terra',
    title: 'The Rootdeep Compact',
    lore: 'Ancient grove wardens, tectonic geomancers, and primal shapeshifters bound to the living earth and colossal world-trees.',
    bannerColor: '#10b981',
    accentColor: '#86efac',
    primaryResource: 'PRIMAL_FURY',
    secondaryResource: 'VERDANT_SEEDS',
    resourceDescription:
      'Primal Fury (0 to 100) + Verdant Seeds (Stacks 1 to 5) — Consuming Verdant Seeds triggers Overgrowth on the terrain.',
    masteryName: 'Mastery: Warden of Rootdeep',
    masteryDescription:
      'Increases Nature/Physical damage and periodic healing by 8% + Mastery Rating%, and grants bonus armor during Overgrowth.',
    sanctuaryOffset: { x: 22, y: 22 },
    warzoneBounds: {
      name: 'Rootdeep Wilds (Terra Warzone)',
      centerX: 180,
      centerY: 180,
      radius: 140,
    },
    classes: ['CRAGWARDEN_JUGGERNAUT', 'SYLVAN_WEAVER'],
  },
  UMBRI: {
    id: 'UMBRI',
    name: 'Umbri',
    title: 'The Duskveil Syndicate',
    lore: 'Shadow-weavers, blood-hex assassins, and void-touched stalkers operating in the perpetual twilight of Duskveil.',
    bannerColor: '#8b5cf6',
    accentColor: '#d8b4fe',
    primaryResource: 'SHADOW_ENERGY',
    secondaryResource: 'DUSK_POINTS',
    resourceDescription:
      'Shadow Energy (100 cap, regens 10/sec) + Dusk Combo Points (1 to 5) — Builders grant Dusk Points; Finishers consume up to 5 points.',
    masteryName: 'Mastery: Executioner of Duskveil',
    masteryDescription:
      'Increases Dusk Finisher potency and Shadow periodic damage by 10% + Mastery Rating%.',
    sanctuaryOffset: { x: -22, y: 22 },
    warzoneBounds: {
      name: 'Duskveil Undercroft (Umbri Warzone)',
      centerX: -180,
      centerY: 180,
      radius: 140,
    },
    classes: ['NIGHTBLADE_ASSASSIN', 'HEXBINDER_WARLOCK'],
  },
  AETHER: {
    id: 'AETHER',
    name: 'Aether',
    title: 'The Astral Rift Conclave',
    lore: 'Chronomancers, rift-blades, and cosmic scholars bending space, gravity, and raw ley-lines across fractured celestial skies.',
    bannerColor: '#06b6d4',
    accentColor: '#67e8f9',
    primaryResource: 'ARCANE_MANA',
    secondaryResource: 'ASTRAL_RESONANCE',
    resourceDescription:
      'Arcane Mana + Astral Resonance (1 to 4 Stacks) — Stacks increase damage by 15% and Mana costs by 35%; Purging stacks refunds Mana.',
    masteryName: 'Mastery: Leyline Convergence',
    masteryDescription:
      'Increases Arcane damage per active Astral Resonance stack by an additional 4% + Mastery Rating% and increases Mana pool.',
    sanctuaryOffset: { x: -22, y: -22 },
    warzoneBounds: {
      name: 'Astral Rift Fracture (Aether Warzone)',
      centerX: -180,
      centerY: -180,
      radius: 140,
    },
    classes: ['CHRONOSAVANT_MAGE', 'RIFTBLADE_SPELLWEAVER'],
  },
};

export const TCG_RELIC_CARDS: TcgRelicCard[] = [
  // SOLARI RELICS (Neon DB)
  {
    id: 'card_solari_crest_of_the_sun',
    name: 'Crest of the Sun',
    factionId: 'SOLARI',
    rarity: 'RARE',
    cardNumber: 'SOL-02/REL',
    loreQuote: '"When a Solari Entity is deployed, heal your Nexus for 1."',
    effectSummary: 'Single-target heals chain to 2 nearby allies for 45% potency. Grants +20 Spirit & +15 Stamina.',
    icon: '☀️',
    modifier: {
      bonusPrimaryStat: { spirit: 20, stamina: 15 },
      chainHealTargets: 2,
    },
  },
  {
    id: 'card_solari_sunforge_anvil',
    name: 'Sunforge Anvil',
    factionId: 'SOLARI',
    rarity: 'EPIC',
    cardNumber: 'SOL-03/REL',
    loreQuote: '"At the start of your turn, give a random friendly Entity +1 Power."',
    effectSummary: 'Melee strikes deal +28% bonus Radiant burn damage. Grants +25 Strength & +15 Stamina.',
    icon: '⚒️',
    modifier: {
      bonusPrimaryStat: { strength: 25, stamina: 15 },
      meleeBonusRadiantCoeff: 0.28,
    },
  },
  {
    id: 'card_solari_aegis_of_the_sun',
    name: 'Aegis of the Sun',
    factionId: 'SOLARI',
    rarity: 'EPIC',
    cardNumber: 'SOL-04/REL',
    loreQuote: '"Your Nexus cannot take more than 5 damage from a single source."',
    effectSummary: 'Grants +35 Stamina, +15% shield block value, and caps burst damage taken.',
    icon: '🛡️',
    modifier: {
      bonusPrimaryStat: { stamina: 35, strength: 15 },
      bonusSecondaryStat: { versatilityRating: 35 },
    },
  },
  {
    id: 'card_solari_heavens_gate',
    name: "Heaven's Gate",
    factionId: 'SOLARI',
    rarity: 'MYTHIC_RELIC',
    cardNumber: 'SOL-05/REL',
    loreQuote: '"Friendly Guard Entities have +2 Health."',
    effectSummary: '+350 Max HP and +15% movement speed whenever shielded or in Zenith State. +35 Haste.',
    icon: '⛩️',
    modifier: {
      bonusPrimaryStat: { stamina: 30 },
      bonusSecondaryStat: { hasteRating: 35 },
      shieldBonusMoveSpeedPct: 0.15,
    },
  },

  // TERRA RELICS (Neon DB)
  {
    id: 'card_terra_bramble_armor',
    name: 'Bramble Armor',
    factionId: 'TERRA',
    rarity: 'RARE',
    cardNumber: 'TER-03/REL',
    loreQuote: '"Friendly Guard Entities reflect 1 damage back to attackers."',
    effectSummary: 'Reflects Nature damage back to attackers whenever struck. +25 Stamina, +15 Strength.',
    icon: '🌿',
    modifier: {
      bonusPrimaryStat: { stamina: 25, strength: 15 },
      bonusSecondaryStat: { versatilityRating: 40 },
    },
  },
  {
    id: 'card_terra_grove_sanctuary',
    name: 'Grove Sanctuary',
    factionId: 'TERRA',
    rarity: 'EPIC',
    cardNumber: 'TER-04/REL',
    loreQuote: '"At the end of your turn, fully heal all friendly Entities."',
    effectSummary: 'Consuming Verdant Seeds pulses Overgrowth AoE healing (65% SP) to all nearby allies. +25 Spirit.',
    icon: '🌳',
    modifier: {
      bonusPrimaryStat: { spirit: 25, stamina: 15 },
      overgrowthHealPulseCoeff: 0.65,
    },
  },
  {
    id: 'card_terra_heart_of_the_forest',
    name: 'Heart of the Forest',
    factionId: 'TERRA',
    rarity: 'MYTHIC_RELIC',
    cardNumber: 'TER-05/REL',
    loreQuote: '"Your Nexus gains +1 maximum Health at the end of each turn."',
    effectSummary: 'Increases Maximum Health by +15% and accelerates out-of-combat health regeneration. +40 Stamina.',
    icon: '💚',
    modifier: {
      bonusPrimaryStat: { stamina: 40, spirit: 20 },
      bonusSecondaryStat: { masteryRating: 35 },
    },
  },

  // UMBRI RELICS (Neon DB)
  {
    id: 'card_umbri_altar_of_sacrifice',
    name: 'Altar of Sacrifice',
    factionId: 'UMBRI',
    rarity: 'RARE',
    cardNumber: 'UMB-02/REL',
    loreQuote: '"Once per turn, you may destroy a friendly Entity to gain 1 Energy."',
    effectSummary: 'Executing finishing moves grants +30% bonus damage and immediately refunds 20 Energy. +25 Agility.',
    icon: '🩸',
    modifier: {
      bonusPrimaryStat: { agility: 25, strength: 15 },
      finisherBonusDamagePct: 0.3,
    },
  },
  {
    id: 'card_umbri_void_prism',
    name: 'Void Prism',
    factionId: 'UMBRI',
    rarity: 'RARE',
    cardNumber: 'UMB-03/REL',
    loreQuote: '"Whenever a player discards a card, deal 1 damage to their Nexus."',
    effectSummary: 'Critical strikes inflict a stacking Void Burn dealing periodic Shadow damage. +20 Agility, +50 Crit.',
    icon: '🔮',
    modifier: {
      bonusPrimaryStat: { agility: 20 },
      bonusSecondaryStat: { critRating: 50 },
    },
  },
  {
    id: 'card_umbri_void_gate',
    name: 'Void Gate',
    factionId: 'UMBRI',
    rarity: 'EPIC',
    cardNumber: 'UMB-04/REL',
    loreQuote: '"At the start of your turn, create a 1/1 Voidling token."',
    effectSummary: 'Entering combat summons a Shadow Voidling minion to harass and distract your target. +25 Agility, +20 Stamina.',
    icon: '🌌',
    modifier: {
      bonusPrimaryStat: { agility: 25, stamina: 20 },
      bonusSecondaryStat: { masteryRating: 30 },
    },
  },
  {
    id: 'card_umbri_tome_of_the_void',
    name: 'Tome of the Void',
    factionId: 'UMBRI',
    rarity: 'MYTHIC_RELIC',
    cardNumber: 'UMB-05/REL',
    loreQuote: '"Your maximum hand size is increased by 2. Draw an extra card each turn."',
    effectSummary: 'Reduces Global Cooldown by 0.15s and grants +25% faster Energy/Mana regeneration. +30 Intellect.',
    icon: '📜',
    modifier: {
      bonusPrimaryStat: { intellect: 30 },
      bonusSecondaryStat: { hasteRating: 45 },
    },
  },

  // AETHER RELICS (Neon DB)
  {
    id: 'card_aether_mana_crystal',
    name: 'Mana Crystal',
    factionId: 'AETHER',
    rarity: 'RARE',
    cardNumber: 'AET-02/REL',
    loreQuote: '"When you cast a spell, gain 1 temporary Energy (max once per turn)."',
    effectSummary: 'Casting spells restores 10 Arcane Mana / Energy. Grants +25 Intellect & +45 Haste Rating.',
    icon: '💎',
    modifier: {
      bonusPrimaryStat: { intellect: 25 },
      bonusSecondaryStat: { hasteRating: 45 },
    },
  },
  {
    id: 'card_aether_book_of_secrets',
    name: 'Book of Secrets',
    factionId: 'AETHER',
    rarity: 'EPIC',
    cardNumber: 'AET-03/REL',
    loreQuote: '"At the end of your turn, if you didn\'t attack, draw a card."',
    effectSummary: 'Consuming 4 Astral Resonance stacks reduces active cooldowns by 1.5s. +20 Intellect, +40 Crit Rating.',
    icon: '📖',
    modifier: {
      bonusPrimaryStat: { intellect: 20 },
      bonusSecondaryStat: { critRating: 40 },
      astralPurgeCdrMs: 1500,
    },
  },
  {
    id: 'card_aether_mirror_shield',
    name: 'Mirror Shield',
    factionId: 'AETHER',
    rarity: 'MYTHIC_RELIC',
    cardNumber: 'AET-04/REL',
    loreQuote: '"The first spell your opponent casts each turn is canceled."',
    effectSummary: 'Grants an automatic Spell-Reflect barrier and reduces magical damage taken by 12%. +25 Stamina, +15 Spirit.',
    icon: '🪞',
    modifier: {
      bonusPrimaryStat: { stamina: 25, spirit: 15 },
      bonusSecondaryStat: { versatilityRating: 45 },
    },
  },
];

// Backward-compatibility aliases for previously saved accounts
export const RELIC_CARD_ALIASES: Record<string, string> = {
  card_solari_sunforged_edicts: 'card_solari_sunforge_anvil',
  card_solari_solar_flare: 'card_solari_crest_of_the_sun',
  card_solari_solar_core: 'card_solari_sunforge_anvil',
  card_solari_prism_seraph: 'card_solari_crest_of_the_sun',
  card_solari_zenith_hourglass: 'card_solari_aegis_of_the_sun',
  card_terra_worldtree_heart: 'card_terra_heart_of_the_forest',
  card_terra_tectonic_bastion: 'card_terra_bramble_armor',
  card_terra_sporesinger_idol: 'card_terra_grove_sanctuary',
  card_umbri_duskblade_insignia: 'card_umbri_altar_of_sacrifice',
  card_umbri_bloodhex_grimoire: 'card_umbri_void_prism',
  card_umbri_umbri_prism: 'card_umbri_void_prism',
  card_umbri_voidstalker_cloak: 'card_umbri_void_gate',
  card_aether_chronocore_prism: 'card_aether_mana_crystal',
  card_aether_aether_core: 'card_aether_mana_crystal',
  card_aether_riftblade_conduit: 'card_aether_book_of_secrets',
  card_aether_leyline_compass: 'card_aether_mirror_shield',
};

export const TCG_RELIC_BY_ID: Record<string, TcgRelicCard> = Object.fromEntries(
  TCG_RELIC_CARDS.map((card) => [card.id, card])
);

// Register alias lookups in TCG_RELIC_BY_ID so old saves resolve seamlessly
for (const [oldId, newId] of Object.entries(RELIC_CARD_ALIASES)) {
  if (TCG_RELIC_BY_ID[newId]) {
    TCG_RELIC_BY_ID[oldId] = TCG_RELIC_BY_ID[newId];
  }
}

export const DEFAULT_DECK_BY_FACTION: Record<FactionId, [string, string, string]> = {
  SOLARI: [
    'card_solari_crest_of_the_sun',
    'card_solari_sunforge_anvil',
    'card_solari_aegis_of_the_sun',
  ],
  TERRA: [
    'card_terra_bramble_armor',
    'card_terra_grove_sanctuary',
    'card_terra_heart_of_the_forest',
  ],
  UMBRI: [
    'card_umbri_altar_of_sacrifice',
    'card_umbri_void_prism',
    'card_umbri_void_gate',
  ],
  AETHER: [
    'card_aether_mana_crystal',
    'card_aether_book_of_secrets',
    'card_aether_mirror_shield',
  ],
};

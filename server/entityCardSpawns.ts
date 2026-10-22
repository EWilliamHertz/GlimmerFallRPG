import { FactionId, NpcEntity } from '../shared/types';
import { NEON_TCG_CARDS, NeonTcgCard } from '../shared/tcgNeonRegistry';

export interface EntityCardSpawnSpec {
  cardId: string;
  name: string;
  factionId: FactionId;
  cardCost: number;
  cardPower: number;
  cardHealth: number;
  cardKeywords: string;
  cardRarity: string;
  npcType: NpcEntity['npcType'];
  level: number;
  tier: 1 | 2 | 3 | 4 | 5;
  title: string;
  modelId: string;
  isHostile: boolean;
  isVoidIncursion?: boolean;
  x: number;
  y: number;
  maxHp: number;
  baseDamage: number;
  swingTimerMs: number;
  castAbilityName: string;
  castCooldownMs: number;
  xpReward: number;
  dialogue?: string;
}

const SPAWN_LAYOUT: Record<
  string,
  {
    modelId: string;
    x: number;
    y: number;
    castAbility: string;
    castCd: number;
    swingTimerMs?: number;
    npcType?: NpcEntity['npcType'];
    level?: number;
    tier?: 1 | 2 | 3 | 4 | 5;
    isHostile?: boolean;
  }
> = {
  // SOLARI (15 Entities) — North-East Quadrant
  'Luminous Wisp': { modelId: '/assets/crystal.glb', x: 48, y: -36, castAbility: 'Luminous Flash', castCd: 8000, level: 2, tier: 1 },
  'Solari Charger': { modelId: '/models/heroes/solari_paladin.glb', x: 64, y: -48, castAbility: 'Sun Charge', castCd: 6500, level: 3, tier: 1 },
  'Lightsworn Archer': { modelId: '/assets/soldier.glb', x: 82, y: -64, castAbility: 'Radiant Arrow', castCd: 7000, level: 8, tier: 2 },
  'Solari Vanguard': { modelId: '/models/heroes/solari_paladin.glb', x: 96, y: -80, castAbility: 'Solar Bulwark', castCd: 8000, level: 10, tier: 2 },
  'Sunfire Zealot': { modelId: '/models/heroes/solari_cleric.glb', x: 110, y: -92, castAbility: 'Sunfire Blade', castCd: 5000, level: 11, tier: 2 },
  'Dawnbreaker Paladin': { modelId: '/models/heroes/solari_paladin.glb', x: 125, y: -110, castAbility: 'Dawnbreaker Cleave', castCd: 7500, level: 18, tier: 2 },
  'Solari Spellblade': { modelId: '/models/heroes/solari_paladin.glb', x: 140, y: -125, castAbility: 'Radiant Spellstrike', castCd: 6000, level: 17, tier: 2 },
  'Solari Standard Bearer': { modelId: '/models/heroes/solari_paladin.glb', x: 152, y: -140, castAbility: 'Banner of the Sun', castCd: 8500, level: 19, tier: 2 },
  'Sun-Kissed Priest': { modelId: '/models/heroes/solari_cleric.glb', x: 135, y: -155, castAbility: 'Solar Restoration', castCd: 7000, level: 16, tier: 2 },
  'Auric Elemental': { modelId: '/models/monsters/solari_golem.glb', x: 168, y: -165, castAbility: 'Auric Conflagration', castCd: 8000, level: 27, tier: 3 },
  'Gilded Griffin': { modelId: '/assets/parrot.glb', x: 185, y: -145, castAbility: 'Aerial Talon Strike', castCd: 7000, level: 29, tier: 3 },
  'Golden Lion': { modelId: '/models/monsters/solari_warden.glb', x: 205, y: -160, castAbility: 'Lionhearted Roar', castCd: 7500, level: 31, tier: 3 },
  'Solari Inquisitor': { modelId: '/models/monsters/solari_colossus.glb', x: 195, y: -195, castAbility: 'Judicial Cleave', castCd: 6500, level: 33, tier: 3 },
  'Morningstar Knight': { modelId: '/models/monsters/solari_emperor.glb', x: 220, y: -215, castAbility: 'Morningstar Slam', castCd: 8000, level: 45, tier: 4 },
  'Blazing Seraph': { modelId: '/models/monsters/solari_boss.glb', x: 180, y: -180, castAbility: 'Seraphic Supernova', castCd: 9000, npcType: 'ELITE_BOSS', level: 60, tier: 5 },

  // TERRA (16 Entities) — South-East Quadrant
  'Terra Forager': { modelId: '/models/heroes/terra_weaver.glb', x: 48, y: 36, castAbility: 'Bramble Toss', castCd: 8000, level: 2, tier: 1 },
  'Terra Sapling': { modelId: '/models/monsters/terra_mob.glb', x: 64, y: 48, castAbility: 'Bark Sprout', castCd: 9000, level: 3, tier: 1 },
  'Terra Boar': { modelId: '/assets/soldier.glb', x: 82, y: 64, castAbility: 'Furious Gore', castCd: 6000, level: 7, tier: 2 },
  'Terra Druid': { modelId: '/models/heroes/terra_weaver.glb', x: 96, y: 80, castAbility: 'Verdant Seed Sprout', castCd: 7000, level: 9, tier: 2 },
  'Terra Stag': { modelId: '/assets/parrot.glb', x: 110, y: 92, castAbility: 'Horn Charge', castCd: 6500, level: 10, tier: 2 },
  'Beastmaster': { modelId: '/models/heroes/terra_juggernaut.glb', x: 125, y: 110, castAbility: 'Call of the Wild', castCd: 8000, level: 16, tier: 2 },
  'Giant Spider': { modelId: '/assets/spider.glb', x: 140, y: 125, castAbility: 'Poison Web Spit', castCd: 6000, level: 18, tier: 2 },
  'Grizzly Bear': { modelId: '/models/monsters/terra_mob.glb', x: 152, y: 140, castAbility: 'Bear Maul', castCd: 7000, level: 20, tier: 2 },
  'Terra Ranger': { modelId: '/models/heroes/terra_weaver.glb', x: 135, y: 155, castAbility: 'Thorn Volley', castCd: 7500, level: 19, tier: 2 },
  'Stone Golem': { modelId: '/models/heroes/terra_juggernaut.glb', x: 168, y: 165, castAbility: 'Tectonic Slam', castCd: 8500, level: 28, tier: 3 },
  'Terra Warden': { modelId: '/models/heroes/terra_juggernaut.glb', x: 185, y: 145, castAbility: 'Rootbound Entangle', castCd: 8000, level: 32, tier: 3 },
  'Terra Basilisk': { modelId: '/models/monsters/terra_mob.glb', x: 205, y: 160, castAbility: 'Petrifying Gaze', castCd: 7000, level: 38, tier: 3 },
  'Terra Treant': { modelId: '/models/monsters/terra_mob.glb', x: 195, y: 195, castAbility: 'Ironwood Stomp', castCd: 8500, level: 42, tier: 4 },
  'Terra Elemental': { modelId: '/models/monsters/terra_mob.glb', x: 210, y: 210, castAbility: 'Earthquake Tremor', castCd: 9000, level: 50, tier: 4 },
  'Terra Ancient': { modelId: '/models/monsters/terra_boss.glb', x: 225, y: 225, castAbility: 'World-Tree Cataclysm', castCd: 9500, level: 56, tier: 5 },
  'Terra Chimera': { modelId: '/models/monsters/terra_boss.glb', x: 180, y: 180, castAbility: 'Primal Chimera Rampage', castCd: 9000, npcType: 'ELITE_BOSS', level: 60, tier: 5 },

  // UMBRI (14 Entities) — South-West Quadrant
  'Voidling': { modelId: '/assets/spider.glb', x: -48, y: 36, castAbility: 'Void Nibble', castCd: 7000, level: 2, tier: 1 },
  'Umbri Cultist': { modelId: '/models/heroes/umbri_warlock.glb', x: -64, y: 48, castAbility: 'Blood Sacraments', castCd: 7500, level: 7, tier: 2 },
  'Umbri Shade': { modelId: '/assets/skeleton_warrior.glb', x: -82, y: 64, castAbility: 'Shadow Fade', castCd: 6500, level: 9, tier: 2 },
  'Void Spawn': { modelId: '/models/monsters/umbri_mob.glb', x: -96, y: 80, castAbility: 'Abyssal Chomp', castCd: 6500, level: 11, tier: 2 },
  'Shadow Assassin': { modelId: '/models/heroes/umbri_nightblade.glb', x: -125, y: 110, castAbility: 'Arterial Sever', castCd: 5500, level: 18, tier: 2 },
  'Umbri Bloodmage': { modelId: '/models/heroes/umbri_warlock.glb', x: -140, y: 125, castAbility: 'Crimson Transfusion', castCd: 7000, level: 17, tier: 2 },
  'Umbri Wraith': { modelId: '/assets/skeleton_mage.glb', x: -152, y: 140, castAbility: 'Wailing Screech', castCd: 6500, level: 19, tier: 2 },
  'Nightmare Weaver': { modelId: '/models/monsters/umbri_matron.glb', x: -168, y: 165, castAbility: 'Nightmare Web', castCd: 8000, level: 28, tier: 3 },
  'Soul Reaper': { modelId: '/models/monsters/umbri_executioner.glb', x: -185, y: 145, castAbility: 'Soul Harvest Slash', castCd: 6500, level: 31, tier: 3 },
  'Umbri Stalker': { modelId: '/models/heroes/umbri_nightblade.glb', x: -135, y: 155, castAbility: 'Shadow Pounce', castCd: 6000, level: 33, tier: 3 },
  'Abyssal Horror': { modelId: '/models/monsters/umbri_golem.glb', x: -205, y: 160, castAbility: 'Abyssal Maw Crush', castCd: 8000, level: 44, tier: 4 },
  'Shadow Behemoth': { modelId: '/models/monsters/umbri_malakor.glb', x: -195, y: 195, castAbility: 'Dusk Titan Cleave', castCd: 8500, level: 52, tier: 4 },
  'Umbri Overlord': { modelId: '/models/monsters/umbri_boss.glb', x: -210, y: 210, castAbility: 'Oblivion Strike', castCd: 9000, level: 57, tier: 5 },
  'Void Leviathan': { modelId: '/models/monsters/umbri_boss.glb', x: -180, y: 180, castAbility: 'Black Hole Singularity', castCd: 8500, npcType: 'ELITE_BOSS', level: 60, tier: 5 },

  // AETHER (15 Entities) — North-West Quadrant
  'Aether Familiar': { modelId: '/assets/crystal.glb', x: -48, y: -36, castAbility: 'Mana Bolt', castCd: 7000, level: 2, tier: 1 },
  'Aether Sprite': { modelId: '/assets/wasp.glb', x: -64, y: -48, castAbility: 'Temporal Dart', castCd: 6500, level: 3, tier: 1 },
  'Aether Scholar': { modelId: '/models/heroes/aether_mage.glb', x: -82, y: -64, castAbility: 'Arcane Glyphs', castCd: 7000, level: 8, tier: 2 },
  'Aether Weaver': { modelId: '/models/heroes/aether_spellweaver.glb', x: -96, y: -80, castAbility: 'Leyline Thread', castCd: 6000, level: 10, tier: 2 },
  'Aether Mage': { modelId: '/models/heroes/aether_mage.glb', x: -125, y: -110, castAbility: 'Arcane Barrage', castCd: 6500, level: 16, tier: 2 },
  'Aether Sniper': { modelId: '/models/heroes/aether_spellweaver.glb', x: -140, y: -125, castAbility: 'Chrono Sniper Shot', castCd: 7000, level: 19, tier: 2 },
  'Aether Warden': { modelId: '/models/heroes/aether_spellweaver.glb', x: -152, y: -140, castAbility: 'Astral Barrier', castCd: 8000, level: 21, tier: 2 },
  'Aether Channeler': { modelId: '/models/heroes/aether_mage.glb', x: -168, y: -165, castAbility: 'Mana Channel Pulse', castCd: 8000, level: 27, tier: 3 },
  'Aether Elemental': { modelId: '/models/monsters/aether_mob.glb', x: -185, y: -145, castAbility: 'Vortex Blast', castCd: 7000, level: 30, tier: 3 },
  'Aether Illusionist': { modelId: '/models/heroes/aether_spellweaver.glb', x: -135, y: -155, castAbility: 'Mirage Clone Pulse', castCd: 6500, level: 32, tier: 3 },
  'Aether Golem': { modelId: '/models/monsters/nexus_colossus.glb', x: -205, y: -160, castAbility: 'Runic Gravity Slam', castCd: 8500, level: 43, tier: 4 },
  'Aether Serpent': { modelId: '/assets/parrot.glb', x: -195, y: -195, castAbility: 'Celestial Constriction', castCd: 6500, level: 46, tier: 4 },
  'Aether Drake': { modelId: '/models/monsters/aether_mob.glb', x: -210, y: -210, castAbility: 'Astral Fire Breath', castCd: 8000, level: 51, tier: 4 },
  'Aether Sphinx': { modelId: '/models/monsters/aether_boss.glb', x: -225, y: -225, castAbility: 'Riddle of the Void', castCd: 9000, level: 57, tier: 5 },
  'Aether Leviathan': { modelId: '/models/monsters/aether_boss.glb', x: -180, y: -180, castAbility: 'Cosmic Singularity Fracture', castCd: 9000, npcType: 'ELITE_BOSS', level: 60, tier: 5 },
};

function buildEntitySpawnList(): EntityCardSpawnSpec[] {
  const dbEntities = NEON_TCG_CARDS.filter((c) => c.cardType === 'Entity');
  const spawns: EntityCardSpawnSpec[] = [];

  for (const card of dbEntities) {
    const layout = SPAWN_LAYOUT[card.name];
    if (!layout) continue;

    const P = card.power ?? 1;
    const H = card.health ?? 1;
    const C = card.cost;
    const factionId = card.faction.toUpperCase() as FactionId;

    let maxHp = 1000;
    let baseDamage = 30;
    let xpReward = 100;

    if (C === 1) {
      maxHp = Math.round(H * 380 + P * 40);
      baseDamage = Math.round(P * 12 + 6);
      xpReward = 75;
    } else if (C === 2) {
      maxHp = Math.round(H * 750 + P * 120);
      baseDamage = Math.round(P * 22 + 12);
      xpReward = 230;
    } else if (C === 3) {
      maxHp = Math.round(H * 1500 + P * 250);
      baseDamage = Math.round(P * 34 + 18);
      xpReward = 420;
    } else if (C === 4) {
      maxHp = Math.round(H * 2900 + P * 450);
      baseDamage = Math.round(P * 46 + 25);
      xpReward = 820;
    } else if (C === 5) {
      maxHp = Math.round(H * 4800 + P * 800);
      baseDamage = Math.round(P * 55 + 40);
      xpReward = 1450;
    } else if (C === 6) {
      maxHp = Math.round(H * 7000 + P * 1200);
      baseDamage = Math.round(P * 62 + 50);
      xpReward = 1950;
    } else if (C === 7) {
      maxHp = card.name === 'Blazing Seraph' ? 195000 : Math.round(H * 12000 + P * 2500);
      baseDamage = card.name === 'Blazing Seraph' ? 560 : Math.round(P * 65 + 60);
      xpReward = card.name === 'Blazing Seraph' ? 5000 : 3400;
    } else if (C >= 8) {
      if (card.name === 'Terra Chimera') {
        maxHp = 215000;
        baseDamage = 640;
      } else if (card.name === 'Void Leviathan') {
        maxHp = 240000;
        baseDamage = 720;
      } else {
        maxHp = 210000;
        baseDamage = 660;
      }
      xpReward = 5000;
    }

    const isBoss = layout.npcType === 'ELITE_BOSS' || C >= 8 || card.name === 'Blazing Seraph';
    const kwText = card.keywords && card.keywords !== 'None' ? ` • ${card.keywords}` : '';
    const title = isBoss
      ? `★ [Cost ${C} • ${P}/${H}${kwText}] MYTHIC ${factionId} WORLD BOSS ★`
      : C >= 7
      ? `[Cost ${C} • ${P}/${H}${kwText}] ${card.rarity} Warzone Champion`
      : `[Cost ${C} • ${P}/${H}${kwText}] Glimmerfall TCG Entity`;

    spawns.push({
      cardId: card.id,
      name: card.name,
      factionId,
      cardCost: C,
      cardPower: P,
      cardHealth: H,
      cardKeywords: card.keywords ?? 'None',
      cardRarity: card.rarity ?? 'Common',
      npcType: isBoss ? 'ELITE_BOSS' : layout.npcType ?? 'WARZONE_MOB',
      level: layout.level ?? (isBoss ? 60 : Math.min(60, C * 7 + 4)),
      tier: layout.tier ?? (isBoss ? 5 : (Math.min(5, Math.ceil(C / 1.6)) as 1 | 2 | 3 | 4 | 5)),
      title,
      modelId: layout.modelId,
      isHostile: layout.isHostile ?? true,
      isVoidIncursion: card.name.startsWith('Void ') || card.name === 'Voidling',
      x: layout.x,
      y: layout.y,
      maxHp,
      baseDamage,
      swingTimerMs: layout.swingTimerMs ?? (isBoss ? 2200 : 2000),
      castAbilityName: layout.castAbility,
      castCooldownMs: layout.castCd,
      xpReward,
      dialogue: card.description !== 'None' ? card.description : undefined,
    });
  }

  return spawns;
}

export const ENTITY_CARD_SPAWNS: EntityCardSpawnSpec[] = buildEntitySpawnList();

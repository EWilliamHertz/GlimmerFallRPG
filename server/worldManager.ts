import {
  ActiveInstanceSummary,
  EntityBase,
  FactionId,
  GroundZone,
  InstanceTemplateId,
  NpcEntity,
  PlayerEntity,
  RelicNodeEntity,
  ThreatTable,
} from '../shared/types';
import { FACTIONS_REGISTRY, TCG_RELIC_CARDS } from '../shared/factionsRegistry';
import { INSTANCES_REGISTRY } from '../shared/instancesRegistry';
import { ENTITY_CARD_SPAWNS } from './entityCardSpawns';

export class SpatialGrid {
  private cellSize: number;
  private buckets: Map<string, Set<string>> = new Map();

  constructor(cellSize = 20) {
    this.cellSize = cellSize;
  }

  private getKey(instanceId: string, cx: number, cy: number): string {
    return `${instanceId}:${cx},${cy}`;
  }

  public clear(): void {
    this.buckets.clear();
  }

  public insert(entity: EntityBase): void {
    const cx = Math.floor(entity.x / this.cellSize);
    const cy = Math.floor(entity.y / this.cellSize);
    const key = this.getKey(entity.instanceId, cx, cy);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new Set();
      this.buckets.set(key, bucket);
    }
    bucket.add(entity.id);
  }

  public queryRadius(instanceId: string, x: number, y: number, radius: number): Set<string> {
    const result = new Set<string>();
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this.buckets.get(this.getKey(instanceId, cx, cy));
        if (bucket) {
          for (const id of bucket) {
            result.add(id);
          }
        }
      }
    }
    return result;
  }
}

export class WorldManager {
  public players: Map<string, PlayerEntity> = new Map();
  public npcs: Map<string, NpcEntity> = new Map();
  public threatTables: Map<string, ThreatTable> = new Map();
  public groundZones: Map<string, GroundZone> = new Map();
  public relicNodes: Map<string, RelicNodeEntity> = new Map();
  public instances: Map<string, ActiveInstanceSummary> = new Map();
  public spatialGrid: SpatialGrid = new SpatialGrid(20);

  public readonly sanctuaryRadiusYards = 26;
  private instanceSeq = 1;

  constructor() {
    this.instances.set('open_world_nexus', {
      instanceId: 'open_world_nexus',
      templateId: 'open_world_nexus',
      name: 'Glimmerfall Expanse (Open World)',
      category: 'OPEN_WORLD',
      objectiveText: 'Explore the 4 Faction Biomes, harvest TCG Relic Nodes, or press [I] for Dungeons & PvP',
      bossesDefeated: 0,
      totalBosses: 4,
      solariScore: 0,
      umbriScore: 0,
      isCompleted: false,
    });
    this.seedOpenWorldEntities();
  }

  public isInsideSanctuary(x: number, y: number, instanceId = 'open_world_nexus'): boolean {
    if (instanceId !== 'open_world_nexus') return false;
    // Central Sanctuary Hub
    if (Math.hypot(x, y) <= this.sanctuaryRadiusYards) return true;
    // 4 Faction Home Bases & Sanctuary Strongholds (22-yard protection bubble around each base)
    if (Math.hypot(x - 22, y - (-22)) <= 22) return true; // Solari Dawn Citadel
    if (Math.hypot(x - 22, y - 22) <= 22) return true;    // Terra Rootdeep Grove
    if (Math.hypot(x - (-22), y - 22) <= 22) return true; // Umbri Duskveil Haven
    if (Math.hypot(x - (-22), y - (-22)) <= 22) return true; // Aether Astral Conclave
    return false;
  }

  public rebuildSpatialIndex(): void {
    this.spatialGrid.clear();
    for (const player of this.players.values()) {
      if (!player.isDead) {
        this.spatialGrid.insert(player);
      }
    }
    for (const npc of this.npcs.values()) {
      if (!npc.isDead) {
        this.spatialGrid.insert(npc);
      }
    }
  }

  public getEntitiesWithinRadius(
    x: number,
    y: number,
    radiusYards: number,
    instanceId = 'open_world_nexus'
  ): EntityBase[] {
    const r2 = radiusYards * radiusYards;
    const matches: EntityBase[] = [];
    for (const p of this.players.values()) {
      if (!p.isDead && p.instanceId === instanceId) {
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy <= r2) {
          matches.push(p);
        }
      }
    }
    for (const n of this.npcs.values()) {
      if (!n.isDead && n.instanceId === instanceId) {
        const dx = n.x - x;
        const dy = n.y - y;
        if (dx * dx + dy * dy <= r2) {
          matches.push(n);
        }
      }
    }
    return matches;
  }

  public createInstanceRoom(templateId: InstanceTemplateId, now: number): string {
    const def = INSTANCES_REGISTRY[templateId];
    const slug =
      templateId === 'dungeon_sunspire_vaults'
        ? 'dungeon_sunspire'
        : templateId === 'dungeon_duskveil_catacombs'
        ? 'dungeon_duskveil'
        : templateId === 'bg_aether_rift_basin'
        ? 'bg_aether_rift'
        : 'bg_glimmerfall_arena';

    const instanceId = `${slug}_${this.instanceSeq++}`;
    this.instances.set(instanceId, {
      instanceId,
      templateId,
      name: def.name,
      category: def.category,
      objectiveText:
        def.category === 'PVE_DUNGEON'
          ? `Defeat all ${def.bosses.length} Dungeon Bosses (0/${def.bosses.length})`
          : `Eliminate Opposing Faction Champions (0/${def.bosses.length})`,
      bossesDefeated: 0,
      totalBosses: def.bosses.length,
      solariScore: 0,
      umbriScore: 0,
      isCompleted: false,
    });

    // Spawn instance bosses & guards
    def.bosses.forEach((bossSpec, idx) => {
      this.createNpc({
        id: `${instanceId}_${bossSpec.id}`,
        instanceId,
        name: bossSpec.name,
        title: bossSpec.title,
        modelId: bossSpec.modelId,
        npcType: 'ELITE_BOSS',
        factionId: bossSpec.factionId,
        isHostile: true,
        x: bossSpec.x,
        y: bossSpec.y,
        maxHp: bossSpec.maxHp,
        baseDamage: bossSpec.baseDamage,
        swingTimerMs: 2200,
        castAbilityName: bossSpec.castAbilityName,
        castCooldownMs: 9000 + idx * 1200,
        now,
      });
    });

    // Also spawn a friendly healing spirit near the entrance
    const spirit = this.createNpc({
      id: `${instanceId}_ally_spirit`,
      instanceId,
      name: 'Sanctuary Lightbearer',
      title: 'Friendly Party Anchor',
      modelId: '/models/heroes/solari_cleric.glb',
      npcType: 'ALLY_SPIRIT',
      factionId: def.factionTheme,
      isHostile: false,
      x: def.spawnPoint.x - 4,
      y: def.spawnPoint.y - 4,
      maxHp: 42000,
      baseDamage: 0,
      swingTimerMs: 0,
      now,
    });
    spirit.hp = 24000;

    return instanceId;
  }

  public updateInstanceProgress(instanceId: string): void {
    const inst = this.instances.get(instanceId);
    if (!inst || instanceId === 'open_world_nexus') return;

    const def = INSTANCES_REGISTRY[inst.templateId];
    let bossesAlive = 0;
    let bossesDead = 0;

    for (const npc of this.npcs.values()) {
      if (npc.instanceId === instanceId && npc.npcType === 'ELITE_BOSS') {
        if (npc.isDead) {
          bossesDead++;
        } else {
          bossesAlive++;
        }
      }
    }

    inst.bossesDefeated = bossesDead;
    inst.solariScore = bossesDead * 100;

    if (bossesDead >= inst.totalBosses && inst.totalBosses > 0 && !inst.isCompleted) {
      inst.isCompleted = true;
      inst.completionRewardText = def.rewardSummary;
      inst.objectiveText = `🏆 VICTORY! ${def.rewardSummary} — Click [Leave Instance] or press [I] to return to Open World!`;
      for (const p of this.players.values()) {
        if (p.instanceId === instanceId && !p.isAiCompanion) {
          p.currentXp = (p.currentXp || 0) + 2000;
        }
      }
    } else if (!inst.isCompleted) {
      inst.objectiveText =
        def.category === 'PVE_DUNGEON'
          ? `Dungeon Objective: Defeat Bosses (${bossesDead}/${inst.totalBosses})`
          : `Battleground Objective: Defeat Enemy Champions (${bossesDead}/${inst.totalBosses})`;
    }
  }

  public cleanupEmptyInstance(instanceId: string): void {
    if (instanceId === 'open_world_nexus') return;
    const hasHuman = Array.from(this.players.values()).some(
      (p) => p.instanceId === instanceId && !p.isAiCompanion
    );
    if (hasHuman) return;

    // Remove AI companions, NPCs, and ground zones for this instance
    for (const [pid, p] of this.players.entries()) {
      if (p.instanceId === instanceId && p.isAiCompanion) {
        this.players.delete(pid);
      }
    }
    for (const [nid, n] of this.npcs.entries()) {
      if (n.instanceId === instanceId) {
        this.npcs.delete(nid);
        this.threatTables.delete(nid);
      }
    }
    for (const [zid, z] of this.groundZones.entries()) {
      if (z.instanceId === instanceId) {
        this.groundZones.delete(zid);
      }
    }
    this.instances.delete(instanceId);
  }

  private seedOpenWorldEntities(): void {
    const now = Date.now();
    const instanceId = 'open_world_nexus';

    // 1. THE NEXUS SPIRE TRAINING ARENA (North of Sanctuary Center)
    this.createNpc({
      id: 'npc_dummy_raidboss',
      instanceId,
      name: 'Grand Nexus Raid Construct',
      title: 'Lv. 60 Mythic Target Dummy',
      modelId: '/models/monsters/nexus_colossus.glb',
      npcType: 'TRAINING_DUMMY',
      factionId: 'AETHER',
      isHostile: true,
      x: 0,
      y: -18,
      maxHp: 250000,
      baseDamage: 0,
      swingTimerMs: 0,
      now,
    });

    this.createNpc({
      id: 'npc_dummy_cleave_left',
      instanceId,
      name: 'Cleave Construct Alpha',
      title: 'AoE Training Dummy',
      modelId: '/models/monsters/umbri_golem.glb',
      npcType: 'TRAINING_DUMMY',
      factionId: 'UMBRI',
      isHostile: true,
      x: -6,
      y: -17,
      maxHp: 120000,
      baseDamage: 0,
      swingTimerMs: 0,
      now,
    });

    this.createNpc({
      id: 'npc_dummy_cleave_right',
      instanceId,
      name: 'Cleave Construct Beta',
      title: 'AoE Training Dummy',
      modelId: '/models/monsters/solari_golem.glb',
      npcType: 'TRAINING_DUMMY',
      factionId: 'SOLARI',
      isHostile: true,
      x: 6,
      y: -17,
      maxHp: 120000,
      baseDamage: 0,
      swingTimerMs: 0,
      now,
    });

    // Wounded Friendly Spirit for Healers
    const allySpirit = this.createNpc({
      id: 'npc_ally_wounded_templar',
      instanceId,
      name: 'Wounded Nexus Vanguard',
      title: 'Friendly Healing Target',
      modelId: '/models/heroes/solari_paladin.glb',
      npcType: 'ALLY_SPIRIT',
      factionId: 'SOLARI',
      isHostile: false,
      x: -9,
      y: -7,
      maxHp: 35000,
      baseDamage: 0,
      swingTimerMs: 0,
      now,
    });
    allySpirit.hp = 14000;

    // ==========================================
    // 2. FACTION HOME BASES & SANCTUARY STRONGHOLDS
    // ==========================================

    // --- AETHER: Astral Conclave Stronghold ((-22, -22)) ---
    this.createNpc({
      id: 'npc_aether_leader',
      instanceId,
      name: 'Archon Zephyr',
      title: 'Grand Chronosavant • Sovereign of the Conclave',
      level: 60,
      tier: 5,
      modelId: '/models/heroes/aether_mage.glb',
      npcType: 'FACTION_LEADER',
      factionId: 'AETHER',
      isHostile: false,
      x: -22,
      y: -22,
      maxHp: 200000,
      baseDamage: 500,
      swingTimerMs: 2000,
      castAbilityName: 'Singularity Burst',
      castCooldownMs: 6000,
      now,
    });

    this.createNpc({
      id: 'npc_aether_quartermaster',
      instanceId,
      name: 'Scholar Lyra',
      title: 'Astral Relic Archivist & Provisioner',
      level: 60,
      tier: 4,
      modelId: '/models/heroes/aether_spellweaver.glb',
      npcType: 'QUARTERMASTER',
      factionId: 'AETHER',
      isHostile: false,
      x: -25,
      y: -20,
      maxHp: 85000,
      baseDamage: 0,
      swingTimerMs: 0,
      now,
    });

    this.createNpc({
      id: 'npc_aether_guard_1',
      instanceId,
      name: 'Conclave Sentinel Kaelen',
      title: 'Aether Stronghold Ley-Warden',
      level: 60,
      tier: 4,
      modelId: '/models/heroes/aether_spellweaver.glb',
      npcType: 'BASE_GUARD',
      factionId: 'AETHER',
      isHostile: false,
      x: -19,
      y: -24,
      maxHp: 95000,
      baseDamage: 420,
      swingTimerMs: 1800,
      castAbilityName: 'Arcane Cleave',
      castCooldownMs: 5000,
      now,
    });

    this.createNpc({
      id: 'npc_aether_guard_2',
      instanceId,
      name: 'Conclave Sentinel Varis',
      title: 'Aether Stronghold Ley-Warden',
      level: 60,
      tier: 4,
      modelId: '/models/heroes/aether_spellweaver.glb',
      npcType: 'BASE_GUARD',
      factionId: 'AETHER',
      isHostile: false,
      x: -24,
      y: -19,
      maxHp: 95000,
      baseDamage: 420,
      swingTimerMs: 1800,
      castAbilityName: 'Arcane Cleave',
      castCooldownMs: 5000,
      now,
    });

    this.createNpc({
      id: 'npc_aether_dummy',
      instanceId,
      name: 'Astral Resonance Dummy',
      title: 'Aether Practice Construct',
      modelId: '/models/monsters/aether_golem.glb',
      npcType: 'TRAINING_DUMMY',
      factionId: 'AETHER',
      isHostile: true,
      x: -17,
      y: -17,
      maxHp: 180000,
      baseDamage: 0,
      swingTimerMs: 0,
      now,
    });

    // --- SOLARI: Sunspire Dawn Citadel ((22, -22)) ---
    this.createNpc({
      id: 'npc_solari_leader',
      instanceId,
      name: 'High Priestess Alyssa',
      title: 'Dawn Matriarch of the Sunspire',
      level: 60,
      tier: 5,
      modelId: '/models/heroes/solari_cleric.glb',
      npcType: 'FACTION_LEADER',
      factionId: 'SOLARI',
      isHostile: false,
      x: 22,
      y: -22,
      maxHp: 200000,
      baseDamage: 480,
      swingTimerMs: 2000,
      castAbilityName: 'Solar Wrath',
      castCooldownMs: 6000,
      now,
    });

    this.createNpc({
      id: 'npc_solari_quartermaster',
      instanceId,
      name: 'Justiciar Brandon',
      title: 'Sunforged Armorer & Quartermaster',
      level: 60,
      tier: 4,
      modelId: '/models/heroes/solari_paladin.glb',
      npcType: 'QUARTERMASTER',
      factionId: 'SOLARI',
      isHostile: false,
      x: 25,
      y: -20,
      maxHp: 85000,
      baseDamage: 0,
      swingTimerMs: 0,
      now,
    });

    this.createNpc({
      id: 'npc_solari_guard_1',
      instanceId,
      name: 'Sunspire Knight Thorne',
      title: 'Dawn Citadel Templar',
      level: 60,
      tier: 4,
      modelId: '/models/heroes/solari_paladin.glb',
      npcType: 'BASE_GUARD',
      factionId: 'SOLARI',
      isHostile: false,
      x: 19,
      y: -24,
      maxHp: 95000,
      baseDamage: 420,
      swingTimerMs: 1800,
      castAbilityName: 'Solar Cleave',
      castCooldownMs: 5000,
      now,
    });

    this.createNpc({
      id: 'npc_solari_guard_2',
      instanceId,
      name: 'Sunspire Knight Ronald',
      title: 'Dawn Citadel Templar',
      level: 60,
      tier: 4,
      modelId: '/models/heroes/solari_paladin.glb',
      npcType: 'BASE_GUARD',
      factionId: 'SOLARI',
      isHostile: false,
      x: 24,
      y: -19,
      maxHp: 95000,
      baseDamage: 420,
      swingTimerMs: 1800,
      castAbilityName: 'Solar Cleave',
      castCooldownMs: 5000,
      now,
    });

    // --- TERRA: Rootdeep Grove Sanctuary ((22, 22)) ---
    this.createNpc({
      id: 'npc_terra_leader',
      instanceId,
      name: 'Arch-Druid Kieran',
      title: 'Heart of the World-Tree',
      level: 60,
      tier: 5,
      modelId: '/models/heroes/terra_weaver.glb',
      npcType: 'FACTION_LEADER',
      factionId: 'TERRA',
      isHostile: false,
      x: 22,
      y: 22,
      maxHp: 200000,
      baseDamage: 460,
      swingTimerMs: 2000,
      castAbilityName: 'Overgrowth Storm',
      castCooldownMs: 6000,
      now,
    });

    this.createNpc({
      id: 'npc_terra_quartermaster',
      instanceId,
      name: 'Woodwarden Elara',
      title: 'Grove Provisioner & Herbalist',
      level: 60,
      tier: 4,
      modelId: '/models/heroes/terra_weaver.glb',
      npcType: 'QUARTERMASTER',
      factionId: 'TERRA',
      isHostile: false,
      x: 25,
      y: 20,
      maxHp: 85000,
      baseDamage: 0,
      swingTimerMs: 0,
      now,
    });

    this.createNpc({
      id: 'npc_terra_guard_1',
      instanceId,
      name: 'Stone-Warden Burl',
      title: 'Rootdeep Enforcer',
      level: 60,
      tier: 4,
      modelId: '/models/heroes/terra_juggernaut.glb',
      npcType: 'BASE_GUARD',
      factionId: 'TERRA',
      isHostile: false,
      x: 19,
      y: 24,
      maxHp: 95000,
      baseDamage: 420,
      swingTimerMs: 1800,
      castAbilityName: 'Tectonic Cleave',
      castCooldownMs: 5000,
      now,
    });

    this.createNpc({
      id: 'npc_terra_guard_2',
      instanceId,
      name: 'Stone-Warden Flint',
      title: 'Rootdeep Enforcer',
      level: 60,
      tier: 4,
      modelId: '/models/heroes/terra_juggernaut.glb',
      npcType: 'BASE_GUARD',
      factionId: 'TERRA',
      isHostile: false,
      x: 24,
      y: 19,
      maxHp: 95000,
      baseDamage: 420,
      swingTimerMs: 1800,
      castAbilityName: 'Tectonic Cleave',
      castCooldownMs: 5000,
      now,
    });

    // --- UMBRI: Duskveil Shadow Haven ((-22, 22)) ---
    this.createNpc({
      id: 'npc_umbri_leader',
      instanceId,
      name: 'Shadow Sovereign Vesper',
      title: 'Grandmaster of the Syndicate',
      level: 60,
      tier: 5,
      modelId: '/models/heroes/umbri_assassin.glb',
      npcType: 'FACTION_LEADER',
      factionId: 'UMBRI',
      isHostile: false,
      x: -22,
      y: 22,
      maxHp: 200000,
      baseDamage: 520,
      swingTimerMs: 1700,
      castAbilityName: 'Shadowstep Flurry',
      castCooldownMs: 6000,
      now,
    });

    this.createNpc({
      id: 'npc_umbri_quartermaster',
      instanceId,
      name: 'Fence Corvo',
      title: 'Syndicate Black-Marketeer',
      level: 60,
      tier: 4,
      modelId: '/models/heroes/umbri_warlock.glb',
      npcType: 'QUARTERMASTER',
      factionId: 'UMBRI',
      isHostile: false,
      x: -25,
      y: 20,
      maxHp: 85000,
      baseDamage: 0,
      swingTimerMs: 0,
      now,
    });

    this.createNpc({
      id: 'npc_umbri_guard_1',
      instanceId,
      name: 'Death-Stalker Moros',
      title: 'Duskveil Shadowguard',
      level: 60,
      tier: 4,
      modelId: '/models/heroes/umbri_assassin.glb',
      npcType: 'BASE_GUARD',
      factionId: 'UMBRI',
      isHostile: false,
      x: -19,
      y: 24,
      maxHp: 95000,
      baseDamage: 430,
      swingTimerMs: 1700,
      castAbilityName: 'Poison Cleave',
      castCooldownMs: 5000,
      now,
    });

    this.createNpc({
      id: 'npc_umbri_guard_2',
      instanceId,
      name: 'Death-Stalker Vex',
      title: 'Duskveil Shadowguard',
      level: 60,
      tier: 4,
      modelId: '/models/heroes/umbri_assassin.glb',
      npcType: 'BASE_GUARD',
      factionId: 'UMBRI',
      isHostile: false,
      x: -24,
      y: 19,
      maxHp: 95000,
      baseDamage: 430,
      swingTimerMs: 1700,
      castAbilityName: 'Poison Cleave',
      castCooldownMs: 5000,
      now,
    });

    // ==============================================================
    // 3. TIER 1: SANCTUARY PERIMETER STARTER ZONE (LEVELS 1–5)
    // ==============================================================
    const starterMobs = [
      // Level 1 Mobs right outside Sanctuary Gates
      { id: 'npc_starter_wasp_1', name: 'Forest Wasp', title: '[Lv. 1] Glade Pest', level: 1, tier: 1 as const, x: 26, y: -8, maxHp: 220, baseDamage: 8, modelId: '/assets/wasp.glb', xpReward: 65, isBoss: false },
      { id: 'npc_starter_wasp_2', name: 'Forest Wasp', title: '[Lv. 1] Glade Pest', level: 1, tier: 1 as const, x: -26, y: 8, maxHp: 220, baseDamage: 8, modelId: '/assets/wasp.glb', xpReward: 65, isBoss: false },
      { id: 'npc_starter_spider_1', name: 'Burrower Spiderling', title: '[Lv. 1] Arachnid Scout', level: 1, tier: 1 as const, x: 12, y: 28, maxHp: 240, baseDamage: 9, modelId: '/assets/spider.glb', xpReward: 70, isBoss: false },
      { id: 'npc_starter_spider_2', name: 'Burrower Spiderling', title: '[Lv. 1] Arachnid Scout', level: 1, tier: 1 as const, x: -12, y: -28, maxHp: 240, baseDamage: 9, modelId: '/assets/spider.glb', xpReward: 70, isBoss: false },

      // Level 2 Mobs
      { id: 'npc_starter_scavenger_1', name: 'Border Scavenger Rogue', title: '[Lv. 2] Humanoid Thief', level: 2, tier: 1 as const, x: 34, y: 14, maxHp: 380, baseDamage: 14, modelId: '/assets/soldier.glb', xpReward: 95, isBoss: false },
      { id: 'npc_starter_scavenger_2', name: 'Border Scavenger Rogue', title: '[Lv. 2] Humanoid Thief', level: 2, tier: 1 as const, x: -34, y: -14, maxHp: 380, baseDamage: 14, modelId: '/assets/soldier.glb', xpReward: 95, isBoss: false },

      // Level 3 Mobs
      { id: 'npc_starter_skel_1', name: 'Skeletal Scout', title: '[Lv. 3] Undead Patrol', level: 3, tier: 1 as const, x: 42, y: -26, maxHp: 620, baseDamage: 22, modelId: '/assets/skeleton_warrior.glb', xpReward: 140, isBoss: false },
      { id: 'npc_starter_skel_2', name: 'Skeletal Scout', title: '[Lv. 3] Undead Patrol', level: 3, tier: 1 as const, x: -42, y: 26, maxHp: 620, baseDamage: 22, modelId: '/assets/skeleton_warrior.glb', xpReward: 140, isBoss: false },
      { id: 'npc_starter_ley_1', name: 'Astral Ley-Thief', title: '[Lv. 3] Rogue Mage', level: 3, tier: 1 as const, x: -28, y: -42, maxHp: 580, baseDamage: 25, modelId: '/assets/skeleton_mage.glb', xpReward: 150, isBoss: false },
      { id: 'npc_starter_ley_2', name: 'Astral Ley-Thief', title: '[Lv. 3] Rogue Mage', level: 3, tier: 1 as const, x: 28, y: 42, maxHp: 580, baseDamage: 25, modelId: '/assets/skeleton_mage.glb', xpReward: 150, isBoss: false },

      // Level 4 Mobs
      { id: 'npc_starter_knight_1', name: 'Renegade Knight', title: '[Lv. 4] Exiled Templar', level: 4, tier: 1 as const, x: 48, y: 18, maxHp: 860, baseDamage: 32, modelId: '/assets/knight.glb', xpReward: 185, isBoss: false },
      { id: 'npc_starter_knight_2', name: 'Renegade Knight', title: '[Lv. 4] Exiled Templar', level: 4, tier: 1 as const, x: -48, y: -18, maxHp: 860, baseDamage: 32, modelId: '/assets/knight.glb', xpReward: 185, isBoss: false },

      // Level 5 Mini-Boss
      { id: 'npc_starter_boss_1', name: 'Gorgar the Outlaw Chieftain', title: '[Lv. 5 Mini-Boss] Canyon Bandit Leader', level: 5, tier: 1 as const, x: 0, y: 56, maxHp: 2200, baseDamage: 55, modelId: '/assets/knight.glb', xpReward: 500, isBoss: true },
    ];

    for (const sm of starterMobs) {
      this.createNpc({
        id: sm.id,
        instanceId,
        name: sm.name,
        title: sm.title,
        level: sm.level,
        tier: sm.tier,
        xpReward: sm.xpReward,
        modelId: sm.modelId,
        npcType: sm.isBoss ? 'ELITE_BOSS' : 'WARZONE_MOB',
        factionId: 'AETHER',
        isHostile: true,
        isVoidIncursion: true,
        x: sm.x,
        y: sm.y,
        maxHp: sm.maxHp,
        baseDamage: sm.baseDamage,
        swingTimerMs: sm.isBoss ? 2000 : 2200,
        castAbilityName: sm.isBoss ? 'Outlaw Cleave' : 'Strike',
        castCooldownMs: 6000,
        now,
      });
    }

    // ==============================================================
    // 4. TIER 2: CONTESTED CROSSROAD VALLEY & MIXED FACTIONS (LEVELS 6–15)
    // ==============================================================
    const crossroadMobs = [
      { id: 'npc_cr_solari_1', name: 'Solari Dawn Vanguard', title: '[Lv. 7] Solari Skirmisher', level: 7, tier: 2 as const, factionId: 'SOLARI' as FactionId, x: 78, y: -35, maxHp: 1350, baseDamage: 42, modelId: '/models/heroes/solari_paladin.glb', xpReward: 240, isBoss: false },
      { id: 'npc_cr_solari_2', name: 'Solari Dawn Vanguard', title: '[Lv. 7] Solari Skirmisher', level: 7, tier: 2 as const, factionId: 'SOLARI' as FactionId, x: 88, y: -24, maxHp: 1350, baseDamage: 42, modelId: '/models/heroes/solari_paladin.glb', xpReward: 240, isBoss: false },
      { id: 'npc_cr_terra_1', name: 'Terra Bramble Ranger', title: '[Lv. 8] Terra Skirmisher', level: 8, tier: 2 as const, factionId: 'TERRA' as FactionId, x: 78, y: 35, maxHp: 1650, baseDamage: 48, modelId: '/models/heroes/terra_weaver.glb', xpReward: 280, isBoss: false },
      { id: 'npc_cr_terra_2', name: 'Terra Bramble Ranger', title: '[Lv. 8] Terra Skirmisher', level: 8, tier: 2 as const, factionId: 'TERRA' as FactionId, x: 88, y: 24, maxHp: 1650, baseDamage: 48, modelId: '/models/heroes/terra_weaver.glb', xpReward: 280, isBoss: false },
      { id: 'npc_cr_umbri_1', name: 'Umbri Nightblade Scout', title: '[Lv. 10] Umbri Skirmisher', level: 10, tier: 2 as const, factionId: 'UMBRI' as FactionId, x: -78, y: 35, maxHp: 2100, baseDamage: 62, modelId: '/models/heroes/umbri_nightblade.glb', xpReward: 340, isBoss: false },
      { id: 'npc_cr_umbri_2', name: 'Umbri Nightblade Scout', title: '[Lv. 10] Umbri Skirmisher', level: 10, tier: 2 as const, factionId: 'UMBRI' as FactionId, x: -88, y: 24, maxHp: 2100, baseDamage: 62, modelId: '/models/heroes/umbri_nightblade.glb', xpReward: 340, isBoss: false },
      { id: 'npc_cr_aether_1', name: 'Aether Ley-Disruptor', title: '[Lv. 12] Aether Skirmisher', level: 12, tier: 2 as const, factionId: 'AETHER' as FactionId, x: -78, y: -35, maxHp: 2600, baseDamage: 78, modelId: '/models/heroes/aether_spellweaver.glb', xpReward: 410, isBoss: false },
      { id: 'npc_cr_aether_2', name: 'Aether Ley-Disruptor', title: '[Lv. 12] Aether Skirmisher', level: 12, tier: 2 as const, factionId: 'AETHER' as FactionId, x: -88, y: -24, maxHp: 2600, baseDamage: 78, modelId: '/models/heroes/aether_spellweaver.glb', xpReward: 410, isBoss: false },
      { id: 'npc_cr_boss_1', name: 'Warlord Kraag of the Crossroads', title: '[Lv. 15 Mini-Boss] Contested Valley Overseer', level: 15, tier: 2 as const, factionId: 'SOLARI' as FactionId, x: 0, y: 95, maxHp: 5400, baseDamage: 120, modelId: '/assets/soldier.glb', xpReward: 750, isBoss: true },
    ];

    for (const cm of crossroadMobs) {
      this.createNpc({
        id: cm.id,
        instanceId,
        name: cm.name,
        title: cm.title,
        level: cm.level,
        tier: cm.tier,
        xpReward: cm.xpReward,
        modelId: cm.modelId,
        npcType: cm.isBoss ? 'ELITE_BOSS' : 'WARZONE_MOB',
        factionId: cm.factionId,
        isHostile: true,
        x: cm.x,
        y: cm.y,
        maxHp: cm.maxHp,
        baseDamage: cm.baseDamage,
        swingTimerMs: 2200,
        castAbilityName: 'Skirmish Thrust',
        castCooldownMs: 6500,
        now,
      });
    }

    // ==============================================================
    // 5. 60 OFFICIAL GLIMMERFALL TCG ENTITY CARDS POPULATED ACROSS THE 4 BIOMES
    // ==============================================================
    for (const spec of ENTITY_CARD_SPAWNS) {
      const isBoss = spec.npcType === "ELITE_BOSS";
      const entityId = isBoss
        ? `npc_boss_${spec.factionId.toLowerCase()}`
        : `npc_entity_${spec.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

      this.createNpc({
        id: entityId,
        instanceId,
        name: spec.name,
        title: spec.title,
        level: spec.level,
        tier: spec.tier,
        xpReward: spec.xpReward,
        modelId: spec.modelId,
        npcType: spec.npcType,
        factionId: spec.factionId,
        isHostile: spec.isHostile,
        isVoidIncursion: spec.isVoidIncursion,
        x: spec.x,
        y: spec.y,
        maxHp: spec.maxHp,
        baseDamage: spec.baseDamage,
        swingTimerMs: spec.swingTimerMs,
        castAbilityName: spec.castAbilityName,
        castCooldownMs: spec.castCooldownMs,
        now,
      });
    }

    // Friendly Aether Conclave Vanguard defending the rift threshold
    this.createNpc({
      id: 'npc_aether_vanguard_1',
      instanceId,
      name: 'Conclave Ley-Champion',
      title: 'Aether Vanguard Defender',
      level: 60,
      tier: 5,
      modelId: '/models/heroes/aether_spellweaver.glb',
      npcType: 'BASE_GUARD',
      factionId: 'AETHER',
      isHostile: false,
      x: -120,
      y: -120,
      maxHp: 120000,
      baseDamage: 480,
      swingTimerMs: 1800,
      castAbilityName: 'Arcane Cleave',
      castCooldownMs: 5000,
      now,
    });

    this.createNpc({
      id: 'npc_aether_vanguard_2',
      instanceId,
      name: 'Chronomancer Time-Warden',
      title: 'Aether Vanguard Defender',
      level: 60,
      tier: 5,
      modelId: '/models/heroes/aether_mage.glb',
      npcType: 'BASE_GUARD',
      factionId: 'AETHER',
      isHostile: false,
      x: -115,
      y: -125,
      maxHp: 110000,
      baseDamage: 460,
      swingTimerMs: 1800,
      castAbilityName: 'Arcane Cleave',
      castCooldownMs: 5000,
      now,
    });

    // 3. SEED HARVESTABLE 3D TCG RELIC NODES ACROSS THE OPEN WORLD
    const relicSpawns: Array<{
      id: string;
      name: string;
      factionId: FactionId;
      x: number;
      y: number;
      cardIdx: number;
    }> = [
      { id: 'relic_node_nexus_1', name: 'Sun-Crystal Relic Obelisk', factionId: 'SOLARI', x: 14, y: -10, cardIdx: 0 },
      { id: 'relic_node_nexus_2', name: 'World-Tree Amber Shrine', factionId: 'TERRA', x: 14, y: 10, cardIdx: 2 },
      { id: 'relic_node_nexus_3', name: 'Duskveil Void Monolith', factionId: 'UMBRI', x: -14, y: 10, cardIdx: 4 },
      { id: 'relic_node_nexus_4', name: 'Astral Ley-Crystal Node', factionId: 'AETHER', x: -14, y: -10, cardIdx: 6 },
      { id: 'relic_node_solari_wz', name: 'Ancient Sunspire Relic Font', factionId: 'SOLARI', x: 46, y: -46, cardIdx: 1 },
      { id: 'relic_node_terra_wz', name: 'Rootdeep Heartseed Crystal', factionId: 'TERRA', x: 46, y: 46, cardIdx: 3 },
      { id: 'relic_node_umbri_wz', name: 'Crimson Altar of Duskveil', factionId: 'UMBRI', x: -46, y: 46, cardIdx: 5 },
      { id: 'relic_node_aether_wz', name: 'Singularity Relic Conduit', factionId: 'AETHER', x: -46, y: -46, cardIdx: 7 },
    ];

    for (const r of relicSpawns) {
      const card = TCG_RELIC_CARDS[r.cardIdx % TCG_RELIC_CARDS.length];
      this.relicNodes.set(r.id, {
        id: r.id,
        instanceId,
        name: r.name,
        factionId: r.factionId,
        x: r.x,
        y: r.y,
        z: 0,
        isAvailable: true,
        respawnAtMs: 0,
        rewardCardId: card.id,
      });
    }
  }

  public createNpc(params: {
    id: string;
    instanceId: string;
    name: string;
    title: string;
    modelId: string;
    npcType: NpcEntity['npcType'];
    tier?: 1 | 2 | 3 | 4 | 5;
    level?: number;
    xpReward?: number;
    factionId: FactionId;
    isHostile: boolean;
    isVoidIncursion?: boolean;
    x: number;
    y: number;
    maxHp: number;
    baseDamage: number;
    swingTimerMs: number;
    castAbilityName?: string;
    castCooldownMs?: number;
    now: number;
  }): NpcEntity {
    const aggroRadius =
      params.npcType === 'TRAINING_DUMMY' ||
      params.npcType === 'ALLY_SPIRIT' ||
      params.npcType === 'QUARTERMASTER' ||
      params.npcType === 'FACTION_LEADER'
        ? 0
        : params.npcType === 'BASE_GUARD'
        ? 15
        : 18;

    const npc: NpcEntity = {
      id: params.id,
      instanceId: params.instanceId,
      name: params.name,
      title: params.title,
      modelId: params.modelId,
      kind: 'NPC',
      npcType: params.npcType,
      tier: params.tier ?? 1,
      factionId: params.factionId,
      level: params.level ?? 60,
      xpReward: params.xpReward,
      x: params.x,
      y: params.y,
      z: 0,
      spawnX: params.x,
      spawnY: params.y,
      facingRad: 0,
      hp: params.maxHp,
      maxHp: params.maxHp,
      isDead: false,
      isHostile: params.isHostile,
      isVoidIncursion: params.isVoidIncursion,
      targetId: null,
      auras: [],
      activeCast: null,
      schoolLockouts: {},
      animState: 'Idle',
      animUpdatedAtMs: params.now,
      aggroRadiusYards: aggroRadius,
      leashRadiusYards: 42,
      swingTimerMs: params.swingTimerMs,
      nextSwingAtMs: params.now + params.swingTimerMs,
      baseDamage: params.baseDamage,
      castAbilityName: params.castAbilityName,
      castCooldownMs: params.castCooldownMs,
      nextCastAtMs: params.castCooldownMs ? params.now + params.castCooldownMs : undefined,
      threatList: [],
    };

    this.npcs.set(npc.id, npc);
    this.threatTables.set(npc.id, {
      npcId: npc.id,
      entries: {},
    });
    return npc;
  }
}

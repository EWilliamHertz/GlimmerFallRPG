/**
 * Glimmerfall Online & RPG - Shared Authoritative Collision Engine
 * Provides 2D/3D collision detection and resolution with smooth wall-sliding.
 * Shared between client (zero-latency prediction) and server (authoritative validation).
 */

export type ColliderType = 'CYLINDER' | 'BOX' | 'OBB' | 'ARENA_PERIMETER';

export interface BaseCollider {
  id?: string;
  instanceId?: string; // defaults to 'open_world_nexus'
  minY?: number;       // default 0
  maxY?: number;       // default 40 yards high
}

export interface CylinderCollider extends BaseCollider {
  type: 'CYLINDER';
  x: number;
  z: number;
  radius: number;
}

export interface BoxCollider extends BaseCollider {
  type: 'BOX';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ObbCollider extends BaseCollider {
  type: 'OBB';
  cx: number;
  cz: number;
  halfWidth: number;  // extent along local X axis
  halfLength: number; // extent along local Z axis
  rotationY: number;  // radians
}

export interface ArenaPerimeterCollider extends BaseCollider {
  type: 'ARENA_PERIMETER';
  centerX: number;
  centerZ: number;
  radius: number; // Keep player INSIDE this radius
}

export type WorldCollider = CylinderCollider | BoxCollider | ObbCollider | ArenaPerimeterCollider;

export class CollisionWorld {
  private colliders: WorldCollider[] = [];
  private grid: Map<string, WorldCollider[]> = new Map();
  private readonly cellSize = 35; // 35 yards per spatial hash cell

  constructor() {
    this.buildOpenWorldColliders();
    this.buildDungeonColliders();
    this.rebuildSpatialGrid();
  }

  private getCellKey(instanceId: string, cx: number, cz: number): string {
    return `${instanceId}:${cx},${cz}`;
  }

  public addCollider(col: WorldCollider): void {
    if (!col.instanceId) col.instanceId = 'open_world_nexus';
    if (col.minY === undefined) col.minY = 0;
    if (col.maxY === undefined) col.maxY = 40;
    this.colliders.push(col);
    this.insertColliderIntoGrid(col);
  }

  private insertColliderIntoGrid(col: WorldCollider): void {
    const inst = col.instanceId || 'open_world_nexus';
    let minX = 0, maxX = 0, minZ = 0, maxZ = 0;

    if (col.type === 'CYLINDER') {
      minX = col.x - col.radius;
      maxX = col.x + col.radius;
      minZ = col.z - col.radius;
      maxZ = col.z + col.radius;
    } else if (col.type === 'BOX') {
      minX = col.minX;
      maxX = col.maxX;
      minZ = col.minZ;
      maxZ = col.maxZ;
    } else if (col.type === 'OBB') {
      const boundRadius = Math.hypot(col.halfWidth, col.halfLength);
      minX = col.cx - boundRadius;
      maxX = col.cx + boundRadius;
      minZ = col.cz - boundRadius;
      maxZ = col.cz + boundRadius;
    } else if (col.type === 'ARENA_PERIMETER') {
      // Covers whole arena area
      minX = col.centerX - col.radius;
      maxX = col.centerX + col.radius;
      minZ = col.centerZ - col.radius;
      maxZ = col.centerZ + col.radius;
    }

    const minCx = Math.floor(minX / this.cellSize);
    const maxCx = Math.floor(maxX / this.cellSize);
    const minCz = Math.floor(minZ / this.cellSize);
    const maxCz = Math.floor(maxZ / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = this.getCellKey(inst, cx, cz);
        let list = this.grid.get(key);
        if (!list) {
          list = [];
          this.grid.set(key, list);
        }
        list.push(col);
      }
    }
  }

  public rebuildSpatialGrid(): void {
    this.grid.clear();
    for (const c of this.colliders) {
      this.insertColliderIntoGrid(c);
    }
  }

  private buildOpenWorldColliders(): void {
    const inst = 'open_world_nexus';

    // 1. Canyon Cliff Walls (40 massive sheer rock faces flanking the 4 main pass corridors)
    const canyonDirections = [
      { tx: 180, tz: -180 }, // North-East (Solari)
      { tx: 180, tz: 180 },  // South-East (Terra)
      { tx: -180, tz: 180 }, // South-West (Umbri)
      { tx: -180, tz: -180 }, // North-West (Aether)
    ];

    const wallOffset = 18; // 18 yards canyon corridor half-width
    for (const p of canyonDirections) {
      const angle = Math.atan2(p.tx, p.tz);
      const perpAngle = angle + Math.PI / 2;

      for (const side of [-1, 1]) {
        for (let seg = 1; seg <= 5; seg++) {
          const t = seg / 5.5;
          const cx = p.tx * t + Math.cos(perpAngle) * wallOffset * side;
          const cz = p.tz * t + Math.sin(perpAngle) * wallOffset * side;
          const cliffHeight = 16 + (seg % 3) * 6;
          const cliffWidth = 12 + (seg % 2) * 5;
          const cliffLength = 36 + (seg % 3) * 10;
          const rotY = angle + (side * 0.12);

          this.addCollider({
            type: 'OBB',
            id: `canyon_cliff_${p.tx}_${side}_${seg}`,
            instanceId: inst,
            cx,
            cz,
            halfWidth: cliffWidth * 0.5,
            halfLength: cliffLength * 0.5,
            rotationY: rotY,
            minY: 0,
            maxY: cliffHeight,
          });
        }
      }
    }

    // 2. Nexus Sanctuary Fortified Outer Wall Ramparts
    // High stone castle battlements between the 4 canyon roads
    // North Wall: (0, -33.5), length 34, width 4.5, height 12
    this.addCollider({
      type: 'BOX',
      id: 'nexus_wall_north',
      instanceId: inst,
      minX: -17,
      maxX: 17,
      minZ: -36,
      maxZ: -31,
      minY: 0,
      maxY: 12,
    });

    // South Wall: (0, 33.5), length 34, width 4.5, height 12
    this.addCollider({
      type: 'BOX',
      id: 'nexus_wall_south',
      instanceId: inst,
      minX: -17,
      maxX: 17,
      minZ: 31,
      maxZ: 36,
      minY: 0,
      maxY: 12,
    });

    // West Wall: (-33.5, 0), length 34, width 4.5, height 12
    this.addCollider({
      type: 'BOX',
      id: 'nexus_wall_west',
      instanceId: inst,
      minX: -36,
      maxX: -31,
      minZ: -17,
      maxZ: 17,
      minY: 0,
      maxY: 12,
    });

    // East Wall: (33.5, 0), length 34, width 4.5, height 12
    this.addCollider({
      type: 'BOX',
      id: 'nexus_wall_east',
      instanceId: inst,
      minX: 31,
      maxX: 36,
      minZ: -17,
      maxZ: 17,
      minY: 0,
      maxY: 12,
    });

    // 3. Central Nexus Sanctuary Structures
    // Central Spire Crystal
    this.addCollider({
      type: 'CYLINDER',
      id: 'nexus_central_crystal',
      instanceId: inst,
      x: 0,
      z: 0,
      radius: 2.2,
      minY: 0,
      maxY: 14,
    });

    // Sanctuary Shrine Building (-12, 0, -4)
    this.addCollider({
      type: 'BOX',
      id: 'sanctuary_shrine_building',
      instanceId: inst,
      minX: -15.2,
      maxX: -8.8,
      minZ: -7.2,
      maxZ: -0.8,
      minY: 0,
      maxY: 7.5,
    });

    // Quartermaster Relic Stall (12, 0, -4)
    this.addCollider({
      type: 'BOX',
      id: 'quartermaster_shop_stall',
      instanceId: inst,
      minX: 8.8,
      maxX: 15.2,
      minZ: -6.8,
      maxZ: -1.2,
      minY: 0,
      maxY: 6.5,
    });

    // Boss Citadel Archway Pillars (0, 0, -30)
    this.addCollider({
      type: 'CYLINDER',
      id: 'archway_left_pillar',
      instanceId: inst,
      x: -4.8,
      z: -30,
      radius: 1.6,
      minY: 0,
      maxY: 10,
    });
    this.addCollider({
      type: 'CYLINDER',
      id: 'archway_right_pillar',
      instanceId: inst,
      x: 4.8,
      z: -30,
      radius: 1.6,
      minY: 0,
      maxY: 10,
    });

    // 4. Faction Stronghold Monumental Boundary Columns & Base Spire Crystals
    const basePositions = [
      { id: 'aether', x: -22, z: -22 },
      { id: 'solari', x: 22, z: -22 },
      { id: 'terra', x: 22, z: 22 },
      { id: 'umbri', x: -22, z: 22 },
    ];

    for (const b of basePositions) {
      // Central base spire crystal
      this.addCollider({
        type: 'CYLINDER',
        id: `${b.id}_base_crystal`,
        instanceId: inst,
        x: b.x,
        z: b.z,
        radius: 1.8,
        minY: 0,
        maxY: 8,
      });

      // 4 Monumental Boundary Columns around each base at radius 9.5
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const colX = b.x + Math.cos(ang) * 9.5;
        const colZ = b.z + Math.sin(ang) * 9.5;
        this.addCollider({
          type: 'CYLINDER',
          id: `${b.id}_col_${i}`,
          instanceId: inst,
          x: colX,
          z: colZ,
          radius: 1.5,
          minY: 0,
          maxY: 7,
        });
      }
    }

    // 5. Giant Warzone Monoliths & Ancient Trees
    // Solari Sun-Crystals (12 crystals at ~180, -180)
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const cx = 180 + Math.cos(ang) * (25 + (i % 2) * 15);
      const cz = -180 + Math.sin(ang) * (25 + (i % 2) * 15);
      this.addCollider({
        type: 'CYLINDER',
        id: `solari_crystal_${i}`,
        instanceId: inst,
        x: cx,
        z: cz,
        radius: 2.2,
        minY: 0,
        maxY: 9,
      });
    }

    // Terra Ancient Canopy Trees (16 trees at ~180, 180)
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const tx = 180 + Math.cos(ang) * (30 + (i % 3) * 16);
      const tz = 180 + Math.sin(ang) * (30 + (i % 3) * 16);
      this.addCollider({
        type: 'CYLINDER',
        id: `terra_tree_${i}`,
        instanceId: inst,
        x: tx,
        z: tz,
        radius: 2.5,
        minY: 0,
        maxY: 14,
      });
    }

    // Umbri Duskveil Void Columns (12 columns at ~-180, 180)
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const ux = -180 + Math.cos(ang) * (25 + (i % 2) * 15);
      const uz = 180 + Math.sin(ang) * (25 + (i % 2) * 15);
      this.addCollider({
        type: 'CYLINDER',
        id: `umbri_column_${i}`,
        instanceId: inst,
        x: ux,
        z: uz,
        radius: 2.0,
        minY: 0,
        maxY: 10,
      });
    }
  }

  private buildDungeonColliders(): void {
    // Dungeons and PvP Arenas have hard arena boundary perimeters
    const instances: Array<{ id: string; radius: number }> = [
      { id: 'solari_citadel', radius: 45 },
      { id: 'terra_spire', radius: 52 },
      { id: 'umbri_sanctum', radius: 48 },
      { id: 'aether_crucible', radius: 55 },
      { id: 'nexus_colosseum', radius: 38 },
      { id: 'void_pit', radius: 36 },
    ];

    for (const inst of instances) {
      this.addCollider({
        type: 'ARENA_PERIMETER',
        id: `${inst.id}_boundary`,
        instanceId: inst.id,
        centerX: 0,
        centerZ: 0,
        radius: inst.radius,
        minY: 0,
        maxY: 80,
      });
    }
  }

  public getNearbyColliders(instanceId: string, x: number, z: number, queryRadius = 15): WorldCollider[] {
    const minCx = Math.floor((x - queryRadius) / this.cellSize);
    const maxCx = Math.floor((x + queryRadius) / this.cellSize);
    const minCz = Math.floor((z - queryRadius) / this.cellSize);
    const maxCz = Math.floor((z + queryRadius) / this.cellSize);

    const candidates = new Set<WorldCollider>();
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = this.getCellKey(instanceId, cx, cz);
        const list = this.grid.get(key);
        if (list) {
          for (const col of list) {
            candidates.add(col);
          }
        }
      }
    }
    return Array.from(candidates);
  }

  /**
   * Resolves player position against all surrounding walls and obstacles.
   * Preserves tangential velocity for smooth sliding along wall surfaces.
   */
  public resolvePlayerPosition(
    currX: number,
    currZ: number,
    heightY = 0,
    playerRadius = 0.85,
    instanceId = 'open_world_nexus'
  ): { x: number; z: number; collided: boolean } {
    let x = currX;
    let z = currZ;
    let totalCollided = false;

    // Hard world outer edge clamps (-748 to 748)
    const WORLD_MAX = 748.0;
    if (x < -WORLD_MAX) { x = -WORLD_MAX; totalCollided = true; }
    if (x > WORLD_MAX) { x = WORLD_MAX; totalCollided = true; }
    if (z < -WORLD_MAX) { z = -WORLD_MAX; totalCollided = true; }
    if (z > WORLD_MAX) { z = WORLD_MAX; totalCollided = true; }

    // Multi-pass resolution allows smooth sliding around corners and intersecting walls
    for (let pass = 0; pass < 3; pass++) {
      let passCollided = false;
      const colliders = this.getNearbyColliders(instanceId, x, z, 12);

      for (const col of colliders) {
        // Vertical height check: if flying on mount high above the wall, glide over it
        const minY = col.minY ?? 0;
        const maxY = col.maxY ?? 40;
        if (heightY > maxY || heightY + 1.8 < minY) continue;

        if (col.type === 'CYLINDER') {
          const dx = x - col.x;
          const dz = z - col.z;
          const minDist = col.radius + playerRadius;
          const distSq = dx * dx + dz * dz;

          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq);
            const overlap = minDist - (dist || 0.0001);
            const nx = dist > 0.0001 ? dx / dist : 1.0;
            const nz = dist > 0.0001 ? dz / dist : 0.0;
            x += nx * overlap;
            z += nz * overlap;
            passCollided = true;
            totalCollided = true;
          }
        } else if (col.type === 'BOX') {
          const closestX = Math.max(col.minX, Math.min(col.maxX, x));
          const closestZ = Math.max(col.minZ, Math.min(col.maxZ, z));
          const dx = x - closestX;
          const dz = z - closestZ;
          const distSq = dx * dx + dz * dz;

          if (distSq < playerRadius * playerRadius) {
            if (distSq > 0.000001) {
              const dist = Math.sqrt(distSq);
              const push = playerRadius - dist;
              x += (dx / dist) * push;
              z += (dz / dist) * push;
            } else {
              // Deep penetration: eject along closest wall edge
              const left = x - col.minX;
              const right = col.maxX - x;
              const bottom = z - col.minZ;
              const top = col.maxZ - z;
              const minEject = Math.min(left, right, bottom, top);
              if (minEject === left) x = col.minX - playerRadius;
              else if (minEject === right) x = col.maxX + playerRadius;
              else if (minEject === bottom) z = col.minZ - playerRadius;
              else z = col.maxZ + playerRadius;
            }
            passCollided = true;
            totalCollided = true;
          }
        } else if (col.type === 'OBB') {
          const cos = Math.cos(-col.rotationY);
          const sin = Math.sin(-col.rotationY);

          // Rotate player position into OBB local frame
          const rx = x - col.cx;
          const rz = z - col.cz;
          const lx = rx * cos - rz * sin;
          const lz = rx * sin + rz * cos;

          const closestLX = Math.max(-col.halfWidth, Math.min(col.halfWidth, lx));
          const closestLZ = Math.max(-col.halfLength, Math.min(col.halfLength, lz));
          const dlx = lx - closestLX;
          const dlz = lz - closestLZ;
          const distSq = dlx * dlx + dlz * dlz;

          if (distSq < playerRadius * playerRadius) {
            let pushLX = 0;
            let pushLZ = 0;

            if (distSq > 0.000001) {
              const dist = Math.sqrt(distSq);
              const push = playerRadius - dist;
              pushLX = (dlx / dist) * push;
              pushLZ = (dlz / dist) * push;
            } else {
              // Eject along closest local edge
              const left = lx - (-col.halfWidth);
              const right = col.halfWidth - lx;
              const bottom = lz - (-col.halfLength);
              const top = col.halfLength - lz;
              const minEject = Math.min(left, right, bottom, top);

              if (minEject === left) pushLX = -left - playerRadius;
              else if (minEject === right) pushLX = right + playerRadius;
              else if (minEject === bottom) pushLZ = -bottom - playerRadius;
              else pushLZ = top + playerRadius;
            }

            // Transform local push vector back to world space
            const cosW = Math.cos(col.rotationY);
            const sinW = Math.sin(col.rotationY);
            x += pushLX * cosW - pushLZ * sinW;
            z += pushLX * sinW + pushLZ * cosW;

            passCollided = true;
            totalCollided = true;
          }
        } else if (col.type === 'ARENA_PERIMETER') {
          const dx = x - col.centerX;
          const dz = z - col.centerZ;
          const maxDist = col.radius - playerRadius;
          const distSq = dx * dx + dz * dz;

          if (distSq > maxDist * maxDist) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
              x = col.centerX + (dx / dist) * maxDist;
              z = col.centerZ + (dz / dist) * maxDist;
              passCollided = true;
              totalCollided = true;
            }
          }
        }
      }

      if (!passCollided) break;
    }

    return { x, z, collided: totalCollided };
  }
}

// Singleton global collision world
export const collisionWorld = new CollisionWorld();

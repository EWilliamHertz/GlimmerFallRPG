import { collisionWorld } from '../shared/collisionEngine';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

console.log('--- Testing Glimmerfall Collision Engine ---');

const playerRadius = 0.85;

// 1. Test Gateway Openings: North Road through Citadel Archway (x=0, z from 0 to -60)
for (let z = 0; z >= -60; z -= 5) {
  const res = collisionWorld.resolvePlayerPosition(0, z, 0, playerRadius, 'open_world_nexus');
  assert(!res.collided, `North road pathway clear at (0, ${z})`);
}

// 2. Test Fortified Citadel Wall Collisions (Left & Right segments flanking gateway)
// North Wall Left (minX: -17, maxX: -5, minZ: -36, maxZ: -31)
const walkIntoNorthWallLeft = collisionWorld.resolvePlayerPosition(-11, -32, 0, playerRadius, 'open_world_nexus');
assert(walkIntoNorthWallLeft.collided, 'North wall left segment detects collision');
assert(walkIntoNorthWallLeft.z > -31 + playerRadius - 0.01, `Player pushed out south of north wall left (z=${walkIntoNorthWallLeft.z.toFixed(2)})`);

// North Wall Right (minX: 5, maxX: 17, minZ: -36, maxZ: -31)
const walkIntoNorthWallRight = collisionWorld.resolvePlayerPosition(11, -32, 0, playerRadius, 'open_world_nexus');
assert(walkIntoNorthWallRight.collided, 'North wall right segment detects collision');
assert(walkIntoNorthWallRight.z > -31 + playerRadius - 0.01, `Player pushed out south of north wall right (z=${walkIntoNorthWallRight.z.toFixed(2)})`);

// 3. Test Archway Pillar Collision (x: 4.8, z: -30, radius: 1.6)
const walkIntoPillar = collisionWorld.resolvePlayerPosition(4.8, -30.5, 0, playerRadius, 'open_world_nexus');
assert(walkIntoPillar.collided, 'Archway pillar collision detected');
assert(Math.hypot(walkIntoPillar.x - 4.8, walkIntoPillar.z - (-30)) >= 1.6 + playerRadius - 0.01, 'Player pushed outside pillar radius');

// 4. Test Watchtower Collision (x: 19, z: -33.5, radius: 2.6)
const walkIntoTower = collisionWorld.resolvePlayerPosition(19, -33.5, 0, playerRadius, 'open_world_nexus');
assert(walkIntoTower.collided, 'Watchtower collision detected');
assert(Math.hypot(walkIntoTower.x - 19, walkIntoTower.z - (-33.5)) >= 2.6 + playerRadius - 0.01, 'Player pushed outside watchtower radius');

// 5. Test All 4 Canyon Passes from start to finish (0 to 120 yards)
const canyonDirections = [
  { name: 'Solari Pass', tx: 180, tz: -180 },
  { name: 'Terra Pass', tx: 180, tz: 180 },
  { name: 'Umbri Pass', tx: -180, tz: 180 },
  { name: 'Aether Pass', tx: -180, tz: -180 },
];
for (const p of canyonDirections) {
  for (let s = 0; s <= 120; s += 10) {
    const rx = (p.tx / 180) * s;
    const rz = (p.tz / 180) * s;
    const res = collisionWorld.resolvePlayerPosition(rx, rz, 0, playerRadius, 'open_world_nexus');
    assert(!res.collided, `${p.name} pathway clear at s=${s} (${rx.toFixed(1)}, ${rz.toFixed(1)})`);
  }
}

// 6. Test High Flight on Mount (heightY = 25 > wall maxY 12)
const flyingOverWall = collisionWorld.resolvePlayerPosition(11, -33.5, 25, playerRadius, 'open_world_nexus');
assert(!flyingOverWall.collided, 'Flying high on mount allows gliding over wall without collision');
assert(flyingOverWall.x === 11 && flyingOverWall.z === -33.5, 'Flying coordinates unchanged');

// 7. Test Dungeon Arena Perimeter (Solari Citadel radius = 45)
const dungeonPlayer = collisionWorld.resolvePlayerPosition(50, 0, 0, playerRadius, 'solari_citadel');
assert(dungeonPlayer.collided, 'Arena boundary collision detected');
assert(dungeonPlayer.x <= 45 - playerRadius + 0.01, `Player clamped inside arena boundary (x=${dungeonPlayer.x.toFixed(2)})`);

console.log('--- ALL COLLISION TESTS PASSED SUCCESSFULLY! ---');

import { collisionWorld } from '../shared/collisionEngine';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

console.log('--- Testing Glimmerfall Collision Engine ---');

// 1. Test Nexus North Wall Collision (minX: -17, maxX: 17, minZ: -36, maxZ: -31, maxY: 12)
// Player walks north from (0, -30) towards (0, -35)
const playerRadius = 0.85;
const testWalkIntoNorthWall = collisionWorld.resolvePlayerPosition(0, -32, 0, playerRadius, 'open_world_nexus');
assert(testWalkIntoNorthWall.collided, 'North wall detects collision');
assert(testWalkIntoNorthWall.z > -31 + playerRadius - 0.01, `Player pushed out south of north wall (z=${testWalkIntoNorthWall.z.toFixed(2)})`);

// 2. Test Wall Sliding: Player moving diagonally north-east into north wall (away from archway pillar at x=4.8)
const diagonalWalk = collisionWorld.resolvePlayerPosition(10, -31.5, 0, playerRadius, 'open_world_nexus');
assert(diagonalWalk.collided, 'Diagonal collision into wall detected');
assert(Math.abs(diagonalWalk.x - 10) < 0.001, 'Tangential X position preserved during wall sliding');
assert(Math.abs(diagonalWalk.z - (-30.15)) < 0.01, `Normal Z depth blocked by wall (z=${diagonalWalk.z.toFixed(2)})`);

// 2b. Test Archway Pillar Collision (x: 4.8, z: -30, radius: 1.6)
const walkIntoPillar = collisionWorld.resolvePlayerPosition(4.8, -30.5, 0, playerRadius, 'open_world_nexus');
assert(walkIntoPillar.collided, 'Archway pillar collision detected');
assert(Math.hypot(walkIntoPillar.x - 4.8, walkIntoPillar.z - (-30)) >= 1.6 + playerRadius - 0.01, 'Player pushed outside pillar radius');

// 3. Test High Flight on Mount (heightY = 25 > wall maxY 12)
const flyingOverWall = collisionWorld.resolvePlayerPosition(0, -33.5, 25, playerRadius, 'open_world_nexus');
assert(!flyingOverWall.collided, 'Flying high on mount allows gliding over wall without collision');
assert(flyingOverWall.x === 0 && flyingOverWall.z === -33.5, 'Flying coordinates unchanged');

// 4. Test Central Nexus Crystal (x: 0, z: 0, radius: 2.2)
const walkIntoCrystal = collisionWorld.resolvePlayerPosition(1.0, 0, 0, playerRadius, 'open_world_nexus');
assert(walkIntoCrystal.collided, 'Central crystal collision detected');
assert(walkIntoCrystal.x >= 2.2 + playerRadius - 0.01, `Player pushed outside crystal radius (x=${walkIntoCrystal.x.toFixed(2)})`);

// 5. Test Canyon Cliff Walls (OBBs rotated along canyon roads)
// Road heading towards (180, -180). Flanking wall at t=0.2 (cx approx 32, cz approx -18)
const walkIntoCanyonCliff = collisionWorld.resolvePlayerPosition(25, -45, 0, playerRadius, 'open_world_nexus');
console.log(`Canyon cliff test result: collided=${walkIntoCanyonCliff.collided}, pos=(${walkIntoCanyonCliff.x.toFixed(2)}, ${walkIntoCanyonCliff.z.toFixed(2)})`);

// 6. Test Dungeon Arena Perimeter (Solari Citadel radius = 45)
const dungeonPlayer = collisionWorld.resolvePlayerPosition(50, 0, 0, playerRadius, 'solari_citadel');
assert(dungeonPlayer.collided, 'Arena boundary collision detected');
assert(dungeonPlayer.x <= 45 - playerRadius + 0.01, `Player clamped inside arena boundary (x=${dungeonPlayer.x.toFixed(2)})`);

console.log('--- ALL COLLISION TESTS PASSED SUCCESSFULLY! ---');

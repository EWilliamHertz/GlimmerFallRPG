import * as THREE from 'three';

export function buildProceduralAnimationClips(): THREE.AnimationClip[] {
  const q = (rx: number, ry: number, rz: number): number[] => {
    const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
    return [quat.x, quat.y, quat.z, quat.w];
  };

  // 1. Idle
  const idleClip = new THREE.AnimationClip('Idle', 1.6, [
    new THREE.VectorKeyframeTrack(
      'Pelvis.position',
      [0, 0.8, 1.6],
      [0, 1.05, 0, 0, 1.11, 0, 0, 1.05, 0]
    ),
    new THREE.QuaternionKeyframeTrack(
      'RightShoulder.quaternion',
      [0, 0.8, 1.6],
      [...q(-0.2, 0, -0.1), ...q(-0.32, 0, -0.15), ...q(-0.2, 0, -0.1)]
    ),
    new THREE.QuaternionKeyframeTrack(
      'LeftShoulder.quaternion',
      [0, 0.8, 1.6],
      [...q(-0.15, 0, 0.1), ...q(-0.25, 0, 0.14), ...q(-0.15, 0, 0.1)]
    ),
    new THREE.QuaternionKeyframeTrack(
      'LeftLeg.quaternion',
      [0, 1.6],
      [...q(0, 0, 0), ...q(0, 0, 0)]
    ),
    new THREE.QuaternionKeyframeTrack(
      'RightLeg.quaternion',
      [0, 1.6],
      [...q(0, 0, 0), ...q(0, 0, 0)]
    ),
  ]);

  // 2. Run
  const runClip = new THREE.AnimationClip('Run', 0.64, [
    new THREE.VectorKeyframeTrack(
      'Pelvis.position',
      [0, 0.16, 0.32, 0.48, 0.64],
      [0, 1.04, 0, 0, 1.15, 0, 0, 1.04, 0, 0, 1.15, 0, 0, 1.04, 0]
    ),
    new THREE.QuaternionKeyframeTrack(
      'LeftLeg.quaternion',
      [0, 0.16, 0.32, 0.48, 0.64],
      [...q(0, 0, 0), ...q(0.65, 0, 0), ...q(0, 0, 0), ...q(-0.65, 0, 0), ...q(0, 0, 0)]
    ),
    new THREE.QuaternionKeyframeTrack(
      'RightLeg.quaternion',
      [0, 0.16, 0.32, 0.48, 0.64],
      [...q(0, 0, 0), ...q(-0.65, 0, 0), ...q(0, 0, 0), ...q(0.65, 0, 0), ...q(0, 0, 0)]
    ),
    new THREE.QuaternionKeyframeTrack(
      'RightShoulder.quaternion',
      [0, 0.16, 0.32, 0.48, 0.64],
      [...q(-0.2, 0, 0), ...q(0.5, 0, 0), ...q(-0.2, 0, 0), ...q(-0.7, 0, 0), ...q(-0.2, 0, 0)]
    ),
    new THREE.QuaternionKeyframeTrack(
      'LeftShoulder.quaternion',
      [0, 0.16, 0.32, 0.48, 0.64],
      [...q(-0.2, 0, 0), ...q(-0.7, 0, 0), ...q(-0.2, 0, 0), ...q(0.5, 0, 0), ...q(-0.2, 0, 0)]
    ),
  ]);

  // 3. Sprint
  const sprintClip = new THREE.AnimationClip('Sprint', 0.45, [
    new THREE.QuaternionKeyframeTrack(
      'Spine.quaternion',
      [0, 0.22, 0.45],
      [...q(0.35, 0, 0), ...q(0.55, 0, 0), ...q(0.1, 0, 0)]
    ),
    new THREE.QuaternionKeyframeTrack(
      'LeftLeg.quaternion',
      [0, 0.15, 0.3, 0.45],
      [...q(0.85, 0, 0), ...q(-0.85, 0, 0), ...q(0.85, 0, 0), ...q(0, 0, 0)]
    ),
    new THREE.QuaternionKeyframeTrack(
      'RightLeg.quaternion',
      [0, 0.15, 0.3, 0.45],
      [...q(-0.85, 0, 0), ...q(0.85, 0, 0), ...q(-0.85, 0, 0), ...q(0, 0, 0)]
    ),
  ]);

  // 4. Jump
  const jumpClip = new THREE.AnimationClip('Jump', 0.6, [
    new THREE.QuaternionKeyframeTrack(
      'RightShoulder.quaternion',
      [0, 0.3, 0.6],
      [...q(-0.2, 0, 0), ...q(-1.6, 0, -0.3), ...q(-0.2, 0, 0)]
    ),
    new THREE.QuaternionKeyframeTrack(
      'LeftShoulder.quaternion',
      [0, 0.3, 0.6],
      [...q(-0.2, 0, 0), ...q(-1.6, 0, 0.3), ...q(-0.2, 0, 0)]
    ),
  ]);

  // 5. Attack_Melee_1
  const meleeClip = new THREE.AnimationClip('Attack_Melee_1', 0.5, [
    new THREE.QuaternionKeyframeTrack(
      'Spine.quaternion',
      [0, 0.16, 0.32, 0.5],
      [...q(0, 0, 0), ...q(-0.2, 0.45, 0), ...q(0.28, -0.55, 0), ...q(0, 0, 0)]
    ),
    new THREE.QuaternionKeyframeTrack(
      'RightShoulder.quaternion',
      [0, 0.16, 0.32, 0.5],
      [...q(-0.2, 0, 0), ...q(-2.2, 0, -0.4), ...q(0.65, 0, 0.25), ...q(-0.2, 0, 0)]
    ),
  ]);

  // 6. Attack_Cast
  const castClip = new THREE.AnimationClip('Attack_Cast', 0.5, [
    new THREE.QuaternionKeyframeTrack(
      'RightShoulder.quaternion',
      [0, 0.22, 0.5],
      [...q(-0.2, 0, 0), ...q(-1.45, 0.2, 0), ...q(-0.2, 0, 0)]
    ),
    new THREE.QuaternionKeyframeTrack(
      'LeftShoulder.quaternion',
      [0, 0.22, 0.5],
      [...q(-0.2, 0, 0), ...q(-1.45, -0.2, 0), ...q(-0.2, 0, 0)]
    ),
  ]);

  // 7. Channel_Loop
  const channelClip = new THREE.AnimationClip('Channel_Loop', 0.8, [
    new THREE.QuaternionKeyframeTrack(
      'RightShoulder.quaternion',
      [0, 0.4, 0.8],
      [...q(-1.5, 0, -0.25), ...q(-1.75, 0, -0.4), ...q(-1.5, 0, -0.25)]
    ),
    new THREE.QuaternionKeyframeTrack(
      'LeftShoulder.quaternion',
      [0, 0.4, 0.8],
      [...q(-1.5, 0, 0.25), ...q(-1.75, 0, 0.4), ...q(-1.5, 0, 0.25)]
    ),
  ]);

  // 8. Hit_React
  const hitClip = new THREE.AnimationClip('Hit_React', 0.36, [
    new THREE.QuaternionKeyframeTrack(
      'Spine.quaternion',
      [0, 0.15, 0.36],
      [...q(0, 0, 0), ...q(-0.38, 0, 0.15), ...q(0, 0, 0)]
    ),
  ]);

  // 9. Death
  const deathClip = new THREE.AnimationClip('Death', 0.6, [
    new THREE.QuaternionKeyframeTrack(
      'Pelvis.quaternion',
      [0, 0.6],
      [...q(0, 0, 0), ...q(-Math.PI / 2, 0, 0)]
    ),
    new THREE.VectorKeyframeTrack(
      'Pelvis.position',
      [0, 0.6],
      [0, 1.05, 0, 0, 0.25, 0]
    ),
  ]);

  return [
    idleClip,
    runClip,
    sprintClip,
    jumpClip,
    meleeClip,
    castClip,
    channelClip,
    hitClip,
    deathClip,
  ];
}

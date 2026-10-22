import * as THREE from 'three';
import { ClassId } from '../../shared/types';
import { CLASS_GLB_MODELS } from '../../shared/instancesRegistry';

export function attachProceduralWeaponsToBones(
  rightHandBone: THREE.Bone,
  leftHandBone: THREE.Bone,
  classId: ClassId | undefined,
  isBoss: boolean,
  trimMat: THREE.Material,
  glowMat: THREE.Material,
  armorMat: THREE.Material
): void {
  const style = classId
    ? CLASS_GLB_MODELS[classId].weaponStyle
    : isBoss
    ? 'GREATHAMMER'
    : 'SWORD_SHIELD';

  if (style === 'SWORD_SHIELD') {
    const sword = new THREE.Group();
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6), armorMat);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.16), glowMat);
    blade.position.y = 0.72;
    sword.add(hilt, blade);
    sword.rotation.x = Math.PI / 2.2;
    rightHandBone.add(sword);

    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.72), trimMat);
    shield.position.set(-0.15, 0.1, 0.2);
    leftHandBone.add(shield);
  } else if (style === 'GREATHAMMER') {
    const maul = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.65, 6), armorMat);
    shaft.position.y = 0.55;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.38, 0.72), glowMat);
    head.position.y = 1.35;
    maul.add(shaft, head);
    maul.rotation.x = Math.PI / 2.3;
    rightHandBone.add(maul);
  } else if (style === 'DUAL_DAGGERS') {
    const makeDagger = () => {
      const d = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.75, 4), glowMat);
      blade.position.y = 0.4;
      d.add(blade);
      d.rotation.x = Math.PI / 2;
      return d;
    };
    rightHandBone.add(makeDagger());
    leftHandBone.add(makeDagger());
  } else if (style === 'RIFT_GLAIVE') {
    const glaive = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 6), armorMat);
    const topBlade = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 4), glowMat);
    topBlade.position.y = 1.1;
    const botBlade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 4), glowMat);
    botBlade.position.y = -1.0;
    botBlade.rotation.x = Math.PI;
    glaive.add(pole, topBlade, botBlade);
    glaive.rotation.x = Math.PI / 2.5;
    rightHandBone.add(glaive);
  } else {
    const staff = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.75, 6), trimMat);
    rod.position.y = 0.55;
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), glowMat);
    orb.position.y = 1.52;
    staff.add(rod, orb);
    staff.rotation.x = Math.PI / 3.2;
    rightHandBone.add(staff);
  }
}

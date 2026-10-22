import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AnimClipName, ClassId, FactionId } from '../../shared/types';
import { FACTIONS_REGISTRY } from '../../shared/factionsRegistry';
import { CLASS_GLB_MODELS } from '../../shared/instancesRegistry';
import { buildProceduralAnimationClips } from './ProceduralAnimations';
import { attachProceduralWeaponsToBones } from './WeaponSockets';

export interface AnimatedActorRig {
  rootGroup: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Partial<Record<AnimClipName, THREE.AnimationAction>>;
  currentAnim: AnimClipName;
  oneShotUntilMs: number;
  rightHandBone: THREE.Object3D;
  leftHandBone: THREE.Object3D;
  selectionRing: THREE.Mesh;
  castAuraRing: THREE.Mesh;
  hpBg?: THREE.Mesh;
  hpFg?: THREE.Mesh;
  bannerSprite?: THREE.Sprite;
  targetPos: THREE.Vector3;
  targetRotY: number;
  hasInitializedPos: boolean;
  classId?: ClassId;
  factionId: FactionId;
  fadeToAction: (name: AnimClipName, durationSec?: number, oneShotMs?: number) => void;
  updateBillboardAndHp: (hp: number, maxHp: number, cameraPos: THREE.Vector3, isSelected: boolean) => void;
}

const CLIP_ALIASES: Record<AnimClipName, string[]> = {
  Idle: [
    'Idle',
    '2H_Melee_Idle',
    'Standing',
    'SpiderArmature|Spider_Idle',
    'HumanArmature|Idle',
    'WaspArmature|Wasp_Flying',
    'Idle_Loop',
  ],
  Run: [
    'Running_A',
    'Running',
    'Run',
    'Walking_A',
    'Walking',
    'Walk',
    'SpiderArmature|Spider_Walk',
    'WaspArmature|Wasp_Flying',
    'HumanArmature|Run',
  ],
  Sprint: [
    'Dodge_Forward',
    'Running_A',
    'Running',
    'Run',
    'HumanArmature|Roll_sword',
    'SpiderArmature|Spider_Walk',
    'WaspArmature|Wasp_Flying',
  ],
  Flight: [
    'Idle',
    'Standing',
    'Walking_A',
    'Walking',
    'SpiderArmature|Spider_Idle',
    'WaspArmature|Wasp_Flying',
  ],
  Jump: [
    'Jump_Full_Short',
    'Jump',
    'WalkJump',
    'Dodge_Forward',
    'SpiderArmature|Spider_Jump',
    'HumanArmature|Jump',
    'Cheer',
  ],
  Attack_Melee_1: [
    '1H_Melee_Attack_Slice_Horizontal',
    '1H_Melee_Attack_Chop',
    'Dualwield_Melee_Attack_Slice',
    '2H_Melee_Attack_Chop',
    'Punch',
    'SpiderArmature|Spider_Attack',
    'WaspArmature|Wasp_Attack',
    'DragonArmature|DragonArmature|Dragon_Attack2',
    'HumanArmature|Run_swordAttack',
  ],
  Attack_Cast: [
    'Spellcast_Shoot',
    '2H_Melee_Attack_Spin',
    '1H_Melee_Attack_Chop',
    'Use_Item',
    'Wave',
    'SpiderArmature|Spider_Attack',
    'WaspArmature|Wasp_Attack',
  ],
  Channel_Loop: [
    '2H_Melee_Attack_Spin',
    'Spellcasting',
    'Spellcast_Shoot',
    'Dance',
  ],
  Hit_React: [
    'Hit_A',
    'DragonArmature|DragonArmature|Dragon_Hit',
    'No',
    'Idle',
  ],
  Death: [
    'Death_A',
    'Death',
    'SpiderArmature|Spider_Death',
    'WaspArmature|Wasp_Death',
    'HumanArmature|Death',
  ],
};

// Map duplicate model paths to shared canonical URLs so each unique GLB is fetched & parsed only ONCE
const CANONICAL_GLB_MAP: Record<string, string> = {
  '/models/heroes/solari_paladin.glb': '/assets/kaykit_knight.glb',
  '/models/heroes/aether_spellweaver.glb': '/assets/kaykit_knight.glb',
  '/models/heroes/solari_cleric.glb': '/assets/kaykit_mage.glb',
  '/models/heroes/terra_weaver.glb': '/assets/kaykit_mage.glb',
  '/models/heroes/aether_mage.glb': '/assets/kaykit_mage.glb',
  '/models/heroes/umbri_warlock.glb': '/assets/skeleton_mage.glb',
  '/models/monsters/nexus_colossus.glb': '/assets/robot.glb',
  '/models/monsters/solari_colossus.glb': '/assets/robot.glb',
  '/models/monsters/solari_golem.glb': '/assets/robot.glb',
  '/models/monsters/umbri_golem.glb': '/assets/robot.glb',
  '/models/monsters/solari_warden.glb': '/assets/skeleton_warrior.glb',
  '/models/monsters/solari_mob.glb': '/assets/skeleton_warrior.glb',
  '/models/monsters/umbri_executioner.glb': '/assets/skeleton_warrior.glb',
  '/models/monsters/umbri_boss.glb': '/assets/skeleton_mage.glb',
  '/models/monsters/umbri_malakor.glb': '/assets/skeleton_mage.glb',
  '/models/monsters/umbri_mob.glb': '/assets/skeleton_mage.glb',
  '/models/monsters/terra_boss.glb': '/assets/spider.glb',
  '/models/monsters/terra_mob.glb': '/assets/spider.glb',
  '/models/monsters/umbri_matron.glb': '/assets/spider.glb',
  '/models/monsters/aether_boss.glb': '/assets/wasp.glb',
  '/models/monsters/aether_mob.glb': '/assets/wasp.glb',
  '/models/monsters/solari_boss.glb': '/assets/kaykit_knight.glb',
  '/models/monsters/solari_emperor.glb': '/assets/kaykit_knight.glb',
};

export function createBannerSprite(
  title: string,
  subtitle: string,
  borderColor = '#38bdf8',
  iconHint = '⚔️',
  scaleX = 4.6,
  scaleY = 1.38
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(10, 15, 28, 0.92)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 6;
    const r = 30;
    ctx.beginPath();
    ctx.moveTo(16 + r, 16);
    ctx.lineTo(496 - r, 16);
    ctx.quadraticCurveTo(496, 16, 496, 16 + r);
    ctx.lineTo(496, 144 - r);
    ctx.quadraticCurveTo(496, 144, 496 - r, 144);
    ctx.lineTo(16 + r, 144);
    ctx.quadraticCurveTo(16, 144, 16, 144 - r);
    ctx.lineTo(16, 16 + r);
    ctx.quadraticCurveTo(16, 16, 16 + r, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Emblem disc
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(72, 80, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = borderColor;
    ctx.font = 'bold 30px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(iconHint, 72, 82);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillText(title.slice(0, 24), 122, 64);

    ctx.fillStyle = borderColor;
    ctx.font = 'bold 21px Inter, sans-serif';
    ctx.fillText(subtitle.slice(0, 30), 122, 108);
  }

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scaleX, scaleY, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export class ModelLoader {
  public gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private gltfCache: Map<string, GLTF> = new Map();
  private loadingPromises: Map<string, Promise<GLTF | null>> = new Map();

  constructor() {
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    // Preload core shared assets immediately
    this.loadGlbCached('/assets/sword.glb');
    this.loadGlbCached('/assets/crystal.glb');
    this.loadGlbCached('/assets/kaykit_knight.glb');
    this.loadGlbCached('/assets/kaykit_mage.glb');
  }

  public loadGlbCached(rawUrl: string): Promise<GLTF | null> {
    const url = CANONICAL_GLB_MAP[rawUrl] ?? rawUrl;
    const cached = this.gltfCache.get(url);
    if (cached) return Promise.resolve(cached);

    const existing = this.loadingPromises.get(url);
    if (existing) return existing;

    const promise = new Promise<GLTF | null>((resolve) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          this.gltfCache.set(url, gltf);
          resolve(gltf);
        },
        undefined,
        () => {
          resolve(null);
        }
      );
    });
    this.loadingPromises.set(url, promise);
    return promise;
  }

  public createActorRig(params: {
    factionId: FactionId;
    classId?: ClassId;
    name?: string;
    subtitle?: string;
    isBoss?: boolean;
    isDummy?: boolean;
    isHostile?: boolean;
    isLocalPlayer?: boolean;
    scale?: number;
    glbPath?: string;
  }): AnimatedActorRig {
    const faction = FACTIONS_REGISTRY[params.factionId];
    const rootGroup = new THREE.Group();
    const actorScale = params.scale ?? (params.isBoss ? 1.55 : 1.0);

    // 1. Ground Aura / Selection Ring (just like Arcanastride heroRing)
    const ringGeo = new THREE.RingGeometry(0.95 * actorScale, 1.28 * actorScale, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(params.isBoss ? '#f43f5e' : faction.accentColor),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
    });
    const selectionRing = new THREE.Mesh(ringGeo, ringMat);
    selectionRing.position.y = 0.06;
    selectionRing.visible = Boolean(params.isLocalPlayer || params.isBoss);
    rootGroup.add(selectionRing);

    // Clickable 3D Actor Hitbox (allows selecting characters by clicking anywhere on their body/silhouette)
    const hitboxHeight = (params.isBoss ? 4.8 : 2.8) * actorScale;
    const hitboxRadius = (params.isBoss ? 1.8 : 1.1) * actorScale;
    const hitGeo = new THREE.CylinderGeometry(hitboxRadius, hitboxRadius, hitboxHeight, 10);
    hitGeo.translate(0, hitboxHeight * 0.5, 0);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const clickHitbox = new THREE.Mesh(hitGeo, hitMat);
    clickHitbox.name = 'ActorClickHitbox';
    rootGroup.add(clickHitbox);

    // 2. Active Spellcasting Runic Ring on Ground
    const castGeo = new THREE.RingGeometry(0.75 * actorScale, 1.65 * actorScale, 28);
    castGeo.rotateX(-Math.PI / 2);
    const castMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(faction.bannerColor),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    const castAuraRing = new THREE.Mesh(castGeo, castMat);
    castAuraRing.position.y = 0.08;
    castAuraRing.visible = false;
    rootGroup.add(castAuraRing);

    // 3. 3D Billboard Health Bar & Nameplate Banner (for NPCs & Remote Players)
    let hpBg: THREE.Mesh | undefined;
    let hpFg: THREE.Mesh | undefined;
    let bannerSprite: THREE.Sprite | undefined;

    if (!params.isLocalPlayer && params.name) {
      const barHeight = (params.isBoss ? 3.5 : 2.85) * actorScale;
      const borderColor = params.isBoss
        ? '#fb7185'
        : params.isHostile
        ? faction.accentColor
        : '#34d399';
      const iconHint = params.isBoss ? '👑' : params.isDummy ? '🎯' : params.isHostile ? '⚔️' : '💚';

      bannerSprite = createBannerSprite(
        params.name.toUpperCase(),
        params.subtitle || (params.isBoss ? '★ ELITE WORLD BOSS ★' : faction.name),
        borderColor,
        iconHint,
        params.isBoss ? 5.2 : 3.8,
        params.isBoss ? 1.48 : 1.12
      );
      bannerSprite.position.y = barHeight + 0.78;
      rootGroup.add(bannerSprite);

      const hpBgGeo = new THREE.PlaneGeometry(2.4, 0.28);
      const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
      hpBg = new THREE.Mesh(hpBgGeo, hpBgMat);
      hpBg.position.y = barHeight;
      rootGroup.add(hpBg);

      const hpFgGeo = new THREE.PlaneGeometry(2.3, 0.2);
      hpFgGeo.translate(1.15, 0, 0); // Origin at left edge so scaling scales from left to right
      const hpFgMat = new THREE.MeshBasicMaterial({
        color: params.isBoss ? 0xf43f5e : params.isHostile ? 0xef4444 : 0x22c55e,
        side: THREE.DoubleSide,
      });
      hpFg = new THREE.Mesh(hpFgGeo, hpFgMat);
      hpFg.position.set(-1.15, 0, 0.01);
      hpBg.add(hpFg);
    }

    // 4. Lightweight fallback group while GLB loads (< 0.2s)
    const proceduralModel = this.buildProceduralArticulatedMesh(
      params.factionId,
      params.classId,
      Boolean(params.isBoss),
      Boolean(params.isDummy)
    );
    rootGroup.add(proceduralModel.rigRoot);

    const mixer = new THREE.AnimationMixer(proceduralModel.rigRoot);
    const clips = buildProceduralAnimationClips();
    const actions: Partial<Record<AnimClipName, THREE.AnimationAction>> = {};
    for (const clip of clips) {
      actions[clip.name as AnimClipName] = mixer.clipAction(clip);
    }
    actions.Idle?.play();

    const rig: AnimatedActorRig = {
      rootGroup,
      mixer,
      actions,
      currentAnim: 'Idle',
      oneShotUntilMs: 0,
      rightHandBone: proceduralModel.rightHandBone,
      leftHandBone: proceduralModel.leftHandBone,
      selectionRing,
      castAuraRing,
      hpBg,
      hpFg,
      bannerSprite,
      targetPos: new THREE.Vector3(0, 0, 0),
      targetRotY: Math.PI,
      hasInitializedPos: false,
      classId: params.classId,
      factionId: params.factionId,
      fadeToAction: (nextAnim: AnimClipName, durationSec = 0.15, oneShotMs = 0) => {
        const now = performance.now();
        if (oneShotMs === 0 && now < rig.oneShotUntilMs && rig.currentAnim !== 'Death') {
          return;
        }
        if (rig.currentAnim === nextAnim && oneShotMs === 0) return;

        const prevAction = rig.actions[rig.currentAnim];
        const nextAction =
          rig.actions[nextAnim] ??
          (nextAnim === 'Sprint' ? rig.actions.Run : undefined) ??
          rig.actions.Idle;
        if (!nextAction) return;

        rig.currentAnim = nextAnim;
        if (prevAction && prevAction !== nextAction) {
          prevAction.fadeOut(durationSec);
        }
        nextAction.reset().fadeIn(durationSec).play();

        if (oneShotMs > 0) {
          rig.oneShotUntilMs = now + oneShotMs;
        }
      },
      updateBillboardAndHp: (hp: number, maxHp: number, cameraPos: THREE.Vector3, isSelected: boolean) => {
        if (rig.hpBg && rig.hpFg) {
          rig.hpBg.lookAt(cameraPos);
          const ratio = Math.max(0.01, Math.min(1, hp / Math.max(1, maxHp)));
          rig.hpFg.scale.x = ratio;
        }
        if (rig.selectionRing && !params.isLocalPlayer) {
          rig.selectionRing.visible = isSelected || Boolean(params.isBoss);
        }
      },
    };

    const resolvedGlbPath =
      params.glbPath ?? (params.classId ? CLASS_GLB_MODELS[params.classId].heroGlb : undefined);
    if (resolvedGlbPath) {
      this.attachCachedGlbToRig(rig, proceduralModel.rigRoot, resolvedGlbPath, actorScale, Boolean(params.isBoss));
    }

    return rig;
  }

  private async attachCachedGlbToRig(
    rig: AnimatedActorRig,
    fallbackGroup: THREE.Group,
    rawGlbPath: string,
    actorScale: number,
    isBoss: boolean
  ): Promise<void> {
    const canonicalUrl = CANONICAL_GLB_MAP[rawGlbPath] ?? rawGlbPath;
    const gltf = await this.loadGlbCached(canonicalUrl);
    if (!gltf || !gltf.scene) return;

    const model = SkeletonUtils.clone(gltf.scene) as THREE.Group;
    rig.rootGroup.remove(fallbackGroup);

    // Scale & orient per model family (matching Arcanastride RPG)
    if (canonicalUrl.includes('wasp')) {
      model.scale.setScalar(0.78 * actorScale);
      model.position.y = 1.35;
    } else if (canonicalUrl.includes('spider')) {
      model.scale.setScalar(0.92 * actorScale);
    } else if (canonicalUrl.includes('parrot')) {
      // Raw parrot.glb is authored ~80 wide x 100 long x 34 tall (model units). Without an explicit
      // scale it fell into the KayKit hero branch (x1.35) and rendered ~100 yards wide, filling the screen.
      model.scale.setScalar(0.05 * actorScale);
      model.position.y = 1.8; // hover above the ground
      model.rotation.y = Math.PI; // parrot.glb faces -Z
    } else if (canonicalUrl.includes('robot')) {
      model.scale.setScalar(0.65 * actorScale);
    } else if (canonicalUrl.includes('solari_boss')) {
      // Dragon Boss
      this.fitModelToHeight(model, isBoss ? 4.4 : 3.2, 0);
    } else if (canonicalUrl.includes('skeleton_')) {
      model.scale.setScalar(1.32 * actorScale);
      const weaponUrl = canonicalUrl.includes('skeleton_warrior')
        ? '/assets/sword.glb'
        : '/assets/crystal.glb';
      const weaponGltf = await this.loadGlbCached(weaponUrl);
      if (weaponGltf) {
        model.traverse((node) => {
          if (node.name === 'handslot.r') {
            const w = weaponGltf.scene.clone();
            w.scale.setScalar(0.72);
            node.add(w);
          }
        });
      }
    } else if (canonicalUrl.includes('terra_juggernaut')) {
      // Cragwarden Juggernaut - massive imposing barbarian titan tank
      model.scale.setScalar(1.50 * actorScale);
    } else {
      // KayKit Heroes (Knight, Mage, Barbarian, Rogue_Hooded)
      model.scale.setScalar(1.35 * actorScale);
    }

    this.configureClassEquipmentAndTint(model, rig.classId, rig.factionId, isBoss);
    rig.rootGroup.add(model);

    const newMixer = new THREE.AnimationMixer(model);
    const newActions: Partial<Record<AnimClipName, THREE.AnimationAction>> = {};

    (Object.keys(CLIP_ALIASES) as AnimClipName[]).forEach((canonical) => {
      const aliases = CLIP_ALIASES[canonical];
      for (const alias of aliases) {
        const found = gltf.animations.find(
          (c) => c.name.toLowerCase() === alias.toLowerCase()
        );
        if (found) {
          const action = newMixer.clipAction(found);
          if (canonical === 'Death') {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          }
          newActions[canonical] = action;
          break;
        }
      }
    });

    // Fallback to first clip if Idle wasn't matched
    if (!newActions.Idle && gltf.animations.length > 0) {
      newActions.Idle = newMixer.clipAction(gltf.animations[0]);
    }
    if (!newActions.Run && newActions.Idle) {
      newActions.Run = newActions.Idle;
    }

    rig.mixer = newMixer;
    rig.actions = newActions;
    const desired = rig.currentAnim;
    rig.currentAnim = 'Idle';
    newActions[desired]?.reset().play() || newActions.Idle?.reset().play();
  }

  private configureClassEquipmentAndTint(
    model: THREE.Object3D,
    classId: ClassId | undefined,
    factionId: FactionId,
    isBoss: boolean
  ): void {
    const faction = FACTIONS_REGISTRY[factionId];
    const hideList = new Set<string>();

    if (classId === 'SUNFORGED_PALADIN') {
      // Sword + Golden Sun-Shield + Knight Helmet
      hideList.add('1H_Sword_Offhand');
      hideList.add('Rectangle_Shield');
      hideList.add('Round_Shield');
      hideList.add('Spike_Shield');
      hideList.add('2H_Sword');
    } else if (classId === 'RIFTBLADE_SPELLWEAVER') {
      // Dual-wielding Arcane Greatsword + Offhand Blade (no shield, no heavy helm)
      hideList.add('Badge_Shield');
      hideList.add('Rectangle_Shield');
      hideList.add('Round_Shield');
      hideList.add('Spike_Shield');
      hideList.add('1H_Sword');
      hideList.add('Knight_Helmet');
    } else if (classId === 'LUMINARY_CLERIC') {
      // Radiant Staff + Open Tome (no wizard hat)
      hideList.add('1H_Wand');
      hideList.add('Spellbook');
      hideList.add('Mage_Hat');
    } else if (classId === 'SYLVAN_WEAVER') {
      // Nature Wand + Open Tome + Hat
      hideList.add('2H_Staff');
      hideList.add('Spellbook');
    } else if (classId === 'CHRONOSAVANT_MAGE') {
      // Chrono Staff + Closed Grimoire + Wizard Hat
      hideList.add('1H_Wand');
      hideList.add('Spellbook_open');
    } else if (classId === 'CRAGWARDEN_JUGGERNAUT') {
      // 2H World-Axe + Round Shield
      hideList.add('1H_Axe');
      hideList.add('1H_Axe_Offhand');
      hideList.add('Mug');
    } else if (classId === 'NIGHTBLADE_ASSASSIN') {
      // Dual Daggers (Knife + Knife_Offhand) + Hood
      hideList.add('1H_Crossbow');
      hideList.add('2H_Crossbow');
      hideList.add('Throwable');
    }

    const emissiveColor = new THREE.Color(isBoss ? '#e11d48' : faction.bannerColor);
    const emissiveIntensity = isBoss ? 0.35 : 0.14;

    model.traverse((child) => {
      if (hideList.has(child.name)) {
        child.visible = false;
      }
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;

        const tintMat = (mat: THREE.Material) => {
          const cloned = mat.clone() as THREE.MeshStandardMaterial;
          if (cloned.emissive) {
            // Subtle faction glow on capes, weapons, eyes, or boss bodies
            const isAccentPart = /Cape|Shield|Sword|Staff|Wand|Axe|Knife|Eyes|Hat/i.test(child.name);
            if (isBoss || isAccentPart) {
              cloned.emissive = emissiveColor;
              cloned.emissiveIntensity = isAccentPart ? 0.28 : emissiveIntensity;
            }
          }
          return cloned;
        };

        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(tintMat)
          : tintMat(mesh.material);
      }
    });
  }

  public fitModelToHeight(obj: THREE.Object3D, targetHeight: number, yOffset = 0): void {
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y > 0.0001) {
      const ratio = targetHeight / size.y;
      obj.scale.multiplyScalar(ratio);
      obj.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(obj);
      obj.position.y += yOffset - box2.min.y;
    }
  }

  private buildProceduralArticulatedMesh(
    factionId: FactionId,
    classId: ClassId | undefined,
    isBoss: boolean,
    isDummy: boolean
  ): {
    rigRoot: THREE.Group;
    spineBone: THREE.Bone;
    rightHandBone: THREE.Bone;
    leftHandBone: THREE.Bone;
  } {
    const faction = FACTIONS_REGISTRY[factionId];
    const primaryColor = new THREE.Color(faction.bannerColor);
    const accentColor = new THREE.Color(faction.accentColor);

    const armorMat = new THREE.MeshStandardMaterial({
      color: isDummy ? 0x64748b : 0x334155,
      metalness: 0.55,
      roughness: 0.35,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      emissive: primaryColor,
      emissiveIntensity: 0.45,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.9,
    });

    const rigRoot = new THREE.Group();
    const pelvis = new THREE.Bone();
    pelvis.name = 'Pelvis';
    pelvis.position.set(0, 1.05, 0);
    rigRoot.add(pelvis);

    const spine = new THREE.Bone();
    spine.name = 'Spine';
    spine.position.set(0, 0.25, 0);
    pelvis.add(spine);

    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.15, 0.55), armorMat);
    torsoMesh.position.y = 0.3;
    spine.add(torsoMesh);

    const head = new THREE.Bone();
    head.name = 'Head';
    head.position.set(0, 0.88, 0);
    spine.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 12), trimMat));

    const leftShoulder = new THREE.Bone();
    leftShoulder.name = 'LeftShoulder';
    leftShoulder.position.set(-0.52, 0.6, 0);
    spine.add(leftShoulder);
    const leftHandBone = new THREE.Bone();
    leftHandBone.name = 'LeftHand';
    leftHandBone.position.set(0, -0.5, 0.1);
    leftShoulder.add(leftHandBone);

    const rightShoulder = new THREE.Bone();
    rightShoulder.name = 'RightShoulder';
    rightShoulder.position.set(0.52, 0.6, 0);
    spine.add(rightShoulder);
    const rightHandBone = new THREE.Bone();
    rightHandBone.name = 'RightHand';
    rightHandBone.position.set(0, -0.5, 0.1);
    rightShoulder.add(rightHandBone);

    attachProceduralWeaponsToBones(
      rightHandBone,
      leftHandBone,
      classId,
      isBoss,
      trimMat,
      glowMat,
      armorMat
    );

    return { rigRoot, spineBone: spine, rightHandBone, leftHandBone };
  }
}

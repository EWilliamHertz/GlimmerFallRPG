import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  AnimClipName,
  EntityBase,
  FactionId,
  GroundZone,
  InstanceTemplateId,
  NpcEntity,
  PlayerEntity,
  RelicNodeEntity,
  SpellSchool,
} from '../../shared/types';
import { FACTIONS_REGISTRY, TCG_RELIC_BY_ID, TCG_RELIC_CARDS } from '../../shared/factionsRegistry';
import { INSTANCES_REGISTRY } from '../../shared/instancesRegistry';
import { AnimatedActorRig, createBannerSprite, ModelLoader } from './ModelLoader';
import { CanvasFallback3D } from './CanvasFallback3D';

export function lerpAngle(current: number, target: number, t: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

interface ActiveSpellProjectile3D {
  mesh: THREE.Group;
  from: THREE.Vector3;
  to: THREE.Vector3;
  colorHex: number;
  createdAtMs: number;
  durationMs: number;
}

interface SlashWave3D {
  mesh: THREE.Mesh;
  isWide: boolean;
  life: number;
}

interface BurstParticle3D {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

export interface LocalPlayerPrediction {
  x: number;
  z: number;
  heightY: number;
  rotY: number;
  animState: AnimClipName;
}

export class World3D {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer | null = null;
  private fallback2D: CanvasFallback3D | null = null;
  public modelLoader: ModelLoader;

  public cameraYaw = 0;
  public cameraPitch = 0.42;
  public cameraDistance = 15.5;
  public isCinematicOrbit = true;

  private clock = new THREE.Clock();
  private actorRigs: Map<string, AnimatedActorRig> = new Map();
  private npcDataMap: Map<string, NpcEntity> = new Map();
  private playerDataMap: Map<string, PlayerEntity> = new Map();
  private groundZoneMeshes: Map<string, THREE.Group> = new Map();
  private relicNodeMeshes: Map<string, THREE.Group> = new Map();
  private projectiles: ActiveSpellProjectile3D[] = [];
  private slashWaves: SlashWave3D[] = [];
  private particles: BurstParticle3D[] = [];
  private ambientMixers: THREE.AnimationMixer[] = [];

  private groundMesh!: THREE.Mesh;
  private reticleMesh!: THREE.Mesh;
  private nexusSpireGroup!: THREE.Group;
  private rotatingRings: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private currentThemeId: InstanceTemplateId = 'open_world_nexus';
  private lastCamTarget = { x: 0, z: 0 };
  private cameraTargetVec = new THREE.Vector3();
  private myTargetId: string | null = null;
  private myPlayerId: string | null = null;
  private playerMounts: Map<string, { group: THREE.Group; mixer: THREE.AnimationMixer }> = new Map();
  private floatingRiftRocks: THREE.Mesh[] = [];
  private playerRelicOrbits: Map<string, { group: THREE.Group; cardIdsKey: string }> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x131b38);
    this.scene.fog = new THREE.FogExp2(0x131b38, 0.0009);

    this.camera = new THREE.PerspectiveCamera(
      58,
      window.innerWidth / window.innerHeight,
      0.1,
      2400
    );
    this.camera.position.set(0, 12, 26);

    this.modelLoader = new ModelLoader();

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch {
      this.renderer = null;
      this.fallback2D = new CanvasFallback3D(canvas);
    }

    this.buildLighting();
    this.buildEnvironment();
    this.buildReticle();
    this.preloadEnvironmentGlbProps();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      if (this.renderer) {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }
    });
  }

  private buildLighting(): void {
    const hemiLight = new THREE.HemisphereLight(0xc7d2fe, 0x1e293b, 1.25);
    hemiLight.position.set(0, 80, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfef3c7, 1.45);
    dirLight.position.set(55, 95, 45);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 240;
    const shadowBounds = 85;
    dirLight.shadow.camera.left = -shadowBounds;
    dirLight.shadow.camera.right = shadowBounds;
    dirLight.shadow.camera.top = shadowBounds;
    dirLight.shadow.camera.bottom = -shadowBounds;
    this.scene.add(dirLight);
  }

  private createTerrainTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 360);
      grad.addColorStop(0, '#1e3a3a');
      grad.addColorStop(0.5, '#172e36');
      grad.addColorStop(1, '#152238');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      for (let i = 0; i < 1600; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = 1 + Math.random() * 3.5;
        ctx.fillStyle =
          Math.random() > 0.5 ? 'rgba(52, 211, 153, 0.14)' : 'rgba(56, 189, 248, 0.10)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 512; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(96, 96);
    return tex;
  }

  private buildEnvironment(): void {
    const groundGeo = new THREE.PlaneGeometry(1600, 1600);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      map: this.createTerrainTexture(),
      roughness: 0.88,
      metalness: 0.08,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    this.nexusSpireGroup = new THREE.Group();

    // Central Sanctuary Outpost Plaza Ring
    const plazaRing = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 24, 48),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.24,
      })
    );
    plazaRing.rotateX(-Math.PI / 2);
    plazaRing.position.set(0, 0.04, 0);
    this.nexusSpireGroup.add(plazaRing);

    // 4 Long Paved Stone Roads Leading Into the Deep Canyon Passes
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const canyonDirections = [
      { name: 'Solari Pass', tx: 180, tz: -180 },
      { name: 'Terra Pass', tx: 180, tz: 180 },
      { name: 'Umbri Pass', tx: -180, tz: 180 },
      { name: 'Aether Pass', tx: -180, tz: -180 },
    ];

    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.95,
      metalness: 0.05,
    });

    for (const p of canyonDirections) {
      const dist = Math.hypot(p.tx, p.tz);
      const angle = Math.atan2(p.tx, p.tz);

      // Main paved highway through the canyon pass
      const passRoad = new THREE.Mesh(new THREE.PlaneGeometry(8.5, dist), roadMat);
      passRoad.rotateX(-Math.PI / 2);
      passRoad.rotation.z = -angle + Math.PI / 2;
      passRoad.position.set(p.tx * 0.5, 0.03, p.tz * 0.5);
      passRoad.receiveShadow = true;
      this.nexusSpireGroup.add(passRoad);

      // Flanking canyon rock ridges and sheer cliff walls (creates long deep gorges you walk through)
      const perpAngle = angle + Math.PI / 2;
      const wallOffset = 18; // 18 yards wide canyon corridor
      for (const side of [-1, 1]) {
        for (let seg = 1; seg <= 5; seg++) {
          const t = (seg + 0.35) / 5.5;
          const cx = p.tx * t + Math.cos(perpAngle) * wallOffset * side;
          const cz = p.tz * t + Math.sin(perpAngle) * wallOffset * side;
          const cliffHeight = 16 + (seg % 3) * 6;
          const cliffWidth = 12 + (seg % 2) * 5;
          const cliffLength = 36 + (seg % 3) * 10;

          const cliffBox = new THREE.Mesh(
            new THREE.BoxGeometry(cliffWidth, cliffHeight, cliffLength),
            cliffMat
          );
          cliffBox.position.set(cx, cliffHeight * 0.5, cz);
          cliffBox.rotation.y = angle + (side * 0.12);
          cliffBox.castShadow = true;
          cliffBox.receiveShadow = true;
          this.nexusSpireGroup.add(cliffBox);
        }
      }
    }

    const northRoad = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 95), roadMat);
    northRoad.rotateX(-Math.PI / 2);
    northRoad.position.set(0, 0.02, -26);
    northRoad.receiveShadow = true;
    this.nexusSpireGroup.add(northRoad);

    // -------------------------------------------------------------
    // Fortified Nexus Citadel Stone Ramparts & Gateway Watchtowers
    // -------------------------------------------------------------
    const stoneWallMat = new THREE.MeshStandardMaterial({
      color: 0x1e2638,
      roughness: 0.88,
      metalness: 0.12,
    });
    const stoneTrimMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
      metalness: 0.25,
    });
    const runeGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
    });

    const wallSpecs = [
      // North Wall: Split into West and East curtain walls flanking central Archway Gateway (x: -5 to +5 open)
      { name: 'NorthLeft',  x: -11, z: -33.5, w: 12, d: 5, h: 12 },
      { name: 'NorthRight', x:  11, z: -33.5, w: 12, d: 5, h: 12 },
      // South Wall: Split into West and East curtain walls flanking central gateway (x: -5 to +5 open)
      { name: 'SouthLeft',  x: -11, z:  33.5, w: 12, d: 5, h: 12 },
      { name: 'SouthRight', x:  11, z:  33.5, w: 12, d: 5, h: 12 },
      // West and East Walls
      { name: 'West',       x: -33.5, z: 0,   w: 5, d: 34, h: 12 },
      { name: 'East',       x:  33.5, z: 0,   w: 5, d: 34, h: 12 },
    ];

    for (const ws of wallSpecs) {
      // Main curtain wall body
      const wallMesh = new THREE.Mesh(
        new THREE.BoxGeometry(ws.w, ws.h, ws.d),
        stoneWallMat
      );
      wallMesh.position.set(ws.x, ws.h * 0.5, ws.z);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      this.nexusSpireGroup.add(wallMesh);

      // Upper parapet walkway trim
      const trimMesh = new THREE.Mesh(
        new THREE.BoxGeometry(ws.w + 0.6, 0.8, ws.d + 0.6),
        stoneTrimMat
      );
      trimMesh.position.set(ws.x, ws.h + 0.4, ws.z);
      trimMesh.castShadow = true;
      trimMesh.receiveShadow = true;
      this.nexusSpireGroup.add(trimMesh);

      // Glowing magical defensive rune in wall center
      const runeEmblem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.7, 0),
        runeGlowMat
      );
      runeEmblem.position.set(ws.x, ws.h * 0.5 + 1.2, ws.z);
      this.nexusSpireGroup.add(runeEmblem);
      this.rotatingRings.push(runeEmblem);

      // Crenellations (battlements) along the top of the wall
      const isHorizontal = ws.w > ws.d;
      const step = 3.6;
      const count = Math.floor((isHorizontal ? ws.w : ws.d) / step);
      for (let c = 0; c < count; c++) {
        if (c % 2 === 0) continue;
        const offset = (c - count / 2) * step + step * 0.5;
        const bX = ws.x + (isHorizontal ? offset : 0);
        const bZ = ws.z + (isHorizontal ? 0 : offset);
        const crenel = new THREE.Mesh(
          new THREE.BoxGeometry(isHorizontal ? 2.2 : ws.w + 0.3, 1.4, isHorizontal ? ws.d + 0.3 : 2.2),
          stoneTrimMat
        );
        crenel.position.set(bX, ws.h + 1.1, bZ);
        crenel.castShadow = true;
        this.nexusSpireGroup.add(crenel);
      }
    }

    // 8 Grand Watchtowers at the corners flanking the 4 gate passages
    const towerPositions = [
      { x: 19, z: -33.5 },
      { x: 33.5, z: -19 },
      { x: 33.5, z: 19 },
      { x: 19, z: 33.5 },
      { x: -19, z: 33.5 },
      { x: -33.5, z: 19 },
      { x: -33.5, z: -19 },
      { x: -19, z: -33.5 },
    ];

    const towerGeo = new THREE.CylinderGeometry(2.2, 2.6, 15, 16);
    const towerCapGeo = new THREE.ConeGeometry(2.8, 4.5, 16);
    const towerLanternGeo = new THREE.SphereGeometry(0.65, 12, 12);

    for (const tp of towerPositions) {
      const tower = new THREE.Mesh(towerGeo, stoneWallMat);
      tower.position.set(tp.x, 7.5, tp.z);
      tower.castShadow = true;
      tower.receiveShadow = true;
      this.nexusSpireGroup.add(tower);

      const cap = new THREE.Mesh(towerCapGeo, stoneTrimMat);
      cap.position.set(tp.x, 15 + 2.25, tp.z);
      cap.castShadow = true;
      this.nexusSpireGroup.add(cap);

      // Glowing crystal beacon atop each watchtower
      const beacon = new THREE.Mesh(towerLanternGeo, runeGlowMat);
      beacon.position.set(tp.x, 15 + 4.8, tp.z);
      this.nexusSpireGroup.add(beacon);
    }

    // Central Spire Crystal
    const crystalTower = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.5, 0),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.9,
      })
    );
    crystalTower.position.set(0, 4.2, 0);
    this.nexusSpireGroup.add(crystalTower);
    this.rotatingRings.push(crystalTower);

    const nexusBanner = createBannerSprite(
      'THE NEXUS SANCTUARY',
      'Safe Hub • Press [I] for Dungeons & PvP',
      '#38bdf8',
      '✨',
      5.8,
      1.65
    );
    nexusBanner.position.set(0, 7.2, 0);
    this.nexusSpireGroup.add(nexusBanner);

    // 4 Distinct Open-World Themed Biomes
    const biomeThemes = [
      {
        faction: 'SOLARI' as FactionId,
        groundColor: 0x92400e,
        accentColor: '#f59e0b',
        ringColor: 0xfde047,
        subTitle: 'Tier 2 Warzone • Level 16–25',
        icon: '☀️',
      },
      {
        faction: 'TERRA' as FactionId,
        groundColor: 0x064e3b,
        accentColor: '#10b981',
        ringColor: 0x86efac,
        subTitle: 'Tier 3 Warzone • Level 28–38',
        icon: '🌳',
      },
      {
        faction: 'UMBRI' as FactionId,
        groundColor: 0x3b0764,
        accentColor: '#8b5cf6',
        ringColor: 0xd8b4fe,
        subTitle: 'Tier 4 Warzone • Level 42–52',
        icon: '🌙',
      },
      {
        faction: 'AETHER' as FactionId,
        groundColor: 0x083344,
        accentColor: '#06b6d4',
        ringColor: 0x67e8f9,
        subTitle: 'Tier 5 Elite Warzone • Level 55–60',
        icon: '🌌',
      },
    ];

    for (const b of biomeThemes) {
      const wz = FACTIONS_REGISTRY[b.faction].warzoneBounds;

      // Themed ground plateau disc
      const biomePlateau = new THREE.Mesh(
        new THREE.CircleGeometry(wz.radius, 48),
        new THREE.MeshStandardMaterial({
          color: b.groundColor,
          roughness: 0.9,
          metalness: 0.1,
        })
      );
      biomePlateau.rotateX(-Math.PI / 2);
      biomePlateau.position.set(wz.centerX, 0.03, wz.centerY);
      biomePlateau.receiveShadow = true;
      this.nexusSpireGroup.add(biomePlateau);

      // Outer glowing border ring
      const biomeRing = new THREE.Mesh(
        new THREE.RingGeometry(wz.radius - 1.4, wz.radius, 48),
        new THREE.MeshBasicMaterial({
          color: b.ringColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
        })
      );
      biomeRing.rotateX(-Math.PI / 2);
      biomeRing.position.set(wz.centerX, 0.06, wz.centerY);
      this.nexusSpireGroup.add(biomeRing);

      // Inner glowing core circle
      const coreRing = new THREE.Mesh(
        new THREE.RingGeometry(6, 6.8, 32),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(b.accentColor),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        })
      );
      coreRing.rotateX(-Math.PI / 2);
      coreRing.position.set(wz.centerX, 0.07, wz.centerY);
      this.nexusSpireGroup.add(coreRing);
      this.rotatingRings.push(coreRing);

      const biomeBanner = createBannerSprite(
        wz.name.toUpperCase(),
        b.subTitle,
        b.accentColor,
        b.icon,
        6.4,
        1.85
      );
      biomeBanner.position.set(wz.centerX, 10.5, wz.centerY);
      this.nexusSpireGroup.add(biomeBanner);
    }

    this.scene.add(this.nexusSpireGroup);
  }

  private async preloadEnvironmentGlbProps(): Promise<void> {
    // 1. Sanctuary Shrine (-12, 0, -4)
    const sanctGltf = await this.modelLoader.loadGlbCached('/assets/sanctuary.glb');
    if (sanctGltf) {
      const shrine = sanctGltf.scene.clone();
      this.modelLoader.fitModelToHeight(shrine, 4.8, 0);
      shrine.position.set(-12, 0, -4);
      this.nexusSpireGroup.add(shrine);
    }

    // 2. Quartermaster Relic Stall (12, 0, -4) + Animated Quartermaster NPC
    const shopGltf = await this.modelLoader.loadGlbCached('/assets/shop.glb');
    if (shopGltf) {
      const stall = shopGltf.scene.clone();
      this.modelLoader.fitModelToHeight(stall, 4.2, 0);
      stall.position.set(12, 0, -4);
      this.nexusSpireGroup.add(stall);

      const shopBanner = createBannerSprite(
        'TCG RELIC ARCHIVIST',
        'Press [C] to Socket 3-Card Relic Deck',
        '#fbbf24',
        '🃏',
        5.6,
        1.6
      );
      shopBanner.position.set(12, 5.8, -4);
      this.nexusSpireGroup.add(shopBanner);
    }

    const mageGltf = await this.modelLoader.loadGlbCached('/assets/kaykit_mage.glb');
    if (mageGltf) {
      const npc = SkeletonUtils.clone(mageGltf.scene);
      npc.scale.setScalar(1.3);
      npc.position.set(9.8, 0, -2.2);
      npc.rotation.y = -Math.PI / 6;
      this.nexusSpireGroup.add(npc);
      const mixer = new THREE.AnimationMixer(npc);
      const idleClip = mageGltf.animations.find((a) => a.name === 'Idle') || mageGltf.animations[0];
      if (idleClip) mixer.clipAction(idleClip).play();
      this.ambientMixers.push(mixer);
    }

    // 3. Boss Citadel Archway (0, 0, -30)
    const archGltf = await this.modelLoader.loadGlbCached('/assets/arch.glb');
    if (archGltf) {
      const arch = archGltf.scene.clone();
      this.modelLoader.fitModelToHeight(arch, 8.8, 0);
      arch.position.set(0, 0, -30);
      this.nexusSpireGroup.add(arch);
    }

    // 4. Populate 64 3D Trees, Columns, Rocks, and Crystals across the Open World
    const [treeGltf, colGltf, rockGltf, crysGltf] = await Promise.all([
      this.modelLoader.loadGlbCached('/assets/tree.glb'),
      this.modelLoader.loadGlbCached('/assets/column.glb'),
      this.modelLoader.loadGlbCached('/assets/rock.glb'),
      this.modelLoader.loadGlbCached('/assets/crystal.glb'),
    ]);

    const propSources = [
      { gltf: treeGltf, height: 6.4 },
      { gltf: colGltf, height: 5.6 },
      { gltf: rockGltf, height: 2.3 },
      { gltf: crysGltf, height: 3.1 },
    ];

    const isNearRoadOrSanctuary = (x: number, z: number): boolean => {
      if (Math.hypot(x, z) < 36) return true; // Sanctuary interior
      if (Math.abs(x) < 5.0 && z <= 0 && z >= -85) return true; // North road
      if (Math.abs(x) < 5.0 && z >= 0 && z <= 85) return true; // South road
      const dSolari = Math.abs(x + z) / Math.SQRT2;
      if (dSolari < 7.0 && x > 0 && z < 0) return true;
      const dTerra = Math.abs(x - z) / Math.SQRT2;
      if (dTerra < 7.0 && x > 0 && z > 0) return true;
      const dUmbri = Math.abs(x + z) / Math.SQRT2;
      if (dUmbri < 7.0 && x < 0 && z > 0) return true;
      const dAether = Math.abs(x - z) / Math.SQRT2;
      if (dAether < 7.0 && x < 0 && z < 0) return true;
      return false;
    };

    for (let i = 0; i < 160; i++) {
      const angle = (i / 160) * Math.PI * 2 + (i % 5) * 0.17;
      const radius = 24 + ((i * 37) % 320);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (isNearRoadOrSanctuary(x, z)) continue;

      const spec = propSources[i % propSources.length];
      if (!spec.gltf) continue;
      const clone = spec.gltf.scene.clone();
      const scaleVar = 0.85 + ((i * 7) % 5) * 0.18;
      this.modelLoader.fitModelToHeight(clone, spec.height * scaleVar, 0);
      clone.position.set(x, 0, z);
      clone.rotation.y = (i * 1.3) % (Math.PI * 2);
      this.nexusSpireGroup.add(clone);
    }

    // 5. Populate Specialized Biome Themed Props
    // A. Aether Floating Rift Levitating Anti-Gravity Rocks
    if (rockGltf) {
      for (let i = 0; i < 14; i++) {
        const floatRock = rockGltf.scene.clone();
        const ang = (i / 14) * Math.PI * 2;
        const dist = 24 + (i % 3) * 16;
        const rx = -180 + Math.cos(ang) * dist;
        const rz = -180 + Math.sin(ang) * dist;
        const baseY = 4.5 + (i % 4) * 2.5;
        this.modelLoader.fitModelToHeight(floatRock, 3.2 + (i % 3) * 1.2, 0);
        floatRock.position.set(rx, baseY, rz);
        floatRock.userData = { baseY, phase: i * 0.75 };
        this.nexusSpireGroup.add(floatRock);
        this.floatingRiftRocks.push(floatRock as any);
      }
    }

    // B. Solari Sunspire Golden Sun-Crystals
    if (crysGltf) {
      for (let i = 0; i < 12; i++) {
        const sc = crysGltf.scene.clone();
        const ang = (i / 12) * Math.PI * 2;
        const cx = 180 + Math.cos(ang) * (25 + (i % 2) * 15);
        const cz = -180 + Math.sin(ang) * (25 + (i % 2) * 15);
        this.modelLoader.fitModelToHeight(sc, 5.5, 0);
        sc.position.set(cx, 0, cz);
        this.nexusSpireGroup.add(sc);
      }
    }

    // C. Terra Rootdeep Wilds Ancient Canopy Trees
    if (treeGltf) {
      for (let i = 0; i < 16; i++) {
        const tr = treeGltf.scene.clone();
        const ang = (i / 16) * Math.PI * 2;
        const tx = 180 + Math.cos(ang) * (30 + (i % 3) * 16);
        const tz = 180 + Math.sin(ang) * (30 + (i % 3) * 16);
        this.modelLoader.fitModelToHeight(tr, 8.5 + (i % 3) * 2.2, 0);
        tr.position.set(tx, 0, tz);
        this.nexusSpireGroup.add(tr);
      }
    }

    // D. Umbri Duskveil Void Columns
    if (colGltf) {
      for (let i = 0; i < 12; i++) {
        const col = colGltf.scene.clone();
        const ang = (i / 12) * Math.PI * 2;
        const ux = -180 + Math.cos(ang) * (25 + (i % 2) * 15);
        const uz = 180 + Math.sin(ang) * (25 + (i % 2) * 15);
        this.modelLoader.fitModelToHeight(col, 6.8, 0);
        col.position.set(ux, 0, uz);
        this.nexusSpireGroup.add(col);
      }
    }

    // 6. Build 4 Dedicated Faction Home Base Strongholds (Sanctuary Bases)
    const baseConfigs = [
      {
        faction: 'AETHER' as FactionId,
        x: -22,
        z: -22,
        title: 'ASTRAL CONCLAVE STRONGHOLD',
        subtitle: 'Aether Faction Home Base • Safe Sanctuary',
        color: '#06b6d4',
        accentHex: 0x06b6d4,
        icon: '🌌',
      },
      {
        faction: 'SOLARI' as FactionId,
        x: 22,
        z: -22,
        title: 'SUNSPIRE DAWN CITADEL',
        subtitle: 'Solari Faction Home Base • Safe Sanctuary',
        color: '#f59e0b',
        accentHex: 0xf59e0b,
        icon: '☀️',
      },
      {
        faction: 'TERRA' as FactionId,
        x: 22,
        z: 22,
        title: 'ROOTDEEP GROVE SANCTUARY',
        subtitle: 'Terra Faction Home Base • Safe Sanctuary',
        color: '#10b981',
        accentHex: 0x10b981,
        icon: '🌳',
      },
      {
        faction: 'UMBRI' as FactionId,
        x: -22,
        z: 22,
        title: 'DUSKVEIL SHADOW HAVEN',
        subtitle: 'Umbri Faction Home Base • Safe Sanctuary',
        color: '#8b5cf6',
        accentHex: 0x8b5cf6,
        icon: '🌙',
      },
    ];

    for (const b of baseConfigs) {
      // Base platform dais ring
      const dais = new THREE.Mesh(
        new THREE.RingGeometry(1.5, 12, 32),
        new THREE.MeshBasicMaterial({
          color: b.accentHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.35,
        })
      );
      dais.rotateX(-Math.PI / 2);
      dais.position.set(b.x, 0.05, b.z);
      this.nexusSpireGroup.add(dais);
      this.rotatingRings.push(dais);

      // Central base spire crystal
      const baseCrystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.2, 0),
        new THREE.MeshStandardMaterial({
          color: b.accentHex,
          emissive: b.accentHex,
          emissiveIntensity: 0.85,
        })
      );
      baseCrystal.position.set(b.x, 3.8, b.z);
      this.nexusSpireGroup.add(baseCrystal);
      this.rotatingRings.push(baseCrystal);

      // Base Stronghold Billboard Banner
      const banner = createBannerSprite(
        b.title,
        b.subtitle,
        b.color,
        b.icon,
        6.2,
        1.75
      );
      banner.position.set(b.x, 6.5, b.z);
      this.nexusSpireGroup.add(banner);

      // 4 Monumental Boundary Columns around base
      if (colGltf) {
        for (let i = 0; i < 4; i++) {
          const col = colGltf.scene.clone();
          const ang = (i / 2) * Math.PI;
          this.modelLoader.fitModelToHeight(col, 4.5, 0);
          col.position.set(b.x + Math.cos(ang) * 9.5, 0, b.z + Math.sin(ang) * 9.5);
          this.nexusSpireGroup.add(col);
        }
      }
    }
  }

  public async createEmberwingHawkMount(): Promise<{ group: THREE.Group; mixer: THREE.AnimationMixer }> {
    const gltf = await this.modelLoader.loadGlbCached('/assets/parrot.glb');
    const group = new THREE.Group();
    group.name = 'EmberwingHawkMount';

    if (gltf) {
      const hawk = SkeletonUtils.clone(gltf.scene);
      this.modelLoader.fitModelToHeight(hawk, 2.5, 0);

      // Apply fiery ember plumage & glowing materials
      hawk.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          m.material = new THREE.MeshStandardMaterial({
            color: 0xf97316,
            emissive: 0xd97706,
            emissiveIntensity: 0.95,
            roughness: 0.35,
            metalness: 0.15,
          });
        }
      });

      // Blazing raptor eyes
      const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.22, 1.85, 0.45);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.22, 1.85, 0.45);
      hawk.add(leftEye, rightEye);

      // Flame feather aura planes
      const wingFlameGeo = new THREE.PlaneGeometry(1.5, 0.55);
      const wingFlameMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      });
      const leftWingFlame = new THREE.Mesh(wingFlameGeo, wingFlameMat);
      leftWingFlame.position.set(-1.3, 1.45, 0);
      leftWingFlame.rotation.x = Math.PI / 2;
      const rightWingFlame = new THREE.Mesh(wingFlameGeo, wingFlameMat);
      rightWingFlame.position.set(1.3, 1.45, 0);
      rightWingFlame.rotation.x = Math.PI / 2;
      hawk.add(leftWingFlame, rightWingFlame);

      // Position hawk saddle underneath rider
      hawk.position.set(0, -1.05, 0.2);
      hawk.rotation.y = Math.PI; // Face forward with rider
      group.add(hawk);

      const mixer = new THREE.AnimationMixer(hawk);
      const flapClip = gltf.animations.find((a) => a.name.includes('parrot_A_')) || gltf.animations[0];
      if (flapClip) {
        const action = mixer.clipAction(flapClip);
        action.timeScale = 1.35;
        action.play();
      }

      return { group, mixer };
    }

    return { group, mixer: new THREE.AnimationMixer(group) };
  }

  public buildRelicOrbitGroup(cardIds: string[]): THREE.Group {
    const orbitGroup = new THREE.Group();
    orbitGroup.name = 'RelicConstellationGroup';

    const validCards = cardIds
      .map((cid) => TCG_RELIC_BY_ID[cid] || TCG_RELIC_CARDS.find((c) => c.id === cid))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));

    if (validCards.length === 0) return orbitGroup;

    // Glowing ground runic orbit ring
    const groundRingGeo = new THREE.RingGeometry(1.2, 1.35, 32);
    groundRingGeo.rotateX(-Math.PI / 2);
    const groundRingMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
    groundRing.position.y = 0.04;
    orbitGroup.add(groundRing);

    validCards.forEach((card, idx) => {
      const angle = (idx * Math.PI * 2) / validCards.length;
      const crystalGroup = new THREE.Group();
      crystalGroup.name = `RelicCrystal_${idx}`;

      let col = 0xf59e0b;
      let emissiveCol = 0xfbbf24;
      let geo: THREE.BufferGeometry = new THREE.OctahedronGeometry(0.24, 0);

      if (card.factionId === 'SOLARI') {
        col = 0xf59e0b;
        emissiveCol = 0xfef08a;
        geo = new THREE.OctahedronGeometry(0.26, 0);
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(0.32, 0.03, 8, 20),
          new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.75 })
        );
        crystalGroup.add(halo);
      } else if (card.factionId === 'TERRA') {
        col = 0x10b981;
        emissiveCol = 0x6ee7b7;
        geo = new THREE.DodecahedronGeometry(0.24, 0);
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(0.3, 0.03, 8, 20),
          new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.75 })
        );
        crystalGroup.add(halo);
      } else if (card.factionId === 'UMBRI') {
        col = 0x9333ea;
        emissiveCol = 0xc084fc;
        geo = new THREE.OctahedronGeometry(0.25, 0);
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(0.3, 0.03, 8, 20),
          new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.75 })
        );
        crystalGroup.add(halo);
      } else if (card.factionId === 'AETHER') {
        col = 0x06b6d4;
        emissiveCol = 0x67e8f9;
        geo = new THREE.IcosahedronGeometry(0.23, 0);
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(0.32, 0.03, 8, 20),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 })
        );
        crystalGroup.add(halo);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: emissiveCol,
        emissiveIntensity: 0.85,
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.92,
      });

      const gem = new THREE.Mesh(geo, mat);
      crystalGroup.add(gem);

      const rad = 1.35;
      crystalGroup.position.set(Math.cos(angle) * rad, 1.7, Math.sin(angle) * rad);
      crystalGroup.userData = { baseAngle: angle, baseRad: rad, baseY: 1.7 };

      orbitGroup.add(crystalGroup);
    });

    return orbitGroup;
  }

  private buildReticle(): void {
    const geo = new THREE.RingGeometry(0.5, 1.0, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    this.reticleMesh = new THREE.Mesh(geo, mat);
    this.reticleMesh.position.y = 0.14;
    this.reticleMesh.visible = false;
    this.scene.add(this.reticleMesh);
  }

  public setInstanceEnvironmentTheme(templateId: InstanceTemplateId): void {
    if (this.currentThemeId === templateId) return;
    this.currentThemeId = templateId;
    const def = INSTANCES_REGISTRY[templateId] ?? INSTANCES_REGISTRY.open_world_nexus;

    this.scene.background = new THREE.Color(def.skyColor);
    this.scene.fog = new THREE.FogExp2(def.fogColor, 0.0035);
    (this.groundMesh.material as THREE.MeshStandardMaterial).color.set(
      templateId === 'open_world_nexus' ? '#ffffff' : def.groundColor
    );
  }

  public syncWorldState(params: {
    players: PlayerEntity[];
    npcs: NpcEntity[];
    groundZones: GroundZone[];
    relicNodes: RelicNodeEntity[];
    myPlayerId: string | null;
    myTargetId: string | null;
    isHostileToMe?: (ent: EntityBase) => boolean;
  }): void {
    this.myPlayerId = params.myPlayerId;
    this.myTargetId = params.myTargetId;

    if (this.fallback2D) {
      this.fallback2D.syncState({
        players: params.players,
        npcs: params.npcs,
        groundZones: params.groundZones,
        relicNodes: params.relicNodes,
        myTargetId: params.myTargetId,
      });
    }

    const activeIds = new Set<string>();
    this.playerDataMap.clear();
    this.npcDataMap.clear();

    for (const p of params.players) {
      activeIds.add(p.id);
      this.playerDataMap.set(p.id, p);
      const isLocal = p.id === params.myPlayerId;
      const isHostile = isLocal ? false : params.isHostileToMe ? params.isHostileToMe(p) : false;
      let rig = this.actorRigs.get(p.id);
      if (!rig || rig.classId !== p.classId) {
        if (rig) this.scene.remove(rig.rootGroup);
        rig = this.modelLoader.createActorRig({
          factionId: p.factionId,
          classId: p.classId,
          name: p.name,
          subtitle: `${p.classId.replace('_', ' ')}`,
          isLocalPlayer: isLocal,
          isHostile,
          scale: 1.0,
        });
        this.scene.add(rig.rootGroup);
        this.actorRigs.set(p.id, rig);
      }
      rig.rootGroup.userData.entityId = p.id;

      rig.targetPos.set(p.x, p.z, p.y);
      rig.targetRotY = Math.atan2(Math.cos(p.facingRad), Math.sin(p.facingRad));
      if (!rig.hasInitializedPos) {
        rig.rootGroup.position.copy(rig.targetPos);
        rig.rootGroup.rotation.y = rig.targetRotY;
        rig.hasInitializedPos = true;
      }

      rig.castAuraRing.visible = Boolean(p.activeCast);
      if (!isLocal) {
        rig.fadeToAction(p.animState, 0.15);
      }

      // Update Mount visual state
      if (p.isMounted) {
        if (!this.playerMounts.has(p.id)) {
          const dummyMixer = new THREE.AnimationMixer(new THREE.Group());
          this.playerMounts.set(p.id, { group: new THREE.Group(), mixer: dummyMixer });
          this.createEmberwingHawkMount().then((mount) => {
            if (this.playerMounts.has(p.id)) {
              this.playerMounts.set(p.id, mount);
              rig.rootGroup.add(mount.group);
            }
          });
        }
      } else if (this.playerMounts.has(p.id)) {
        const mount = this.playerMounts.get(p.id);
        if (mount) {
          rig.rootGroup.remove(mount.group);
          mount.mixer.stopAllAction();
        }
        this.playerMounts.delete(p.id);
      }

      // Update Relic Constellation Orbit VFX (3D equipped TCG Relics)
      const deckKey = (p.equippedRelicDeck || []).join(',');
      const existingOrbit = this.playerRelicOrbits.get(p.id);
      if (!existingOrbit || existingOrbit.cardIdsKey !== deckKey) {
        if (existingOrbit) {
          rig.rootGroup.remove(existingOrbit.group);
        }
        const newGroup = this.buildRelicOrbitGroup(p.equippedRelicDeck || []);
        rig.rootGroup.add(newGroup);
        this.playerRelicOrbits.set(p.id, { group: newGroup, cardIdsKey: deckKey });
      }
    }

    for (const n of params.npcs) {
      if (n.isDead) continue;
      activeIds.add(n.id);
      this.npcDataMap.set(n.id, n);
      const isHostile = params.isHostileToMe ? params.isHostileToMe(n) : n.isHostile;
      let rig = this.actorRigs.get(n.id);
      if (!rig) {
        rig = this.modelLoader.createActorRig({
          factionId: n.factionId,
          name: n.name,
          subtitle: n.title,
          isBoss: n.npcType === 'ELITE_BOSS',
          isDummy: n.npcType === 'TRAINING_DUMMY',
          isHostile,
          glbPath: n.modelId,
        });
        this.scene.add(rig.rootGroup);
        this.actorRigs.set(n.id, rig);
      }
      rig.rootGroup.userData.entityId = n.id;

      rig.targetPos.set(n.x, n.z, n.y);
      rig.targetRotY = Math.atan2(Math.cos(n.facingRad), Math.sin(n.facingRad));
      if (!rig.hasInitializedPos) {
        rig.rootGroup.position.copy(rig.targetPos);
        rig.rootGroup.rotation.y = rig.targetRotY;
        rig.hasInitializedPos = true;
      }

      rig.castAuraRing.visible = Boolean(n.activeCast);
      rig.fadeToAction(n.animState, 0.18);
    }

    for (const [id, rig] of this.actorRigs.entries()) {
      if (!activeIds.has(id)) {
        const mount = this.playerMounts.get(id);
        if (mount) {
          rig.rootGroup.remove(mount.group);
          mount.mixer.stopAllAction();
          this.playerMounts.delete(id);
        }
        const orbit = this.playerRelicOrbits.get(id);
        if (orbit) {
          rig.rootGroup.remove(orbit.group);
          this.playerRelicOrbits.delete(id);
        }
        this.scene.remove(rig.rootGroup);
        this.actorRigs.delete(id);
      }
    }

    const activeZoneIds = new Set<string>();
    for (const z of params.groundZones) {
      activeZoneIds.add(z.id);
      let zGroup = this.groundZoneMeshes.get(z.id);
      if (!zGroup) {
        zGroup = this.createGroundZoneMesh(z);
        this.scene.add(zGroup);
        this.groundZoneMeshes.set(z.id, zGroup);
      }
      zGroup.position.set(z.x, 0.12, z.y);
    }
    for (const [zid, mesh] of this.groundZoneMeshes.entries()) {
      if (!activeZoneIds.has(zid)) {
        this.scene.remove(mesh);
        this.groundZoneMeshes.delete(zid);
      }
    }

    const activeNodeIds = new Set<string>();
    for (const r of params.relicNodes) {
      activeNodeIds.add(r.id);
      let nGroup = this.relicNodeMeshes.get(r.id);
      if (!nGroup) {
        nGroup = this.createRelicNodeMesh(r);
        this.scene.add(nGroup);
        this.relicNodeMeshes.set(r.id, nGroup);
      }
      nGroup.visible = r.isAvailable;
      nGroup.position.set(r.x, 0, r.y);
    }
    for (const [nid, mesh] of this.relicNodeMeshes.entries()) {
      if (!activeNodeIds.has(nid)) {
        this.scene.remove(mesh);
        this.relicNodeMeshes.delete(nid);
      }
    }
  }

  public triggerLocalHeroAbilityVfx(params: {
    pos: { x: number; z: number; rotY: number };
    school: SpellSchool;
    targetType: string;
    isCast: boolean;
    isRanged: boolean;
    targetPos?: { x: number; y: number; z?: number };
  }): void {
    const colorHex =
      params.school === 'RADIANT'
        ? 0xfde047
        : params.school === 'NATURE'
        ? 0x34d399
        : params.school === 'SHADOW'
        ? 0xc084fc
        : params.school === 'ARCANE'
        ? 0x38bdf8
        : 0xf87171;

    const isSelf = params.targetType === 'SELF';
    const isAoE =
      params.targetType === 'PBAOE' ||
      params.targetType === 'CONE' ||
      params.targetType === 'GROUND_RETICLE';

    if (this.myPlayerId) {
      const myRig = this.actorRigs.get(this.myPlayerId);
      if (myRig) {
        if (isSelf || params.isCast) {
          myRig.fadeToAction('Attack_Cast', 0.12, params.isCast ? 800 : 450);
        } else {
          myRig.fadeToAction('Attack_Melee_1', 0.1, 400);
        }
      }
    }

    // 1. Self buffs & defensives (e.g. Thornbark Carapace): Vertical aura sparkle, NO ground slash wave
    if (isSelf) {
      this.createBurst(params.pos.x, 1.5, params.pos.z, colorHex, 8);
      return;
    }

    // 2. True AoE abilities (PBAOE, CONE, GROUND_RETICLE): Spawns expanding ground shockwave
    if (isAoE) {
      const isCone = params.targetType === 'CONE';
      this.spawnSlashWave(params.pos.x, params.pos.z, params.pos.rotY, colorHex, !isCone);
      this.createBurst(params.pos.x, 1.2, params.pos.z, colorHex, 12);
      return;
    }

    // 3. Single-target melee attacks (e.g. Tectonic Slam):
    // Direct strike impact on the target — NO ground slash wave ring under hero!
    if (params.targetPos && !params.isRanged) {
      this.createBurst(params.targetPos.x, (params.targetPos.z ?? 1.2) + 0.8, params.targetPos.y, colorHex, 6);
    }
  }

  public triggerLocalHeroAttackVfx(
    localPos: { x: number; z: number; rotY: number },
    school: SpellSchool,
    isWideAoE: boolean,
    isCast: boolean
  ): void {
    this.triggerLocalHeroAbilityVfx({
      pos: localPos,
      school,
      targetType: isWideAoE ? 'PBAOE' : 'ENEMY',
      isCast,
      isRanged: isCast,
    });
  }

  public spawnSlashWave(
    x: number,
    z: number,
    rotY: number,
    colorHex = 0x38bdf8,
    isWideAoE = false
  ): void {
    const ringGeo = isWideAoE
      ? new THREE.RingGeometry(1.2, 2.8, 32)
      : new THREE.RingGeometry(0.8, 2.0, 24, 1, -Math.PI * 0.4, Math.PI * 0.8);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
    });
    const wave = new THREE.Mesh(ringGeo, ringMat);
    wave.rotation.x = -Math.PI / 2;
    wave.rotation.z = rotY;
    wave.position.set(x, 1.25, z);
    this.scene.add(wave);
    this.slashWaves.push({ mesh: wave, isWide: isWideAoE, life: 14 });
  }

  public createBurst(x: number, y: number, z: number, colorHex: number, count = 12): void {
    const geo = new THREE.SphereGeometry(0.16, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.set(x, y, z);
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.36,
          0.08 + Math.random() * 0.28,
          (Math.random() - 0.5) * 0.36
        ),
        life: 24,
      });
    }
  }

  private createGroundZoneMesh(zone: GroundZone): THREE.Group {
    const group = new THREE.Group();
    const colorHex =
      zone.school === 'RADIANT'
        ? 0xfde047
        : zone.school === 'NATURE'
        ? 0x34d399
        : zone.school === 'SHADOW'
        ? 0xc084fc
        : 0x38bdf8;

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(zone.radiusYards, 36),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
      })
    );
    disc.rotateX(-Math.PI / 2);
    group.add(disc);

    const border = new THREE.Mesh(
      new THREE.RingGeometry(zone.radiusYards - 0.25, zone.radiusYards, 36),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    );
    border.rotateX(-Math.PI / 2);
    border.position.y = 0.02;
    group.add(border);

    return group;
  }

  private createRelicNodeMesh(node: RelicNodeEntity): THREE.Group {
    const faction = FACTIONS_REGISTRY[node.factionId];
    const group = new THREE.Group();

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.85, 0),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(faction.accentColor),
        emissive: new THREE.Color(faction.bannerColor),
        emissiveIntensity: 0.9,
        roughness: 0.1,
      })
    );
    crystal.position.y = 2.15;
    crystal.name = 'RelicCrystal';
    group.add(crystal);

    // Attach 3D Treasure Chest GLB at base of Relic Node
    this.modelLoader.loadGlbCached('/assets/chest.glb').then((gltf) => {
      if (gltf) {
        const chest = gltf.scene.clone();
        this.modelLoader.fitModelToHeight(chest, 1.35, 0);
        group.add(chest);
      }
    });

    const banner = createBannerSprite(
      node.name.toUpperCase(),
      '[G] Harvest Glimmerfall TCG Relic',
      faction.accentColor,
      '💎',
      4.2,
      1.2
    );
    banner.position.y = 3.5;
    group.add(banner);

    return group;
  }

  public spawnSpellProjectileVfx(
    source: EntityBase,
    target: EntityBase,
    school?: SpellSchool
  ): void {
    const colorHex =
      school === 'RADIANT'
        ? 0xfde047
        : school === 'NATURE'
        ? 0x4ade80
        : school === 'SHADOW'
        ? 0xc084fc
        : school === 'ARCANE'
        ? 0x38bdf8
        : 0xf87171;

    const orbGroup = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 10, 10),
      new THREE.MeshBasicMaterial({ color: colorHex })
    );
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 10, 10),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.38,
      })
    );
    orbGroup.add(core, halo);
    this.scene.add(orbGroup);

    this.projectiles.push({
      mesh: orbGroup,
      from: new THREE.Vector3(source.x, (source.z ?? 0) + 1.5, source.y),
      to: new THREE.Vector3(target.x, (target.z ?? 0) + 1.4, target.y),
      colorHex,
      createdAtMs: performance.now(),
      durationMs: 220,
    });
  }

  public updateReticlePreview(
    visible: boolean,
    worldX: number,
    worldY: number,
    radiusYards: number
  ): void {
    this.reticleMesh.visible = visible;
    if (visible) {
      this.reticleMesh.position.set(worldX, 0.15, worldY);
      this.reticleMesh.scale.setScalar(radiusYards);
    }
  }

  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private raycastHitVec = new THREE.Vector3();

  public raycastEntity(ndcX: number, ndcY: number): string | null {
    if (!this.camera) return null;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    const candidateGroups: THREE.Object3D[] = [];
    for (const [id, rig] of this.actorRigs.entries()) {
      if (id === this.myPlayerId) continue;
      const ent = this.npcDataMap.get(id) ?? this.playerDataMap.get(id);
      if (ent && ent.isDead) continue;
      candidateGroups.push(rig.rootGroup);
    }

    if (candidateGroups.length === 0) return null;

    const hits = this.raycaster.intersectObjects(candidateGroups, true);
    for (const hit of hits) {
      let curr: THREE.Object3D | null = hit.object;
      while (curr) {
        if (curr.userData && curr.userData.entityId) {
          return curr.userData.entityId as string;
        }
        curr = curr.parent;
      }
    }
    return null;
  }

  public raycastGroundPoint(ndcX: number, ndcY: number): { x: number; y: number } | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = this.raycaster.intersectObject(this.groundMesh, false);
    if (hits.length > 0) {
      return { x: hits[0].point.x, y: hits[0].point.z };
    }
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, this.raycastHitVec);
    if (hit) {
      return { x: hit.x, y: hit.z };
    }
    return null;
  }

  public projectWorldToScreen(
    worldX: number,
    heightY: number,
    worldZ: number
  ): { x: number; y: number; visible: boolean } {
    if (this.fallback2D) {
      const p = this.fallback2D.project(
        worldX,
        heightY,
        worldZ,
        this.lastCamTarget.x,
        this.lastCamTarget.z,
        this.cameraYaw,
        this.cameraDistance
      );
      return { x: p.x, y: p.y, visible: p.visible };
    }
    const v = new THREE.Vector3(worldX, heightY, worldZ);
    v.project(this.camera);
    if (v.z > 1) {
      return { x: 0, y: 0, visible: false };
    }
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;
    return { x, y, visible: true };
  }

  public renderFrame(
    myPlayer: PlayerEntity | null,
    localPred?: LocalPlayerPrediction | null
  ): void {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const nowPerf = performance.now();

    if (this.isCinematicOrbit) {
      this.cameraYaw += dt * 0.22;
    }

    for (const m of this.ambientMixers) {
      m.update(dt);
    }

    // 60FPS Actor Position & Shortest-Angle Rotation Interpolation
    for (const [id, rig] of this.actorRigs.entries()) {
      rig.mixer.update(dt);
      if (rig.castAuraRing.visible) {
        rig.castAuraRing.rotation.z += dt * 2.5;
      }

      if (id === this.myPlayerId && localPred) {
        // Immediate 60FPS client-predicted position & rotation for local hero
        rig.rootGroup.position.set(localPred.x, localPred.heightY, localPred.z);
        rig.rootGroup.rotation.y = localPred.rotY;
        rig.fadeToAction(localPred.animState, 0.14);
      } else {
        // Smooth 60FPS interpolation for NPCs & other players
        const prevX = rig.rootGroup.position.x;
        const prevZ = rig.rootGroup.position.z;
        rig.rootGroup.position.lerp(rig.targetPos, Math.min(1, dt * 14));
        rig.rootGroup.rotation.y = lerpAngle(
          rig.rootGroup.rotation.y,
          rig.targetRotY,
          Math.min(1, dt * 12)
        );

        // Fail-safe: if remote entity is stationary (not moving in world), ensure they don't loop Run animation in place
        const ent = this.npcDataMap.get(id) ?? this.playerDataMap.get(id);
        const actualMove = Math.hypot(rig.rootGroup.position.x - prevX, rig.rootGroup.position.z - prevZ);
        const distToTarget = Math.hypot(rig.targetPos.x - rig.rootGroup.position.x, rig.targetPos.z - rig.rootGroup.position.z);
        if (
          ent &&
          (ent.animState === 'Run' || ent.animState === 'Sprint') &&
          distToTarget < 0.08 &&
          actualMove < 0.005 &&
          !ent.activeCast
        ) {
          rig.fadeToAction('Idle', 0.25);
        }
      }

      const ent = this.npcDataMap.get(id) ?? this.playerDataMap.get(id);
      if (ent) {
        rig.updateBillboardAndHp(
          ent.hp,
          ent.maxHp,
          this.camera.position,
          id === this.myTargetId
        );
      }
    }

    // Update active Emberwing Hawk mounts & trailing fiery ember particles
    for (const [id, mount] of this.playerMounts.entries()) {
      mount.mixer.update(dt);
      const ent = this.playerDataMap.get(id);
      if (ent && (ent.animState === 'Run' || ent.animState === 'Sprint' || ent.animState === 'Flight')) {
        if (Math.random() < 0.32) {
          this.createBurst(ent.x, (ent.z || 1.8) + 0.35, ent.y, 0xf97316, 2);
        }
      }
    }

    // Animate levitating Aether Rift floating island rocks
    for (const rock of this.floatingRiftRocks) {
      if (rock.userData && rock.userData.baseY !== undefined) {
        rock.position.y = rock.userData.baseY + Math.sin(nowPerf * 0.002 + rock.userData.phase) * 0.75;
        rock.rotation.y += dt * 0.35;
      }
    }

    // Animate orbiting 3D TCG Relic Constellation gems around players
    for (const orbit of this.playerRelicOrbits.values()) {
      orbit.group.rotation.y += dt * 1.6;
      orbit.group.children.forEach((child, i) => {
        if (child.name.startsWith('RelicCrystal_')) {
          child.position.y = 1.7 + Math.sin(nowPerf * 0.0035 + i * 1.8) * 0.12;
          child.rotation.x += dt * 1.5;
          child.rotation.z += dt * 1.1;
        }
      });
    }

    for (const r of this.rotatingRings) {
      r.rotation.y += dt * 0.9;
    }
    for (const nGroup of this.relicNodeMeshes.values()) {
      const crystal = nGroup.getObjectByName('RelicCrystal');
      if (crystal) {
        crystal.rotation.y += dt * 1.6;
        crystal.position.y = 2.15 + Math.sin(nowPerf * 0.003) * 0.22;
      }
    }

    // Update 3D Slash Waves (Arcanastride combat VFX)
    for (let i = this.slashWaves.length - 1; i >= 0; i--) {
      const sw = this.slashWaves[i];
      sw.mesh.scale.multiplyScalar(sw.isWide ? 1.16 : 1.12);
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity *= 0.85;
      sw.life -= 1;
      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        this.slashWaves.splice(i, 1);
      }
    }

    // Update 3D Burst Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.add(p.vel);
      p.life -= 1;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    // Update Spell Projectiles
    const activeProj: ActiveSpellProjectile3D[] = [];
    for (const p of this.projectiles) {
      const t = Math.min(1, (nowPerf - p.createdAtMs) / p.durationMs);
      p.mesh.position.lerpVectors(p.from, p.to, t);
      if (t < 1) {
        activeProj.push(p);
      } else {
        this.createBurst(p.to.x, p.to.y, p.to.z, p.colorHex, 10);
        this.scene.remove(p.mesh);
      }
    }
    this.projectiles = activeProj;

    const heroX = localPred ? localPred.x : myPlayer ? myPlayer.x : 0;
    const heroY = localPred ? localPred.heightY : myPlayer ? myPlayer.z : 0;
    const heroZ = localPred ? localPred.z : myPlayer ? myPlayer.y : 0;

    const targetX = this.isCinematicOrbit ? 0 : heroX;
    const targetY = this.isCinematicOrbit ? 4.5 : heroY + 2.0;
    const targetZ = this.isCinematicOrbit ? 0 : heroZ;
    this.lastCamTarget = { x: targetX, z: targetZ };

    const dist = this.isCinematicOrbit ? 30 : this.cameraDistance;
    const pitch = this.isCinematicOrbit ? 0.38 : this.cameraPitch;

    const horizDist = dist * Math.cos(pitch);
    const vertDist = dist * Math.sin(pitch);

    const camX = targetX + Math.sin(this.cameraYaw) * horizDist;
    const camY = Math.max(1.4, targetY + vertDist);
    const camZ = targetZ + Math.cos(this.cameraYaw) * horizDist;

    this.cameraTargetVec.set(camX, camY, camZ);
    if (this.isCinematicOrbit) {
      this.camera.position.copy(this.cameraTargetVec);
    } else {
      this.camera.position.lerp(this.cameraTargetVec, 0.22);
    }
    this.camera.lookAt(targetX, targetY, targetZ);

    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    } else if (this.fallback2D) {
      this.fallback2D.render(myPlayer, this.cameraYaw, dist);
    }
  }
}

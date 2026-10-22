import {
  GroundZone,
  NpcEntity,
  PlayerEntity,
  RelicNodeEntity,
} from '../../shared/types';
import { FACTIONS_REGISTRY } from '../../shared/factionsRegistry';

export class CanvasFallback3D {
  private ctx: CanvasRenderingContext2D | null;
  private canvas: HTMLCanvasElement;
  private players: PlayerEntity[] = [];
  private npcs: NpcEntity[] = [];
  private groundZones: GroundZone[] = [];
  private relicNodes: RelicNodeEntity[] = [];
  private myTargetId: string | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  public syncState(params: {
    players: PlayerEntity[];
    npcs: NpcEntity[];
    groundZones: GroundZone[];
    relicNodes: RelicNodeEntity[];
    myTargetId: string | null;
  }): void {
    this.players = params.players;
    this.npcs = params.npcs;
    this.groundZones = params.groundZones;
    this.relicNodes = params.relicNodes;
    this.myTargetId = params.myTargetId;
  }

  public project(
    worldX: number,
    heightY: number,
    worldZ: number,
    camTargetX: number,
    camTargetZ: number,
    yaw: number,
    distance: number
  ): { x: number; y: number; scale: number; visible: boolean } {
    const dx = worldX - camTargetX;
    const dz = worldZ - camTargetZ;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);

    // Rotate relative to camera yaw
    const rx = dx * cosY - dz * sinY;
    const rz = dx * sinY + dz * cosY + distance * 1.35;

    if (rz <= 1.0) {
      return { x: 0, y: 0, scale: 1, visible: false };
    }

    const fovScale = (this.canvas.height * 0.72) / rz;
    const sx = this.canvas.width / 2 + rx * fovScale;
    const sy = this.canvas.height * 0.44 + (4.2 - heightY) * fovScale;
    return { x: sx, y: sy, scale: fovScale, visible: true };
  }

  public render(
    myPlayer: PlayerEntity | null,
    yaw: number,
    distance: number
  ): void {
    const ctx = this.ctx;
    if (!ctx) return; // No 2D backend available — HTML portal/HUD still work
    const w = (this.canvas.width = window.innerWidth);
    const h = (this.canvas.height = window.innerHeight);

    // 1. Celestial Gradient Sky & Horizon
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#0b1528');
    skyGrad.addColorStop(0.45, '#162647');
    skyGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    const cx = myPlayer ? myPlayer.x : Math.sin(performance.now() * 0.0003) * 8;
    const cz = myPlayer ? myPlayer.y : Math.cos(performance.now() * 0.0003) * 8;

    // 2. Render 3D Perspective Ley-Line Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 1;
    for (let gx = -90; gx <= 90; gx += 10) {
      const p1 = this.project(gx, 0, -90, cx, cz, yaw, distance);
      const p2 = this.project(gx, 0, 90, cx, cz, yaw, distance);
      if (p1.visible && p2.visible) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
    for (let gz = -90; gz <= 90; gz += 10) {
      const p1 = this.project(-90, 0, gz, cx, cz, yaw, distance);
      const p2 = this.project(90, 0, gz, cx, cz, yaw, distance);
      if (p1.visible && p2.visible) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // 3. Render Central Nexus Spire
    const spireBase = this.project(0, 0, 0, cx, cz, yaw, distance);
    const spireTop = this.project(0, 12, 0, cx, cz, yaw, distance);
    if (spireBase.visible && spireTop.visible) {
      ctx.beginPath();
      ctx.moveTo(spireBase.x - spireBase.scale * 2.2, spireBase.y);
      ctx.lineTo(spireTop.x, spireTop.y);
      ctx.lineTo(spireBase.x + spireBase.scale * 2.2, spireBase.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.fill();
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 4. Render Ground AoE Zones
    for (const z of this.groundZones) {
      const p = this.project(z.x, 0, z.y, cx, cz, yaw, distance);
      if (!p.visible) continue;
      ctx.beginPath();
      ctx.ellipse(
        p.x,
        p.y,
        Math.max(8, z.radiusYards * p.scale),
        Math.max(4, z.radiusYards * p.scale * 0.45),
        0,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();
    }

    // 5. Render Relic Nodes
    for (const r of this.relicNodes) {
      if (!r.isAvailable) continue;
      const p = this.project(r.x, 1.5, r.y, cx, cz, yaw, distance);
      if (!p.visible) continue;
      const fac = FACTIONS_REGISTRY[r.factionId];
      ctx.fillStyle = fac.accentColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(5, p.scale * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Render Actors (NPCs + Players) sorted back-to-front
    const all = [...this.npcs.filter((n) => !n.isDead), ...this.players.filter((p) => !p.isDead)];
    for (const ent of all) {
      const pFoot = this.project(ent.x, ent.z ?? 0, ent.y, cx, cz, yaw, distance);
      const pHead = this.project(ent.x, (ent.z ?? 0) + 2.2, ent.y, cx, cz, yaw, distance);
      if (!pFoot.visible || !pHead.visible) continue;

      const fac = FACTIONS_REGISTRY[ent.factionId];
      const hPx = Math.max(18, Math.abs(pFoot.y - pHead.y));
      const wPx = hPx * 0.48;

      if (ent.id === this.myTargetId) {
        ctx.beginPath();
        ctx.ellipse(pFoot.x, pFoot.y, wPx * 0.9, wPx * 0.4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = fac.bannerColor;
      ctx.fillRect(pFoot.x - wPx / 2, pHead.y, wPx, hPx);
      ctx.strokeStyle = fac.accentColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(pFoot.x - wPx / 2, pHead.y, wPx, hPx);
    }
  }
}

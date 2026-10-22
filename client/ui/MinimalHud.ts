import {
  AbilityDefinition,
  ActiveInstanceSummary,
  ClassId,
  ClientPacket,
  CombatLogEvent,
  EntityBase,
  InstanceTemplateId,
  NpcEntity,
  PlayerEntity,
  PrimaryAttributes,
  QueueRole,
  QueueStatusState,
  RelicNodeEntity,
} from '../../shared/types';
import { ALL_ABILITIES, CLASSES_REGISTRY } from '../../shared/classesRegistry';
import { FACTIONS_REGISTRY, TCG_RELIC_CARDS, TCG_RELIC_BY_ID } from '../../shared/factionsRegistry';
import { TALENTS_REGISTRY } from '../../shared/talentsRegistry';
import { CLASS_GLB_MODELS, INSTANCES_REGISTRY } from '../../shared/instancesRegistry';
import { keybindService, KeybindConfig, KEYBIND_LABELS } from '../services/keybindService';

export const TACTICAL_SLOT_LABELS = ['LMB', 'RMB', 'Q', 'E', 'R', 'F'] as const;

export interface MinimalHudCallbacks {
  sendPacket: (packet: ClientPacket) => void;
  getPlayer: () => PlayerEntity | null;
  getTarget: () => EntityBase | null;
  getPlayers: () => PlayerEntity[];
  getNpcs: () => NpcEntity[];
  getRelicNodes: () => RelicNodeEntity[];
  getInstanceInfo: () => ActiveInstanceSummary | null;
  getQueueStatus: () => QueueStatusState | null;
  getServerTimeMs: () => number;
  getCameraYaw: () => number;
  projectToScreen: (x: number, heightY: number, z: number) => { x: number; y: number; visible: boolean };
  onAbilityTriggered: (ability: AbilityDefinition) => void;
  onTeleportToBiome: (x: number, y: number) => void;
  isHostileToMe?: (ent: EntityBase) => boolean;
}

interface FloatingWorldNumber {
  id: string;
  worldX: number;
  worldY: number;
  worldZ: number;
  text: string;
  color: string;
  isCrit: boolean;
  createdAtMs: number;
}

interface CombatLogEntry {
  id: string;
  time: string;
  filterType: 'INCOMING' | 'OUTGOING' | 'SYSTEM';
  styleClass: 'incoming' | 'outgoing' | 'heal' | 'system';
  text: string;
}

export class MinimalHud {
  private cb: MinimalHudCallbacks;
  public activeModal: 'NONE' | 'LOADOUT_K' | 'INSTANCE_I' | 'HERO_C' | 'TALENTS_N' | 'KEYBINDS_O' = 'NONE';
  private selectedQueueRole: QueueRole = 'DPS';
  private assigningTacticalSlotIndex: number | null = null;
  private floatingNumbers: FloatingWorldNumber[] = [];
  private seenEventIds: Set<string> = new Set();
  private combatLogFilter: 'ALL' | 'INCOMING' | 'OUTGOING' = 'ALL';
  private combatLogEntries: CombatLogEntry[] = [];
  public listeningKeyAction: keyof KeybindConfig | null = null;

  constructor(callbacks: MinimalHudCallbacks) {
    this.cb = callbacks;
    this.initDomBindings();
    keybindService.subscribe(() => {
      this.updateTacticalSlotKeyLabels();
      if (this.activeModal === 'KEYBINDS_O') {
        this.renderModalContent();
      }
    });
  }

  private initDomBindings(): void {
    this.updateTacticalSlotKeyLabels();

    document.getElementById('btn-open-k')?.addEventListener('click', () => this.toggleModal('LOADOUT_K'));
    document.getElementById('btn-open-i')?.addEventListener('click', () => this.toggleModal('INSTANCE_I'));
    document.getElementById('btn-open-c')?.addEventListener('click', () => this.toggleModal('HERO_C'));
    document.getElementById('player-faction-crest-badge')?.addEventListener('click', () => this.toggleModal('HERO_C'));
    document.getElementById('btn-open-n')?.addEventListener('click', () => this.toggleModal('TALENTS_N'));
    document.getElementById('btn-open-o')?.addEventListener('click', () => this.toggleModal('KEYBINDS_O'));
    document.getElementById('btn-toggle-mount')?.addEventListener('click', () => {
      this.cb.sendPacket({ type: 'TOGGLE_MOUNT' });
    });
    document.getElementById('queue-pulse-badge')?.addEventListener('click', () => this.toggleModal('INSTANCE_I'));
    document.getElementById('btn-leave-instance')?.addEventListener('click', () => {
      this.cb.sendPacket({ type: 'LEAVE_INSTANCE' });
    });
    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.toggleModal('NONE'));

    // Combat Log Tabs, Collapse & Moveable Dragging
    const logEl = document.getElementById('hud-combat-log');
    const clHeader = document.getElementById('cl-header');
    if (logEl && clHeader) {
      try {
        const savedPos = localStorage.getItem('glimmerfall_combat_log_pos');
        if (savedPos) {
          const { left, top } = JSON.parse(savedPos);
          if (typeof left === 'number' && typeof top === 'number') {
            logEl.style.left = `${Math.max(0, Math.min(window.innerWidth - 300, left))}px`;
            logEl.style.top = `${Math.max(0, Math.min(window.innerHeight - 100, top))}px`;
            logEl.style.bottom = 'auto';
          }
        }
      } catch {}

      let isDraggingLog = false;
      let startX = 0;
      let startY = 0;
      let initialLeft = 0;
      let initialTop = 0;

      clHeader.addEventListener('mousedown', (ev: MouseEvent) => {
        if ((ev.target as HTMLElement).tagName === 'BUTTON') return;
        isDraggingLog = true;
        startX = ev.clientX;
        startY = ev.clientY;
        const rect = logEl.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        ev.preventDefault();
      });

      window.addEventListener('mousemove', (ev: MouseEvent) => {
        if (!isDraggingLog) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const newLeft = Math.max(0, Math.min(window.innerWidth - logEl.offsetWidth, initialLeft + dx));
        const newTop = Math.max(0, Math.min(window.innerHeight - logEl.offsetHeight, initialTop + dy));
        logEl.style.left = `${newLeft}px`;
        logEl.style.top = `${newTop}px`;
        logEl.style.bottom = 'auto';
      });

      window.addEventListener('mouseup', () => {
        if (isDraggingLog) {
          isDraggingLog = false;
          const rect = logEl.getBoundingClientRect();
          try {
            localStorage.setItem(
              'glimmerfall_combat_log_pos',
              JSON.stringify({ left: rect.left, top: rect.top })
            );
          } catch {}
        }
      });
    }

    document.querySelectorAll<HTMLButtonElement>('#hud-combat-log .cl-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#hud-combat-log .cl-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.combatLogFilter = (tab.getAttribute('data-filter') as any) ?? 'ALL';
        this.renderCombatLog();
      });
    });

    document.getElementById('btn-clear-cl')?.addEventListener('click', () => {
      this.combatLogEntries = [];
      this.renderCombatLog();
    });

    document.getElementById('btn-toggle-cl')?.addEventListener('click', () => {
      if (logEl) {
        logEl.classList.toggle('collapsed');
        const btn = document.getElementById('btn-toggle-cl');
        if (btn) btn.textContent = logEl.classList.contains('collapsed') ? '+' : '−';
      }
    });

    // Ready Check Pop Accept / Decline buttons
    document.getElementById('btn-accept-pop')?.addEventListener('click', () => {
      this.cb.sendPacket({ type: 'QUEUE_ACCEPT_POP' });
      this.toggleModal('NONE');
    });
    document.getElementById('btn-decline-pop')?.addEventListener('click', () => {
      this.cb.sendPacket({ type: 'QUEUE_LEAVE' });
    });

    // Global Key Listener for Rebinding
    window.addEventListener('keydown', (ev) => {
      if (this.listeningKeyAction) {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.key === 'Escape') {
          this.listeningKeyAction = null;
          this.renderModalContent();
          return;
        }
        let keyName = ev.key;
        if (ev.code === 'Space') keyName = 'Space';
        else if (ev.key === 'Shift') keyName = 'Shift';
        else if (ev.key === 'Tab') keyName = 'Tab';
        keybindService.setKeybind(this.listeningKeyAction, keyName);
        this.listeningKeyAction = null;
        this.renderModalContent();
      }
    });

    window.addEventListener('mousedown', (ev) => {
      if (this.listeningKeyAction) {
        if (ev.button === 0 || ev.button === 1 || ev.button === 2) {
          // Strictly reject mouse buttons
          this.listeningKeyAction = null;
          this.renderModalContent();
          this.logSystemMessage('⚠️ Mouse buttons (LMB / RMB) are reserved exclusively for camera navigation, clicking buttons, and targeting. Please press a keyboard key.');
        }
      }
    });
  }

  public updateTacticalSlotKeyLabels(): void {
    const clusterEl = document.getElementById('tactical-cluster-slots');
    if (!clusterEl) return;
    clusterEl.innerHTML = '';
    const actions: Array<keyof KeybindConfig> = ['slot0', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5'];
    for (let i = 0; i < 6; i++) {
      const keyLabel = keybindService.getDisplayLabel(actions[i]);
      const slot = document.createElement('div');
      slot.className = `tac-slot tac-slot-${i}`;
      slot.id = `tac-slot-${i}`;
      slot.innerHTML = `
        <span class="tac-key">${keyLabel}</span>
        <div class="tac-icon"></div>
        <div class="tac-cd-sweep"></div>
        <span class="tac-cd-num"></span>
        <span class="tac-name"></span>
      `;
      slot.addEventListener('click', () => {
        const me = this.cb.getPlayer();
        if (!me) return;
        const abId = me.tacticalLoadout[i];
        if (abId && ALL_ABILITIES[abId]) {
          this.cb.onAbilityTriggered(ALL_ABILITIES[abId]);
        }
      });
      clusterEl.appendChild(slot);
    }
  }

  public toggleModal(modal: MinimalHud['activeModal']): void {
    if (this.activeModal === modal) {
      this.activeModal = 'NONE';
    } else {
      this.activeModal = modal;
    }

    const modalEl = document.getElementById('hud-modal');
    if (!modalEl) return;

    if (this.activeModal === 'NONE') {
      modalEl.classList.add('hidden');
      this.assigningTacticalSlotIndex = null;
      this.listeningKeyAction = null;
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    } else {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      modalEl.classList.remove('hidden');
      this.renderModalContent();
    }
  }

  public ingestCombatEvents(events: CombatLogEvent[]): void {
    const now = Date.now();
    const me = this.cb.getPlayer();
    let hasPlayerTakenDamage = false;

    let hasNewEntries = false;
    for (const ev of events) {
      if (this.seenEventIds.has(ev.id)) continue;
      this.seenEventIds.add(ev.id);
      hasNewEntries = true;

      const isMeTarget = me && ev.targetId === me.id;
      const isMeSource = me && ev.sourceId === me.id;

      const date = new Date(ev.timestampMs);
      const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

      if (ev.type === 'SPELL_DAMAGE' || ev.type === 'SWING_DAMAGE') {
        if (isMeTarget) {
          hasPlayerTakenDamage = true;
          this.combatLogEntries.unshift({
            id: ev.id,
            time: timeStr,
            filterType: 'INCOMING',
            styleClass: 'incoming',
            text: `[${timeStr}] 💥 <strong>${ev.sourceName}</strong> hits YOU for <strong>${ev.amount}</strong> ${ev.school} (${ev.abilityName || 'Attack'})${ev.isCrit ? ' [CRIT!]' : ''}`,
          });
        } else if (isMeSource) {
          this.combatLogEntries.unshift({
            id: ev.id,
            time: timeStr,
            filterType: 'OUTGOING',
            styleClass: 'outgoing',
            text: `[${timeStr}] ⚔️ You hit <strong>${ev.targetName}</strong> for <strong>${ev.amount}</strong> ${ev.school} (${ev.abilityName || 'Attack'})${ev.isCrit ? ' [CRIT!]' : ''}`,
          });
        } else {
          this.combatLogEntries.unshift({
            id: ev.id,
            time: timeStr,
            filterType: 'SYSTEM',
            styleClass: 'system',
            text: `[${timeStr}] ${ev.sourceName} hits ${ev.targetName} for ${ev.amount} (${ev.abilityName || 'Attack'})`,
          });
        }

        const target =
          this.cb.getNpcs().find((n) => n.id === ev.targetId) ??
          this.cb.getPlayers().find((p) => p.id === ev.targetId);

        if (target) {
          const color =
            isMeTarget
              ? '#ef4444'
              : ev.school === 'RADIANT'
              ? '#fde047'
              : ev.school === 'NATURE'
              ? '#4ade80'
              : ev.school === 'SHADOW'
              ? '#c084fc'
              : ev.school === 'ARCANE'
              ? '#38bdf8'
              : '#f87171';

          this.floatingNumbers.push({
            id: ev.id,
            worldX: target.x + (Math.random() * 1.4 - 0.7),
            worldY: (target.z ?? 0) + 2.6,
            worldZ: target.y + (Math.random() * 1.4 - 0.7),
            text: `${isMeTarget ? '-' : ''}${ev.amount ?? 0}${ev.isCrit ? '!' : ''}`,
            color,
            isCrit: Boolean(ev.isCrit),
            createdAtMs: now,
          });
        }
      } else if (ev.type === 'SPELL_HEAL') {
        const target =
          this.cb.getNpcs().find((n) => n.id === ev.targetId) ??
          this.cb.getPlayers().find((p) => p.id === ev.targetId);

        this.combatLogEntries.unshift({
          id: ev.id,
          time: timeStr,
          filterType: isMeTarget ? 'INCOMING' : isMeSource ? 'OUTGOING' : 'SYSTEM',
          styleClass: 'heal',
          text: `[${timeStr}] 💚 ${ev.sourceName} heals ${isMeTarget ? 'YOU' : ev.targetName} for +${ev.amount}${ev.isCrit ? ' [CRIT!]' : ''}`,
        });

        if (target) {
          this.floatingNumbers.push({
            id: ev.id,
            worldX: target.x,
            worldY: (target.z ?? 0) + 2.6,
            worldZ: target.y,
            text: `+${ev.amount ?? 0}${ev.isCrit ? '!' : ''}`,
            color: '#34d399',
            isCrit: Boolean(ev.isCrit),
            createdAtMs: now,
          });
        }
      } else if (ev.type === 'SPELL_CAST_START') {
        if (isMeTarget) {
          this.combatLogEntries.unshift({
            id: ev.id,
            time: timeStr,
            filterType: 'INCOMING',
            styleClass: 'incoming',
            text: `[${timeStr}] ⚠️ <strong>${ev.sourceName}</strong> begins casting <strong>${ev.abilityName}</strong> at YOU!`,
          });
        }
      } else if (ev.type === 'SPELL_CAST_FAILED' && isMeSource) {
        if (ev.message) {
          this.showFloatingError(ev.message);
          this.combatLogEntries.unshift({
            id: ev.id,
            time: timeStr,
            filterType: 'SYSTEM',
            styleClass: 'system',
            text: `[${timeStr}] ⚠️ ${ev.message}`,
          });
        }
      } else if (ev.type === 'ANNOUNCEMENT') {
        this.combatLogEntries.unshift({
          id: ev.id,
          time: timeStr,
          filterType: 'SYSTEM',
          styleClass: 'system',
          text: `<span style="color:#fde047; font-weight:800;">[${timeStr}] ${ev.message}</span>`,
        });
      } else if (ev.type === 'LEVEL_UP') {
        this.combatLogEntries.unshift({
          id: ev.id,
          time: timeStr,
          filterType: 'SYSTEM',
          styleClass: 'system',
          text: `<span style="color:#fde047; font-weight:900;">[${timeStr}] ⭐ ${ev.message}</span>`,
        });
        if (isMeTarget || isMeSource) {
          const target = this.cb.getPlayer();
          if (target) {
            this.floatingNumbers.push({
              id: ev.id,
              worldX: target.x,
              worldY: (target.z ?? 0) + 3.2,
              worldZ: target.y,
              text: `⭐ LEVEL UP! LEVEL ${ev.amount} ⭐`,
              color: '#fde047',
              isCrit: true,
              createdAtMs: now,
            });
          }
        }
      } else if (ev.type === 'SPELL_INTERRUPTED') {
        this.combatLogEntries.unshift({
          id: ev.id,
          time: timeStr,
          filterType: 'SYSTEM',
          styleClass: 'system',
          text: `<span style="color:#ef4444; font-weight:700;">[${timeStr}] 🚫 ${ev.message}</span>`,
        });
      }
    }

    if (hasPlayerTakenDamage) {
      const vig = document.getElementById('damage-vignette');
      if (vig) {
        vig.classList.add('active');
        setTimeout(() => vig.classList.remove('active'), 250);
      }
    }

    if (!hasNewEntries) return;

    if (this.combatLogEntries.length > 80) {
      this.combatLogEntries = this.combatLogEntries.slice(0, 80);
    }
    this.renderCombatLog();
  }

  private renderCombatLog(): void {
    const body = document.getElementById('cl-body');
    if (!body) return;
    const filtered = this.combatLogEntries.filter((e) => {
      if (this.combatLogFilter === 'ALL') return true;
      if (this.combatLogFilter === 'INCOMING') return e.filterType === 'INCOMING';
      if (this.combatLogFilter === 'OUTGOING') return e.filterType === 'OUTGOING';
      return true;
    });

    if (filtered.length === 0) {
      const emptyMsg = `<div class="cl-line system">No combat events recorded for "${this.combatLogFilter}".</div>`;
      if (body.innerHTML !== emptyMsg) {
        body.innerHTML = emptyMsg;
      }
      return;
    }

    const newHtml = filtered.slice(0, 40).map((e) => `<div class="cl-line ${e.styleClass}">${e.text}</div>`).join('');
    if (body.innerHTML !== newHtml) {
      body.innerHTML = newHtml;
    }
  }

  public updateFrame(): void {
    const me = this.cb.getPlayer();
    if (!me) return;

    const target = this.cb.getTarget();
    const now = this.cb.getServerTimeMs();
    const cls = CLASSES_REGISTRY[me.classId];
    const faction = FACTIONS_REGISTRY[me.factionId];
    const instInfo = this.cb.getInstanceInfo();
    const qStatus = this.cb.getQueueStatus();

    // 1. Top-Right Mini-Compass & Instance Objective Banner
    const yawDeg = ((this.cb.getCameraYaw() * 180) / Math.PI + 360) % 360;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const cardinal = dirs[Math.round(yawDeg / 45) % 8];
    this.setText(
      'compass-heading',
      `🧭 ${cardinal} (${Math.round(yawDeg)}°) • (${Math.round(me.x)}, ${Math.round(me.y)})`
    );

    if (instInfo) {
      this.setText('compass-zone-title', instInfo.name);
      this.setText('compass-objective', instInfo.objectiveText);
      const leaveBtn = document.getElementById('btn-leave-instance');
      if (leaveBtn) {
        leaveBtn.classList.toggle('hidden', instInfo.instanceId === 'open_world_nexus');
      }
    }

    // 2. Queue Pulse Notification & Ready-Check Pop Overlay
    const qBadge = document.getElementById('queue-pulse-badge');
    const popOverlay = document.getElementById('queue-pop-banner');
    if (qBadge && qStatus) {
      if (qStatus.isQueued) {
        qBadge.classList.remove('hidden');
        const instDef = qStatus.templateId ? INSTANCES_REGISTRY[qStatus.templateId] : null;
        qBadge.textContent = qStatus.popReady
          ? `🔥 QUEUE POPPED: ${instDef?.name ?? 'Instance'}! Click to Enter!`
          : `⏳ Queued (${qStatus.role}): ${instDef?.name ?? ''} [${qStatus.elapsedSec}s]`;
      } else {
        qBadge.classList.add('hidden');
      }

      if (popOverlay) {
        if (qStatus.popReady && qStatus.popTemplateId) {
          const def = INSTANCES_REGISTRY[qStatus.popTemplateId];
          popOverlay.classList.remove('hidden');
          this.setText('pop-instance-title', `${def.name} — ${def.subtitle}`);
          this.setText(
            'pop-party-list',
            qStatus.partyPreview.map((m) => `${m.role}: ${m.name}`).join(' • ')
          );
        } else {
          popOverlay.classList.add('hidden');
        }
      }
    }

    // 3. Nearby Harvestable 3D TCG Relic Node Prompt
    const relicBanner = document.getElementById('relic-harvest-prompt');
    if (relicBanner) {
      const nearbyNode = this.cb
        .getRelicNodes()
        .find((r) => r.isAvailable && Math.hypot(r.x - me.x, r.y - me.y) <= 9.5);
      if (nearbyNode) {
        relicBanner.classList.remove('hidden');
        relicBanner.textContent = `💎 Press [G] to Harvest ${nearbyNode.name} (Unlocks Glimmerfall TCG Relic Card!)`;
      } else {
        relicBanner.classList.add('hidden');
      }
    }

    // 1. Top-Center Opposing Enemy Life Total Frame
    const topBossFrame = document.getElementById('top-enemy-boss-frame');
    let opposingEnemy: EntityBase | null = null;

    const isHostile = (e: EntityBase) => {
      if (this.cb.isHostileToMe) return this.cb.isHostileToMe(e);
      const myFaction = (me.factionId || '').toUpperCase();
      const entFaction = (e.factionId || '').toUpperCase();
      if (e.kind === 'NPC') {
        const npc = e as NpcEntity;
        if (npc.npcType === 'TRAINING_DUMMY') return true;
        if (npc.npcType === 'ALLY_SPIRIT') return false;
        if (npc.isVoidIncursion) return true;
        if (myFaction && entFaction && myFaction === entFaction) return false;
        if (npc.npcType === 'BASE_GUARD') return true;
        if (npc.npcType === 'QUARTERMASTER' || npc.npcType === 'FACTION_LEADER') return false;
        return npc.isHostile;
      }
      if (e.kind === 'PLAYER') {
        const other = e as PlayerEntity;
        return myFaction !== (other.factionId || '').toUpperCase();
      }
      return false;
    };

    if (target && !target.isDead) {
      if (isHostile(target)) {
        opposingEnemy = target;
      } else {
        opposingEnemy = null;
      }
    } else if (me.inCombat) {
      const hostiles = this.cb.getNpcs().filter((n) => !n.isDead && isHostile(n));
      if (hostiles.length > 0) {
        hostiles.sort((a, b) => {
          const aBoss = a.npcType === 'ELITE_BOSS' ? 1 : 0;
          const bBoss = b.npcType === 'ELITE_BOSS' ? 1 : 0;
          if (aBoss !== bBoss) return bBoss - aBoss;
          return Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y);
        });
        if (Math.hypot(hostiles[0].x - me.x, hostiles[0].y - me.y) <= 30) {
          opposingEnemy = hostiles[0];
        }
      }
    }

    if (topBossFrame) {
      if (opposingEnemy && !opposingEnemy.isDead) {
        topBossFrame.classList.remove('hidden');
        this.setText('boss-name', opposingEnemy.name);
        const isBoss = opposingEnemy.kind === 'NPC' && (opposingEnemy as NpcEntity).npcType === 'ELITE_BOSS';
        this.setText('boss-level-badge', `Lv. ${opposingEnemy.level}${isBoss ? ' [Boss]' : ''}`);
        const isVoid = opposingEnemy.kind === 'NPC' && (opposingEnemy as NpcEntity).isVoidIncursion;
        const factionDisplay = isVoid ? 'OUTLAW' : opposingEnemy.factionId;
        this.setText('boss-faction-tag', `${factionDisplay} • HOSTILE`);
        const hpPct = (opposingEnemy.hp / Math.max(1, opposingEnemy.maxHp)) * 100;
        this.setBarWidth('boss-hp-fill', hpPct);
        this.setText(
          'boss-hp-label',
          `${opposingEnemy.hp.toLocaleString()} / ${opposingEnemy.maxHp.toLocaleString()} HP (${hpPct.toFixed(1)}%)`
        );

        const castBar = document.getElementById('boss-cast-bar');
        if (castBar) {
          if (opposingEnemy.activeCast) {
            castBar.classList.remove('hidden');
            const total = opposingEnemy.activeCast.endsAtMs - opposingEnemy.activeCast.startedAtMs;
            const elapsed = Math.max(0, now - opposingEnemy.activeCast.startedAtMs);
            const castPct = Math.min(100, (elapsed / Math.max(1, total)) * 100);
            this.setBarWidth('boss-cast-fill', castPct);
            this.setText('boss-cast-name', `Casting: ${opposingEnemy.activeCast.abilityName}`);
          } else {
            castBar.classList.add('hidden');
          }
        }
      } else {
        topBossFrame.classList.add('hidden');
      }
    }

    // 2. Secondary Target Unit Frame
    const tf = document.getElementById('target-unit-frame');
    if (tf) {
      if (target && !target.isDead && (!opposingEnemy || target.id !== opposingEnemy.id)) {
        tf.classList.remove('hidden');
        this.setText('target-name', target.name);
        const isTargetHostile = isHostile(target);
        this.setText(
          'target-hp-label',
          `${target.hp.toLocaleString()} / ${target.maxHp.toLocaleString()} HP • ${isTargetHostile ? '⚔️ HOSTILE' : '💚 FRIENDLY'}`
        );
        this.setBarWidth('target-hp-fill', (target.hp / Math.max(1, target.maxHp)) * 100);
      } else {
        tf.classList.add('hidden');
      }
    }

    // 3. MMORPG Experience Bar
    const xpBar = document.getElementById('hud-xp-bar');
    if (xpBar) {
      const curXp = me.currentXp ?? 0;
      const maxXp = Math.max(1, me.maxXp ?? 300);
      const xpPct = Math.min(100, (curXp / maxXp) * 100);
      this.setBarWidth('hud-xp-fill', xpPct);
      this.setText(
        'hud-xp-label',
        `Level ${me.level} • ${curXp.toLocaleString()} / ${maxXp.toLocaleString()} XP (${xpPct.toFixed(1)}%)`
      );
    }

    // 4. Bottom-Center Dynamic Fading Health & Faction Resource Bars
    const barsWrap = document.getElementById('bottom-vitals-wrap');
    if (barsWrap) {
      const isFullHpOutCombat = !me.inCombat && me.hp >= me.maxHp && !me.activeCast;
      barsWrap.classList.toggle('out-of-combat-fade', isFullHpOutCombat);
    }

    this.setBarWidth('vital-hp-fill', (me.hp / me.maxHp) * 100);
    this.setText('vital-hp-label', `${me.hp} / ${me.maxHp} HP (${cls.name})`);

    this.setBarWidth('vital-res1-fill', (me.primaryResource / me.maxPrimaryResource) * 100);
    this.setText(
      'vital-res1-label',
      `${me.primaryResourceType}: ${Math.round(me.primaryResource)} / ${me.maxPrimaryResource}`
    );

    const secEl = document.getElementById('vital-res2-strip');
    if (secEl) {
      const isZenith = me.auras.some((a) => a.definition.flags?.isZenithState);
      secEl.textContent = `${me.secondaryResourceType.replace('_', ' ')}: ${me.secondaryResource} / ${me.maxSecondaryResource}${isZenith ? ' ☀️ ZENITH STATE!' : ''}`;
      secEl.style.color = faction.accentColor;
    }

    const crestImg = document.getElementById('hud-player-faction-img') as HTMLImageElement | null;
    if (crestImg) {
      const path = `/assets/factions/${me.factionId.toLowerCase()}.png`;
      if (!crestImg.src.endsWith(path)) {
        crestImg.src = path;
      }
      crestImg.title = `${faction.name} — ${faction.title}`;
    }

    // Active Cast Bar (Slim Bottom-Center)
    const castWrap = document.getElementById('minimal-cast-bar');
    if (castWrap) {
      if (me.activeCast) {
        castWrap.classList.remove('hidden');
        const total = me.activeCast.endsAtMs - me.activeCast.startedAtMs;
        const elapsed = Math.max(0, now - me.activeCast.startedAtMs);
        const pct = Math.min(100, (elapsed / Math.max(1, total)) * 100);
        this.setBarWidth('minimal-cast-fill', me.activeCast.isChannel ? 100 - pct : pct);
        this.setText('minimal-cast-text', `${me.activeCast.icon} ${me.activeCast.abilityName}`);
      } else {
        castWrap.classList.add('hidden');
      }
    }

    // Update Mount button appearance
    const mountBtn = document.getElementById('btn-toggle-mount');
    if (mountBtn) {
      if (me.isMounted) {
        mountBtn.textContent = '🦅 Dismount (M)';
        mountBtn.style.background = 'rgba(249, 115, 22, 0.35)';
        mountBtn.style.borderColor = '#fb923c';
        mountBtn.style.color = '#fed7aa';
      } else {
        mountBtn.textContent = '🦅 Mount (M)';
        mountBtn.style.background = '';
        mountBtn.style.borderColor = '#f97316';
        mountBtn.style.color = '#fdba74';
      }
    }

    // 5. Update 6-Slot Tactical Action Cluster (LMB, RMB, Q, E, R, F)
    const gcdRemMs = Math.max(0, me.gcdEndsAtMs - now);
    for (let i = 0; i < 6; i++) {
      const slotEl = document.getElementById(`tac-slot-${i}`);
      if (!slotEl) continue;
      const abId = me.tacticalLoadout[i];
      const ab = abId ? ALL_ABILITIES[abId] : null;
      const iconEl = slotEl.querySelector('.tac-icon') as HTMLElement;
      const sweepEl = slotEl.querySelector('.tac-cd-sweep') as HTMLElement;
      const numEl = slotEl.querySelector('.tac-cd-num') as HTMLElement;
      const nameEl = slotEl.querySelector('.tac-name') as HTMLElement;

      if (!ab) {
        iconEl.textContent = '';
        nameEl.textContent = '';
        numEl.textContent = '';
        sweepEl.style.height = '0%';
        continue;
      }

      iconEl.textContent = ab.icon;
      nameEl.textContent = ab.name;

      const cd = me.cooldowns[ab.id];
      const cdRemMs = cd ? Math.max(0, cd.readyAtMs - now) : 0;
      const effRem = ab.isOffGCD ? cdRemMs : Math.max(cdRemMs, gcdRemMs);
      const effDur = cdRemMs > gcdRemMs && cd ? cd.durationMs : me.computedStats.gcdDurationMs;

      if (effRem > 0 && (!cd || cd.chargesRemaining <= 0 || cdRemMs <= gcdRemMs)) {
        const pct = Math.min(100, (effRem / Math.max(1, effDur)) * 100);
        sweepEl.style.height = `${pct}%`;
        numEl.textContent =
          effRem >= 1500 ? `${Math.ceil(effRem / 1000)}s` : `${(effRem / 1000).toFixed(1)}`;
      } else {
        sweepEl.style.height = '0%';
        numEl.textContent = '';
      }

      const noRes =
        me.primaryResource < ab.primaryResourceCost ||
        me.secondaryResource < (ab.special?.minSecondaryResource ?? ab.secondaryResourceCost);
      slotEl.classList.toggle('no-res', noRes);
    }

    // 6. Render 3D Diegetic World-Space Floating Health Bars & Combat Numbers
    this.render3DDiegeticOverlay(me, target);
  }

  private render3DDiegeticOverlay(_me: PlayerEntity, _myTarget: EntityBase | null): void {
    const layer = document.getElementById('world-space-overlay');
    if (!layer) return;

    const now = Date.now();
    this.floatingNumbers = this.floatingNumbers.filter((fn) => now - fn.createdAtMs < 950);
    if (this.floatingNumbers.length === 0) {
      if (layer.childNodes.length > 0) {
        layer.innerHTML = '';
      }
      return;
    }

    const htmlParts: string[] = [];
    for (const fn of this.floatingNumbers) {
      const age = (now - fn.createdAtMs) / 950;
      const proj = this.cb.projectToScreen(fn.worldX, fn.worldY + age * 1.8, fn.worldZ);
      if (!proj.visible) continue;
      const opacity = (1 - age).toFixed(2);
      htmlParts.push(`
        <div class="diegetic-number ${fn.isCrit ? 'crit-num' : ''}" style="left:${Math.round(proj.x)}px; top:${Math.round(proj.y)}px; color:${fn.color}; opacity:${opacity};">
          ${fn.text}
        </div>
      `);
    }

    layer.innerHTML = htmlParts.join('');
  }

  public renderModalContent(): void {
    const me = this.cb.getPlayer();
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    if (!me || !titleEl || !bodyEl) return;

    const cls = CLASSES_REGISTRY[me.classId];
    const faction = FACTIONS_REGISTRY[me.factionId];
    const glbInfo = CLASS_GLB_MODELS[me.classId];

    if (this.activeModal === 'LOADOUT_K') {
      const availAbilityPts = me.abilityPointsAvailable ?? 0;
      const facIconPath = `/assets/factions/${me.factionId.toLowerCase()}.png`;
      titleEl.innerHTML = `<img src="${facIconPath}" class="modal-faction-seal" alt="${faction.name}" /> [K] Abilities & Spellbook — ${cls.name} (${faction.name}) • Level ${me.level} • ${availAbilityPts} Point${availAbilityPts === 1 ? '' : 's'} Available`;
      bodyEl.innerHTML = `
        <div class="modal-section">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; background:rgba(15,23,42,0.6); padding:8px 12px; border-radius:8px; border:1px solid rgba(245,158,11,0.3);">
            <div>
              <strong style="color:#fde047; font-size:13px;">Ability Mastery & Action Bar Customization</strong>
              <div style="font-size:11.5px; color:#cbd5e1; margin-top:2px;">
                Earn Experience (XP) from combat & quests to level up. Each level grants Ability Points to empower spell ranks (+15% potency per rank).
              </div>
            </div>
            <span style="font-size:12px; font-weight:900; color:#0f172a; background:#fde047; padding:4px 12px; border-radius:999px; white-space:nowrap;">
              ⭐ ${availAbilityPts} Ability Point${availAbilityPts === 1 ? '' : 's'}
            </span>
          </div>

          <div class="kit-cards-grid">
            ${cls.abilities
              .map((ab) => {
                const rank = me.abilityRanks?.[ab.id] ?? 1;
                const canUpgrade = availAbilityPts > 0 && rank < 5;
                const bonusPct = (rank - 1) * 15;
                return `
              <div class="kit-card" style="border-color:${rank >= 5 ? '#f59e0b' : 'rgba(148,163,184,0.2)'}">
                <div class="kit-card-head">
                  <span class="kit-icon">${ab.icon}</span>
                  <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <strong>${ab.name}</strong>
                      <span class="rank-badge" style="font-size:10.5px; font-weight:800; color:${rank >= 5 ? '#fde047' : '#38bdf8'}; background:rgba(15,23,42,0.8); border:1px solid ${rank >= 5 ? '#f59e0b' : 'rgba(56,189,248,0.3)'}; padding:2px 8px; border-radius:6px;">
                        Rank ${rank} / 5 ${bonusPct > 0 ? `(+${bonusPct}% Potency)` : ''}
                      </span>
                    </div>
                    <div class="kit-meta">${ab.school} • ${ab.cooldownMs > 0 ? ab.cooldownMs / 1000 + 's CD' : 'Instant / No CD'} • ${ab.rangeYards > 0 ? ab.rangeYards + 'yd Range' : 'Self / Melee'} • Cost: ${ab.primaryResourceCost > 0 ? ab.primaryResourceCost : 'Free'}</div>
                  </div>
                </div>
                <p class="kit-desc">${ab.description}</p>
                ${
                  canUpgrade
                    ? `<button class="upgrade-ab-btn" data-upgrade-ab="${ab.id}" style="width:100%; margin:4px 0 8px; padding:6px 12px; background:linear-gradient(90deg, #ca8a04, #eab308); color:#0f172a; font-weight:900; font-size:11px; border:none; border-radius:6px; cursor:pointer; box-shadow:0 0 10px rgba(234,179,8,0.4); transition:all 0.15s;">
                        ⭐ Upgrade to Rank ${rank + 1} (+15% Potency)
                      </button>`
                    : rank >= 5
                    ? `<div style="font-size:10px; color:#fde047; text-align:center; margin:3px 0 6px; font-weight:700;">★ MAXIMUM RANK REACHED</div>`
                    : ''
                }
                <div style="font-size:11px; color:#94a3b8; margin-top:4px; font-weight:600;">Assign to Tactical Slot:</div>
                <div class="kit-bind-row">
                  ${[0, 1, 2, 3, 4, 5]
                    .map((idx) => {
                      const isBound = me.tacticalLoadout[idx] === ab.id;
                      const keyLabel = keybindService.getDisplayLabel(`slot${idx}` as keyof KeybindConfig);
                      return `<button class="bind-key-btn ${isBound ? 'bound' : ''}" data-bind-slot="${idx}" data-bind-ab="${ab.id}">Slot ${idx + 1} [${keyLabel}]</button>`;
                    })
                    .join('')}
                </div>
              </div>
            `;
              })
              .join('')}
          </div>
        </div>
      `;

      bodyEl.querySelectorAll('[data-upgrade-ab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const abId = btn.getAttribute('data-upgrade-ab')!;
          this.cb.sendPacket({ type: 'UPGRADE_ABILITY', abilityId: abId });
          setTimeout(() => this.renderModalContent(), 60);
        });
      });

      bodyEl.querySelectorAll('[data-bind-slot]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const slotIdx = Number(btn.getAttribute('data-bind-slot'));
          const abId = btn.getAttribute('data-bind-ab')!;
          this.cb.sendPacket({
            type: 'UPDATE_TACTICAL_LOADOUT',
            tacticalIndex: slotIdx,
            abilityId: abId,
          });
          setTimeout(() => this.renderModalContent(), 60);
        });
      });
    } else if (this.activeModal === 'INSTANCE_I') {
      const qStatus = this.cb.getQueueStatus();
      const instInfo = this.cb.getInstanceInfo();
      titleEl.textContent = `[I] Cross-World Dungeon & PvP Battleground Matchmaking Queue`;

      const queueableInstances = Object.values(INSTANCES_REGISTRY).filter(
        (i) => i.id !== 'open_world_nexus'
      );

      bodyEl.innerHTML = `
        <div class="modal-section">
          <div class="role-selector-bar">
            <span><strong>1. Select Your Matchmaking Role:</strong></span>
            ${(['TANK', 'HEALER', 'DPS'] as QueueRole[])
              .map(
                (r) => `
              <button class="role-pill ${this.selectedQueueRole === r ? 'active' : ''}" data-role="${r}">
                ${r === 'TANK' ? '🛡️ Tank' : r === 'HEALER' ? '✨ Healer' : '⚔️ DPS'}
              </button>
            `
              )
              .join('')}
            ${
              instInfo && instInfo.instanceId !== 'open_world_nexus'
                ? `<button class="return-ow-btn" id="modal-return-ow">🌀 Leave Instance & Return to Saved Open-World Spot</button>`
                : ''
            }
          </div>
        </div>

        <div class="modal-section">
          <h4>2. Choose a 5-Player PvE Dungeon or Faction PvP Battleground</h4>
          <p class="sub-note">Queue while exploring the 3D Open World, or click <strong>"Instant Pop with AI Party"</strong> to immediately fill remaining Tank/Healer/DPS slots with AI Hero Companions!</p>
          <div class="instance-cards-grid">
            ${queueableInstances
              .map(
                (inst) => `
              <div class="instance-card">
                <div class="inst-header">
                  <div>
                    <span class="inst-badge">${inst.category === 'PVE_DUNGEON' ? '🏰 5-Player PvE Dungeon' : '⚔️ Faction PvP Battleground'}</span>
                    <h3>${inst.name}</h3>
                    <small>${inst.subtitle}</small>
                  </div>
                </div>
                <p class="inst-desc">${inst.description}</p>
                <div class="inst-bosses">
                  <strong>Encounters:</strong> ${inst.bosses.map((b) => b.name).join(', ')}
                </div>
                <div class="inst-reward">🎁 <strong>Rewards:</strong> ${inst.rewardSummary}</div>
                <div class="inst-actions">
                  <button class="inst-q-btn" data-join-q="${inst.id}">Join Matchmaking Queue</button>
                  <button class="inst-ai-btn" data-ai-pop="${inst.id}">🤖 Instant Pop with AI Party</button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;

      bodyEl.querySelectorAll('[data-role]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.selectedQueueRole = btn.getAttribute('data-role') as QueueRole;
          this.renderModalContent();
        });
      });

      bodyEl.querySelector('#modal-return-ow')?.addEventListener('click', () => {
        this.cb.sendPacket({ type: 'LEAVE_INSTANCE' });
        this.toggleModal('NONE');
      });

      bodyEl.querySelectorAll('[data-join-q]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const tid = btn.getAttribute('data-join-q') as InstanceTemplateId;
          this.cb.sendPacket({
            type: 'QUEUE_JOIN',
            templateId: tid,
            role: this.selectedQueueRole,
          });
          this.toggleModal('NONE');
        });
      });

      bodyEl.querySelectorAll('[data-ai-pop]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const tid = btn.getAttribute('data-ai-pop') as InstanceTemplateId;
          this.cb.sendPacket({
            type: 'QUEUE_INSTANT_AI_POP',
            templateId: tid,
            role: this.selectedQueueRole,
          });
          this.toggleModal('NONE');
        });
      });
    } else if (this.activeModal === 'HERO_C') {
      const s = me.computedStats;
      const curXp = me.currentXp ?? 0;
      const maxXp = Math.max(1, me.maxXp ?? 300);
      const availAttr = me.attributePointsAvailable ?? 0;
      const facIconPath = `/assets/factions/${me.factionId.toLowerCase()}.png`;
      titleEl.innerHTML = `<img src="${facIconPath}" class="modal-faction-seal" alt="${faction.name}" /> [C] Hero Attributes & 3-Card Relic Deck — ${cls.name} (${faction.name}) • Level ${me.level}`;
      bodyEl.innerHTML = `
        <div class="char-sheet-grid">
          <div class="stats-panel">
            <h4>Combat Attributes & Stance — Level ${me.level}</h4>
            <div style="background:rgba(234,179,8,0.1); border:1px solid rgba(234,179,8,0.3); border-radius:6px; padding:8px 10px; margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; font-weight:800; font-size:12px; color:#fde047; margin-bottom:4px;">
                <span>Progression: Level ${me.level}</span>
                <span>${curXp.toLocaleString()} / ${maxXp.toLocaleString()} XP</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:11px; color:#cbd5e1;">Attribute Points Available:</span>
                <strong style="color:${availAttr > 0 ? '#4ade80' : '#94a3b8'}; font-size:13px;">${availAttr}</strong>
              </div>
            </div>
            <button id="modal-toggle-stance" class="stance-btn">
              ${me.tankStance ? '🛡️ Tank Stance: ON (350% Threat Multiplier)' : '⚔️ Tank Stance: OFF (100% Threat)'}
            </button>
            <div class="stat-line">
              <span>Stamina (1 = 15 HP):</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <strong>${me.attributes.stamina} (${s.maxHp} HP)</strong>
                ${availAttr > 0 ? `<button class="alloc-btn" data-alloc-attr="stamina" style="background:#22c55e; color:#0f172a; border:none; border-radius:4px; font-weight:900; font-size:11px; padding:1px 6px; cursor:pointer;">+1</button>` : ''}
              </div>
            </div>
            <div class="stat-line">
              <span>Intellect (Spell Power):</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <strong>${me.attributes.intellect} (${s.spellPower} SP)</strong>
                ${availAttr > 0 ? `<button class="alloc-btn" data-alloc-attr="intellect" style="background:#22c55e; color:#0f172a; border:none; border-radius:4px; font-weight:900; font-size:11px; padding:1px 6px; cursor:pointer;">+1</button>` : ''}
              </div>
            </div>
            <div class="stat-line">
              <span>Strength (Attack & Block):</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <strong>${me.attributes.strength} (${s.blockValue} Block)</strong>
                ${availAttr > 0 ? `<button class="alloc-btn" data-alloc-attr="strength" style="background:#22c55e; color:#0f172a; border:none; border-radius:4px; font-weight:900; font-size:11px; padding:1px 6px; cursor:pointer;">+1</button>` : ''}
              </div>
            </div>
            <div class="stat-line">
              <span>Agility (Attack Power):</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <strong>${me.attributes.agility} (${s.attackPower} AP)</strong>
                ${availAttr > 0 ? `<button class="alloc-btn" data-alloc-attr="agility" style="background:#22c55e; color:#0f172a; border:none; border-radius:4px; font-weight:900; font-size:11px; padding:1px 6px; cursor:pointer;">+1</button>` : ''}
              </div>
            </div>
            <div class="stat-line">
              <span>Spirit (Health/Mana Regen):</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <strong>${me.attributes.spirit}</strong>
                ${availAttr > 0 ? `<button class="alloc-btn" data-alloc-attr="spirit" style="background:#22c55e; color:#0f172a; border:none; border-radius:4px; font-weight:900; font-size:11px; padding:1px 6px; cursor:pointer;">+1</button>` : ''}
              </div>
            </div>
            <div class="stat-line"><span>Crit / Haste (GCD ${(s.gcdDurationMs / 1000).toFixed(2)}s):</span><strong>${s.critChancePct}% / ${(s.hastePct * 100).toFixed(1)}%</strong></div>
            <div class="stat-line"><span>${faction.masteryName}:</span><strong>${(s.masteryPct * 100).toFixed(1)}%</strong></div>
          </div>

          <div class="deck-panel">
            <h4>Equipped 3-Card Glimmerfall TCG Relic Deck (www.glimmerfalltcg.com)</h4>
            <div class="equipped-cards-row">
              ${me.equippedRelicDeck
                .map((cid, idx) => {
                  const card = TCG_RELIC_CARDS.find((c) => c.id === cid);
                  return card
                    ? `<div class="relic-card-box">
                        <div class="rc-top"><span>Slot #${idx + 1}</span><span>${card.cardNumber}</span></div>
                        <div class="rc-icon">${card.icon}</div>
                        <strong>${card.name}</strong>
                        <small>${card.effectSummary}</small>
                      </div>`
                    : '';
                })
                .join('')}
            </div>
            <h4>Click Any Relic Card Below to Socket Into Your Active Deck</h4>
            <div class="all-cards-list">
              ${TCG_RELIC_CARDS.map((card) => {
                const eq = me.equippedRelicDeck.includes(card.id);
                return `
                  <div class="mini-relic-item ${eq ? 'equipped' : ''}" data-socket-card="${card.id}">
                    <span>${card.icon} <strong>${card.name}</strong> (${card.factionId})</span>
                    <small>${card.effectSummary}</small>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;

      bodyEl.querySelectorAll('[data-alloc-attr]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const attr = btn.getAttribute('data-alloc-attr') as keyof PrimaryAttributes;
          this.cb.sendPacket({ type: 'ALLOCATE_ATTRIBUTE', attribute: attr });
          setTimeout(() => this.renderModalContent(), 60);
        });
      });

      bodyEl.querySelector('#modal-toggle-stance')?.addEventListener('click', () => {
        this.cb.sendPacket({ type: 'TOGGLE_TANK_STANCE' });
        setTimeout(() => this.renderModalContent(), 60);
      });

      bodyEl.querySelectorAll('[data-socket-card]').forEach((el) => {
        el.addEventListener('click', () => {
          const cid = el.getAttribute('data-socket-card')!;
          if (me.equippedRelicDeck.includes(cid)) return;
          this.cb.sendPacket({
            type: 'EQUIP_RELIC_DECK',
            cardIds: [cid, me.equippedRelicDeck[0], me.equippedRelicDeck[1]],
          });
          setTimeout(() => this.renderModalContent(), 60);
        });
      });
    } else if (this.activeModal === 'TALENTS_N') {
      const tree = TALENTS_REGISTRY[me.classId];
      const facIconPath = `/assets/factions/${me.factionId.toLowerCase()}.png`;
      titleEl.innerHTML = `<img src="${facIconPath}" class="modal-faction-seal" alt="${faction.name}" /> [N] ${cls.name} (${faction.name}) 3-Branch Talent Matrix • ${me.talentPointsAvailable} Points Available`;
      bodyEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
          <span>Click any talent node to allocate points.</span>
          <button id="modal-reset-talents" class="stance-btn">Reset All Talents</button>
        </div>
        <div class="talent-columns">
          ${tree.branches
            .map(
              (b) => `
            <div class="talent-col">
              <h4>${b.name}</h4>
              <small>${b.description}</small>
              ${b.nodes
                .map((n) => {
                  const r = me.talents[n.id] ?? 0;
                  return `
                    <div class="talent-item ${r > 0 ? 'active' : ''}" data-talent-node="${n.id}">
                      <span>${n.icon} <strong>T${n.tier}: ${n.name}</strong> (${r}/${n.maxRanks})</span>
                      <small>${n.description}</small>
                    </div>
                  `;
                })
                .join('')}
            </div>
          `
            )
            .join('')}
        </div>
      `;

      bodyEl.querySelector('#modal-reset-talents')?.addEventListener('click', () => {
        this.cb.sendPacket({ type: 'RESET_TALENTS' });
        setTimeout(() => this.renderModalContent(), 60);
      });

      bodyEl.querySelectorAll('[data-talent-node]').forEach((el) => {
        el.addEventListener('click', () => {
          const nid = el.getAttribute('data-talent-node')!;
          this.cb.sendPacket({ type: 'ALLOCATE_TALENT', nodeId: nid });
          setTimeout(() => this.renderModalContent(), 60);
        });
      });
    } else if (this.activeModal === 'KEYBINDS_O') {
      titleEl.textContent = '⚙️ Customized Keybindings & Control Layout';
      bodyEl.innerHTML = `
        <div class="modal-section">
          <h4>Tactical Combat, Mobility & Interface Keybindings</h4>
          <p style="font-size:12px; color:#94a3b8; margin-bottom:12px;">
            Click any button below to rebind. Press your desired Key (or Left/Right Mouse Click) to assign, or press [Esc] to cancel.
          </p>
          <div class="keybinds-grid">
            ${(Object.keys(KEYBIND_LABELS) as Array<keyof KeybindConfig>)
              .map((action) => {
                const label = KEYBIND_LABELS[action];
                const display = keybindService.getDisplayLabel(action);
                const isListening = this.listeningKeyAction === action;
                return `
                  <div class="keybind-row">
                    <span class="keybind-label">${label}</span>
                    <button class="keybind-btn ${isListening ? 'listening' : ''}" data-rebind-action="${action}">
                      ${isListening ? 'Press key...' : display}
                    </button>
                  </div>
                `;
              })
              .join('')}
          </div>
          <div class="keybind-footer">
            <span style="font-size:11px; color:#64748b;">Keybindings are saved automatically to your browser cache.</span>
            <button id="modal-reset-keybinds" class="stance-btn" style="border-color:#ef4444; color:#f87171;">
              Reset to Defaults
            </button>
          </div>
        </div>
      `;

      bodyEl.querySelectorAll<HTMLButtonElement>('[data-rebind-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-rebind-action') as keyof KeybindConfig;
          this.listeningKeyAction = action;
          this.renderModalContent();
        });
      });

      bodyEl.querySelector('#modal-reset-keybinds')?.addEventListener('click', () => {
        keybindService.resetDefaults();
        this.renderModalContent();
      });
    }
  }

  private setText(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el && el.textContent !== text) {
      el.textContent = text;
    }
  }

  private setBarWidth(id: string, pct: number): void {
    const el = document.getElementById(id);
    if (el) {
      el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    }
  }

  public showZoneBanner(title: string, sub: string, desc: string): void {
    const el = document.getElementById('zone-entry-banner');
    const titleEl = document.getElementById('zone-banner-title');
    const subEl = document.getElementById('zone-banner-sub');
    const descEl = document.getElementById('zone-banner-desc');
    if (!el || !titleEl || !subEl || !descEl) return;

    titleEl.textContent = title;
    subEl.textContent = sub;
    descEl.textContent = desc;

    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'bannerFadeInOut 4.5s ease forwards';
    setTimeout(() => {
      el.classList.add('hidden');
    }, 4500);
  }

  public logSystemMessage(text: string): void {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.combatLogEntries.unshift({
      id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      time: timeStr,
      filterType: 'SYSTEM',
      styleClass: 'system',
      text: `[${timeStr}] ${text}`,
    });
    if (this.combatLogEntries.length > 80) {
      this.combatLogEntries = this.combatLogEntries.slice(0, 80);
    }
    this.renderCombatLog();
  }

  public showFloatingError(msg: string): void {
    const me = this.cb.getPlayer();
    if (!me) return;
    const now = Date.now();
    this.floatingNumbers.push({
      id: `err_${now}_${Math.random()}`,
      worldX: me.x + (Math.random() * 0.6 - 0.3),
      worldY: (me.z ?? 0) + 2.8,
      worldZ: me.y + (Math.random() * 0.6 - 0.3),
      text: msg,
      color: '#f87171',
      isCrit: false,
      createdAtMs: now,
    });
  }
}

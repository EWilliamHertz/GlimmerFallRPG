import {
  AbilityDefinition,
  ClassId,
  ClientPacket,
  CombatLogEvent,
  EntityBase,
  NpcEntity,
  PlayerEntity,
} from '../../shared/types';
import { ALL_ABILITIES, CLASSES_REGISTRY } from '../../shared/classesRegistry';
import { FACTIONS_REGISTRY, TCG_RELIC_CARDS } from '../../shared/factionsRegistry';
import { TALENTS_REGISTRY } from '../../shared/talentsRegistry';

export const BAR1_HOTKEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
export const BAR2_HOTKEYS = [
  'S+1',
  'S+2',
  'S+3',
  'S+4',
  'S+5',
  'S+6',
  'S+7',
  'S+8',
  'S+9',
  'S+0',
  'S+-',
  'S+=',
];

export interface WowHudCallbacks {
  sendPacket: (packet: ClientPacket) => void;
  getPlayer: () => PlayerEntity | null;
  getTarget: () => EntityBase | null;
  getTargetOfTarget: () => EntityBase | null;
  getServerTimeMs: () => number;
  onAbilityTriggered: (ability: AbilityDefinition) => void;
  getPendingReticleAbility: () => AbilityDefinition | null;
  onTeleportToZone: (x: number, y: number) => void;
}

export class WowHud {
  private cb: WowHudCallbacks;
  private combatLogFilter: 'ALL' | 'COMBAT' | 'AURAS' | 'INTERRUPTS' = 'ALL';
  private activeModal: 'NONE' | 'SPELLBOOK' | 'CHARACTER' | 'TALENTS' = 'NONE';
  private lastRenderedEventId: string | null = null;
  private selectedAssignAbilityId: string | null = null;

  constructor(callbacks: WowHudCallbacks) {
    this.cb = callbacks;
    this.initStaticStructure();
  }

  private initStaticStructure(): void {
    const bar1Container = document.getElementById('action-bar-1');
    const bar2Container = document.getElementById('action-bar-2');

    if (bar1Container) {
      bar1Container.innerHTML = '';
      for (let i = 0; i < 12; i++) {
        bar1Container.appendChild(this.createSlotElement(i, BAR1_HOTKEYS[i]));
      }
    }

    if (bar2Container) {
      bar2Container.innerHTML = '';
      for (let i = 12; i < 24; i++) {
        bar2Container.appendChild(this.createSlotElement(i, BAR2_HOTKEYS[i - 12]));
      }
    }

    // Bind top bar buttons
    document.getElementById('btn-spellbook')?.addEventListener('click', () => {
      this.toggleModal('SPELLBOOK');
    });
    document.getElementById('btn-character')?.addEventListener('click', () => {
      this.toggleModal('CHARACTER');
    });
    document.getElementById('btn-talents')?.addEventListener('click', () => {
      this.toggleModal('TALENTS');
    });
    document.getElementById('btn-stance')?.addEventListener('click', () => {
      this.cb.sendPacket({ type: 'TOGGLE_TANK_STANCE' });
    });

    // Quick class switcher buttons in top header
    const classStrip = document.getElementById('class-quick-strip');
    if (classStrip) {
      classStrip.innerHTML = '';
      for (const cls of Object.values(CLASSES_REGISTRY)) {
        const faction = FACTIONS_REGISTRY[cls.factionId];
        const btn = document.createElement('button');
        btn.className = 'class-pill-btn';
        btn.dataset.classId = cls.id;
        btn.style.borderColor = faction.bannerColor;
        btn.innerHTML = `<span class="dot" style="background:${faction.bannerColor}"></span>${cls.name}`;
        btn.addEventListener('click', () => {
          this.cb.sendPacket({ type: 'SWITCH_CLASS', classId: cls.id });
          if (this.activeModal !== 'NONE') {
            setTimeout(() => this.renderModalContent(), 80);
          }
        });
        classStrip.appendChild(btn);
      }
    }

    // Warzone Fast-Travel buttons
    const zoneStrip = document.getElementById('zone-teleport-strip');
    if (zoneStrip) {
      zoneStrip.innerHTML = '';
      const zones = [
        { label: 'Nexus Hub', x: 0, y: -6, color: '#e2e8f0' },
        { label: 'Solari Warzone', x: 54, y: -54, color: '#f59e0b' },
        { label: 'Terra Warzone', x: 54, y: 54, color: '#10b981' },
        { label: 'Umbri Warzone', x: -54, y: 54, color: '#8b5cf6' },
        { label: 'Aether Warzone', x: -54, y: -54, color: '#06b6d4' },
      ];
      for (const z of zones) {
        const b = document.createElement('button');
        b.className = 'zone-tp-btn';
        b.style.color = z.color;
        b.textContent = z.label;
        b.addEventListener('click', () => this.cb.onTeleportToZone(z.x, z.y));
        zoneStrip.appendChild(b);
      }
    }

    // Combat log filter tabs
    document.querySelectorAll('.log-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.log-tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.combatLogFilter = (btn.getAttribute('data-filter') as typeof this.combatLogFilter) || 'ALL';
      });
    });

    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
      this.toggleModal('NONE');
    });
  }

  private createSlotElement(slotIndex: number, hotkeyLabel: string): HTMLElement {
    const slot = document.createElement('div');
    slot.className = 'action-slot';
    slot.id = `action-slot-${slotIndex}`;
    slot.innerHTML = `
      <span class="slot-hotkey">${hotkeyLabel}</span>
      <div class="slot-icon"></div>
      <div class="slot-cd-overlay"></div>
      <span class="slot-cd-text"></span>
      <span class="slot-charges"></span>
      <span class="slot-name"></span>
    `;

    slot.addEventListener('click', () => {
      const player = this.cb.getPlayer();
      if (!player) return;

      // If assigning an ability from the Spellbook
      if (this.selectedAssignAbilityId) {
        this.cb.sendPacket({
          type: 'UPDATE_ACTION_BAR',
          slotIndex,
          abilityId: this.selectedAssignAbilityId,
        });
        this.selectedAssignAbilityId = null;
        return;
      }

      const abilityId = player.actionBars[slotIndex];
      if (!abilityId) return;
      const ability = ALL_ABILITIES[abilityId];
      if (ability) {
        this.cb.onAbilityTriggered(ability);
      }
    });

    slot.addEventListener('mouseenter', (ev) => {
      const player = this.cb.getPlayer();
      if (!player) return;
      const abilityId = player.actionBars[slotIndex];
      if (!abilityId) return;
      const ability = ALL_ABILITIES[abilityId];
      if (ability) {
        this.showTooltip(ability, ev as MouseEvent);
      }
    });

    slot.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });

    return slot;
  }

  public toggleModal(modal: 'NONE' | 'SPELLBOOK' | 'CHARACTER' | 'TALENTS'): void {
    if (this.activeModal === modal) {
      this.activeModal = 'NONE';
    } else {
      this.activeModal = modal;
    }
    const modalContainer = document.getElementById('hud-modal');
    if (!modalContainer) return;
    if (this.activeModal === 'NONE') {
      modalContainer.classList.add('hidden');
      this.selectedAssignAbilityId = null;
    } else {
      modalContainer.classList.remove('hidden');
      this.renderModalContent();
    }
  }

  public renderModalContent(): void {
    const player = this.cb.getPlayer();
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    if (!player || !titleEl || !bodyEl) return;

    const cls = CLASSES_REGISTRY[player.classId];
    const faction = FACTIONS_REGISTRY[player.factionId];

    if (this.activeModal === 'SPELLBOOK') {
      titleEl.textContent = `${cls.name} Spellbook (${faction.name}) — Click ability to cast or bind to 24-Slot Bar`;
      bodyEl.innerHTML = `
        <div class="spellbook-grid">
          ${cls.abilities
            .map(
              (ab) => `
            <div class="spellbook-card" data-ability-id="${ab.id}">
              <div class="sb-icon">${ab.icon}</div>
              <div class="sb-info">
                <div class="sb-header">
                  <strong>#${ab.slotIndex} ${ab.name}</strong>
                  <span class="sb-tags">
                    ${ab.isOffGCD ? '<span class="tag-offgcd">Off-GCD</span>' : '<span class="tag-gcd">1.5s GCD</span>'}
                    ${ab.castTimeMs > 0 ? `<span class="tag-cast">${(ab.castTimeMs / 1000).toFixed(1)}s Cast</span>` : ab.channelDurationMs > 0 ? `<span class="tag-cast">${(ab.channelDurationMs / 1000).toFixed(1)}s Chan</span>` : '<span class="tag-inst">Instant</span>'}
                    ${ab.cooldownMs > 0 ? `<span class="tag-cd">${ab.cooldownMs / 1000}s CD</span>` : ''}
                  </span>
                </div>
                <p class="sb-desc">${ab.description}</p>
                <div class="sb-actions">
                  <button class="sb-cast-btn" data-cast="${ab.id}">Cast Now</button>
                  <button class="sb-bind-btn" data-bind="${ab.id}">Bind to Action Slot</button>
                </div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      bodyEl.querySelectorAll('[data-cast]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-cast')!;
          const ab = ALL_ABILITIES[id];
          if (ab) this.cb.onAbilityTriggered(ab);
        });
      });

      bodyEl.querySelectorAll('[data-bind]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.selectedAssignAbilityId = btn.getAttribute('data-bind');
          titleEl.textContent = `Click any of the 24 Action Bar slots below to bind ${ALL_ABILITIES[this.selectedAssignAbilityId!]?.name}!`;
        });
      });
    } else if (this.activeModal === 'CHARACTER') {
      titleEl.textContent = `Character Sheet & 3-Card Glimmerfall TCG Relic Deck (${cls.name})`;
      const s = player.computedStats;
      bodyEl.innerHTML = `
        <div class="char-sheet-layout">
          <div class="char-stats-col">
            <h4>Primary Attributes</h4>
            <div class="stat-row"><span>Stamina (1 = 15 HP):</span><strong>${player.attributes.stamina} (${s.maxHp} HP)</strong></div>
            <div class="stat-row"><span>Intellect:</span><strong>${player.attributes.intellect} (${s.spellPower} SP)</strong></div>
            <div class="stat-row"><span>Strength:</span><strong>${player.attributes.strength} (${s.blockValue} Block)</strong></div>
            <div class="stat-row"><span>Agility:</span><strong>${player.attributes.agility} (${s.attackPower} AP)</strong></div>
            <div class="stat-row"><span>Spirit:</span><strong>${player.attributes.spirit}</strong></div>
            <h4>Secondary Ratings & Combat</h4>
            <div class="stat-row"><span>Critical Strike (150%):</span><strong>${s.critChancePct}% (${player.secondaryAttributes.critRating})</strong></div>
            <div class="stat-row"><span>Haste (GCD ${(s.gcdDurationMs / 1000).toFixed(2)}s):</span><strong>${(s.hastePct * 100).toFixed(1)}% (${player.secondaryAttributes.hasteRating})</strong></div>
            <div class="stat-row"><span>${faction.masteryName}:</span><strong>${(s.masteryPct * 100).toFixed(1)}%</strong></div>
            <div class="stat-row"><span>Versatility (+Dmg / -DR):</span><strong>+${(s.versatilityDmgPct * 100).toFixed(1)}% / -${(s.versatilityDrPct * 100).toFixed(1)}%</strong></div>
            <div class="stat-row"><span>Armor / Block / Dodge:</span><strong>${s.armor} / ${s.blockChancePct}% / ${s.dodgeChancePct}%</strong></div>
          </div>
          <div class="char-deck-col">
            <h4>Equipped 3-Card Glimmerfall TCG Relic Deck (Click any card below to socket)</h4>
            <div class="equipped-deck-row">
              ${player.equippedRelicDeck
                .map((cid, idx) => {
                  const card = TCG_RELIC_CARDS.find((c) => c.id === cid);
                  return card
                    ? `<div class="tcg-card active-socket">
                        <div class="tcg-card-top"><span>Slot #${idx + 1}</span><span>${card.cardNumber}</span></div>
                        <div class="tcg-card-icon">${card.icon}</div>
                        <div class="tcg-card-name">${card.name}</div>
                        <div class="tcg-card-desc">${card.effectSummary}</div>
                      </div>`
                    : '';
                })
                .join('')}
            </div>
            <h4>All Available Glimmerfall TCG Relic Cards (www.glimmerfalltcg.com)</h4>
            <div class="tcg-collection-grid">
              ${TCG_RELIC_CARDS.map((card) => {
                const isEquipped = player.equippedRelicDeck.includes(card.id);
                return `
                  <div class="tcg-mini-card ${isEquipped ? 'equipped' : ''}" data-card-id="${card.id}">
                    <span>${card.icon} <strong>${card.name}</strong> (${card.factionId})</span>
                    <small>${card.effectSummary}</small>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;

      bodyEl.querySelectorAll('[data-card-id]').forEach((el) => {
        el.addEventListener('click', () => {
          const cardId = el.getAttribute('data-card-id')!;
          if (player.equippedRelicDeck.includes(cardId)) return;
          const nextDeck: [string, string, string] = [
            cardId,
            player.equippedRelicDeck[0],
            player.equippedRelicDeck[1],
          ];
          this.cb.sendPacket({ type: 'EQUIP_RELIC_DECK', cardIds: nextDeck });
          setTimeout(() => this.renderModalContent(), 80);
        });
      });
    } else if (this.activeModal === 'TALENTS') {
      const tree = TALENTS_REGISTRY[player.classId];
      titleEl.textContent = `${cls.name} 3-Branch Talent Matrix — Available Points: ${player.talentPointsAvailable} / 60`;
      bodyEl.innerHTML = `
        <div class="talent-controls">
          <span>Click any talent node to invest points (Level 60 Cap = 60 Talent Points).</span>
          <button id="btn-reset-talents" class="reset-btn">Reset All Talents</button>
        </div>
        <div class="talent-branches-grid">
          ${tree.branches
            .map(
              (branch) => `
            <div class="talent-branch-col">
              <h4>${branch.name}</h4>
              <p class="branch-sub">${branch.description}</p>
              ${branch.nodes
                .map((node) => {
                  const rank = player.talents[node.id] ?? 0;
                  return `
                  <div class="talent-node-card ${rank > 0 ? 'invested' : ''}" data-node-id="${node.id}">
                    <div class="tn-icon">${node.icon}</div>
                    <div class="tn-details">
                      <div class="tn-title">
                        <strong>T${node.tier}: ${node.name}</strong>
                        <span class="tn-rank">${rank} / ${node.maxRanks}</span>
                      </div>
                      <small>${node.description}</small>
                    </div>
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

      bodyEl.querySelector('#btn-reset-talents')?.addEventListener('click', () => {
        this.cb.sendPacket({ type: 'RESET_TALENTS' });
        setTimeout(() => this.renderModalContent(), 80);
      });

      bodyEl.querySelectorAll('[data-node-id]').forEach((nodeEl) => {
        nodeEl.addEventListener('click', () => {
          const nodeId = nodeEl.getAttribute('data-node-id')!;
          this.cb.sendPacket({ type: 'ALLOCATE_TALENT', nodeId });
          setTimeout(() => this.renderModalContent(), 80);
        });
      });
    }
  }

  private showTooltip(ability: AbilityDefinition, ev: MouseEvent): void {
    const tip = document.getElementById('ability-tooltip');
    if (!tip) return;
    tip.classList.remove('hidden');
    tip.innerHTML = `
      <div class="tt-header">
        <span>${ability.icon} <strong>${ability.name}</strong></span>
        <span class="tt-school school-${ability.school.toLowerCase()}">${ability.school}</span>
      </div>
      <div class="tt-meta">
        <span>${ability.castTimeMs > 0 ? `${(ability.castTimeMs / 1000).toFixed(1)}s Cast` : ability.channelDurationMs > 0 ? `${(ability.channelDurationMs / 1000).toFixed(1)}s Channel` : 'Instant'}</span>
        <span>${ability.rangeYards > 0 ? `${ability.rangeYards} yd range` : 'Self / PBAoE'}</span>
        <span>${ability.cooldownMs > 0 ? `${ability.cooldownMs / 1000}s Cooldown` : 'No Cooldown'}</span>
        <span>${ability.isOffGCD ? 'Off-GCD' : '1.5s Base GCD'}</span>
      </div>
      <p class="tt-desc">${ability.description}</p>
    `;
    tip.style.left = `${Math.min(window.innerWidth - 320, ev.clientX + 12)}px`;
    tip.style.top = `${Math.max(12, ev.clientY - 120)}px`;
  }

  private hideTooltip(): void {
    document.getElementById('ability-tooltip')?.classList.add('hidden');
  }

  public update(recentEvents: CombatLogEvent[]): void {
    const player = this.cb.getPlayer();
    if (!player) return;

    const target = this.cb.getTarget();
    const targetOfTarget = this.cb.getTargetOfTarget();
    const now = this.cb.getServerTimeMs();
    const cls = CLASSES_REGISTRY[player.classId];
    const faction = FACTIONS_REGISTRY[player.factionId];

    // Highlight active class button in header
    document.querySelectorAll('.class-pill-btn').forEach((btn) => {
      const cid = (btn as HTMLElement).dataset.classId as ClassId;
      btn.classList.toggle('active', cid === player.classId);
    });

    // Update Tank Stance button
    const stanceBtn = document.getElementById('btn-stance');
    if (stanceBtn) {
      stanceBtn.textContent = player.tankStance
        ? '🛡️ Tank Stance: ON (350% Threat)'
        : '⚔️ Tank Stance: OFF (100% Threat)';
      stanceBtn.classList.toggle('stance-active', player.tankStance);
    }

    // 1. Update Player Unit Frame
    this.setText('uf-player-name', `${player.name} — ${cls.name}`);
    this.setText('uf-player-hp-text', `${player.hp} / ${player.maxHp}`);
    this.setBarWidth('uf-player-hp-bar', (player.hp / player.maxHp) * 100);

    this.setText(
      'uf-player-res1-text',
      `${player.primaryResourceType}: ${Math.round(player.primaryResource)} / ${player.maxPrimaryResource}`
    );
    this.setBarWidth(
      'uf-player-res1-bar',
      (player.primaryResource / player.maxPrimaryResource) * 100
    );

    // Secondary Faction Resource Bar / Pips
    const secWidget = document.getElementById('uf-player-secondary-widget');
    if (secWidget) {
      if (player.secondaryResourceType === 'SOLAR_CHARGE') {
        const isZenith = player.auras.some((a) => a.definition.flags?.isZenithState);
        secWidget.innerHTML = `
          <div class="solar-bar-wrap ${isZenith ? 'zenith-glow' : ''}">
            <span>☀️ Solar Charge: ${player.secondaryResource} / 100 ${isZenith ? '— ZENITH STATE ACTIVE!' : ''}</span>
            <div class="solar-fill" style="width:${player.secondaryResource}%"></div>
          </div>
        `;
      } else {
        const maxPips = player.maxSecondaryResource;
        const pipsHtml = Array.from({ length: maxPips }, (_, idx) => {
          const filled = idx < player.secondaryResource;
          return `<span class="res-pip ${filled ? 'filled' : ''}" style="background:${filled ? faction.accentColor : 'rgba(255,255,255,0.12)'}"></span>`;
        }).join('');
        secWidget.innerHTML = `
          <div class="pip-row">
            <span class="pip-label">${player.secondaryResourceType.replace('_', ' ')} (${player.secondaryResource}/${maxPips}):</span>
            <div class="pips">${pipsHtml}</div>
          </div>
        `;
      }
    }

    // Render Player Auras
    this.renderAuraStrip('uf-player-auras', player, now);

    // 2. Update Target & Target-of-Target Unit Frames
    const targetFrame = document.getElementById('uf-target');
    if (targetFrame) {
      if (!target) {
        targetFrame.classList.add('empty-target');
        this.setText('uf-target-name', 'No Target (Press Tab or Click Entity)');
        this.setText('uf-target-hp-text', '—');
        this.setBarWidth('uf-target-hp-bar', 0);
        this.setText('uf-tot-name', '—');
        const ta = document.getElementById('uf-target-auras');
        if (ta) ta.innerHTML = '';
      } else {
        targetFrame.classList.remove('empty-target');
        const dist = Math.hypot(target.x - player.x, target.y - player.y).toFixed(1);
        this.setText('uf-target-name', `${target.name} (${dist} yd)`);
        this.setText('uf-target-hp-text', `${target.hp} / ${target.maxHp} (${Math.round((target.hp / target.maxHp) * 100)}%)`);
        this.setBarWidth('uf-target-hp-bar', (target.hp / target.maxHp) * 100);
        this.setText(
          'uf-tot-name',
          targetOfTarget ? `ToT: ${targetOfTarget.name}` : 'ToT: None'
        );
        this.renderAuraStrip('uf-target-auras', target, now);
      }
    }

    // 3. Update Centered Cast Bar & Spell Queue Indicator
    const castBarWrap = document.getElementById('hud-castbar-wrap');
    if (castBarWrap) {
      if (player.activeCast) {
        castBarWrap.classList.remove('hidden');
        const total = player.activeCast.endsAtMs - player.activeCast.startedAtMs;
        const elapsed = Math.max(0, now - player.activeCast.startedAtMs);
        const pct = Math.min(100, (elapsed / Math.max(1, total)) * 100);
        const remSec = Math.max(0, (player.activeCast.endsAtMs - now) / 1000).toFixed(1);
        this.setText(
          'hud-castbar-title',
          `${player.activeCast.icon} ${player.activeCast.abilityName} ${player.queuedSpell ? '[Queued: ' + (ALL_ABILITIES[player.queuedSpell.abilityId]?.name ?? '') + ']' : ''}`
        );
        this.setText('hud-castbar-timer', `${remSec}s`);
        this.setBarWidth(
          'hud-castbar-fill',
          player.activeCast.isChannel ? 100 - pct : pct
        );
      } else {
        castBarWrap.classList.add('hidden');
      }
    }

    // Ground Reticle Banner
    const reticleBanner = document.getElementById('reticle-banner');
    const pendingReticle = this.cb.getPendingReticleAbility();
    if (reticleBanner) {
      if (pendingReticle) {
        reticleBanner.classList.remove('hidden');
        reticleBanner.textContent = `🎯 Ground Reticle Mode: Click battlefield to cast ${pendingReticle.name} (Right-Click or Esc to cancel)`;
      } else {
        reticleBanner.classList.add('hidden');
      }
    }

    // 4. Update 24 Action Bar Slots
    const gcdRemMs = Math.max(0, player.gcdEndsAtMs - now);
    for (let i = 0; i < 24; i++) {
      const slotEl = document.getElementById(`action-slot-${i}`);
      if (!slotEl) continue;
      const abilityId = player.actionBars[i];
      const iconEl = slotEl.querySelector('.slot-icon') as HTMLElement;
      const cdOverlay = slotEl.querySelector('.slot-cd-overlay') as HTMLElement;
      const cdText = slotEl.querySelector('.slot-cd-text') as HTMLElement;
      const chargesEl = slotEl.querySelector('.slot-charges') as HTMLElement;
      const nameEl = slotEl.querySelector('.slot-name') as HTMLElement;

      if (!abilityId || !ALL_ABILITIES[abilityId]) {
        iconEl.textContent = '';
        nameEl.textContent = '';
        cdText.textContent = '';
        chargesEl.textContent = '';
        cdOverlay.style.height = '0%';
        slotEl.classList.remove('out-of-range', 'no-resource', 'proc-glow', 'queued-slot');
        continue;
      }

      const ab = ALL_ABILITIES[abilityId];
      iconEl.textContent = ab.icon;
      nameEl.textContent = ab.name;

      // Cooldown or GCD Sweep
      const cd = player.cooldowns[ab.id];
      const cdRemMs = cd ? Math.max(0, cd.readyAtMs - now) : 0;
      const effectiveRemMs = ab.isOffGCD ? cdRemMs : Math.max(cdRemMs, gcdRemMs);
      const effectiveDurMs =
        cdRemMs > gcdRemMs && cd ? cd.durationMs : player.computedStats.gcdDurationMs;

      if (effectiveRemMs > 0 && (!cd || cd.chargesRemaining <= 0 || cdRemMs <= gcdRemMs)) {
        const pct = Math.min(100, (effectiveRemMs / Math.max(1, effectiveDurMs)) * 100);
        cdOverlay.style.height = `${pct}%`;
        cdText.textContent =
          effectiveRemMs >= 1500
            ? `${Math.ceil(effectiveRemMs / 1000)}s`
            : `${(effectiveRemMs / 1000).toFixed(1)}`;
      } else {
        cdOverlay.style.height = '0%';
        cdText.textContent = '';
      }

      if (ab.maxCharges && ab.maxCharges > 1) {
        const charges = cd ? cd.chargesRemaining : ab.maxCharges;
        chargesEl.textContent = `${charges}`;
      } else {
        chargesEl.textContent = '';
      }

      // Out of range indicator
      let outOfRange = false;
      if (target && ab.targetType === 'ENEMY' && ab.rangeYards > 0) {
        const dist = Math.hypot(target.x - player.x, target.y - player.y);
        if (dist > ab.rangeYards + 1.5) outOfRange = true;
      }
      slotEl.classList.toggle('out-of-range', outOfRange);

      // Insufficient resource indicator
      const noRes =
        player.primaryResource < ab.primaryResourceCost ||
        player.secondaryResource < (ab.special?.minSecondaryResource ?? ab.secondaryResourceCost);
      slotEl.classList.toggle('no-resource', noRes);

      // Reactive Spell-Proc Glow Ring
      const isProc =
        (ab.id === 'mag_arcane_missiles' &&
          player.auras.some((a) => a.definition.flags?.isClearcasting)) ||
        (ab.id === 'wlk_umbral_bolt' &&
          player.auras.some((a) => a.definition.flags?.isNightfall)) ||
        (ab.id === 'pal_supernova_execution' &&
          (player.auras.some((a) => a.definition.flags?.isZenithState) ||
            (target !== null && (target.hp / target.maxHp) * 100 <= 20))) ||
        (ab.special?.isFinisher &&
          player.secondaryResource >= player.maxSecondaryResource);
      slotEl.classList.toggle('proc-glow', Boolean(isProc));

      // Spell Queue Highlight
      slotEl.classList.toggle('queued-slot', player.queuedSpell?.abilityId === ab.id);
    }

    // 5. Update Authoritative Threat Table Panel
    const threatBody = document.getElementById('threat-table-body');
    if (threatBody) {
      if (target && target.kind === 'NPC') {
        const npc = target as NpcEntity;
        if (npc.threatList.length === 0) {
          threatBody.innerHTML = `<div class="threat-empty">No threat entries on ${npc.name}</div>`;
        } else {
          threatBody.innerHTML = npc.threatList
            .map(
              (entry) => `
              <div class="threat-row ${entry.isTanking ? 'tanking' : ''}">
                <span>${entry.isTanking ? '🛡️' : '⚔️'} ${entry.entityName}</span>
                <span>${entry.threatValue} (${entry.threatPct}%)</span>
              </div>
            `
            )
            .join('');
        }
      } else {
        threatBody.innerHTML = `<div class="threat-empty">Select a hostile NPC to inspect Threat Table</div>`;
      }
    }

    // 6. Update Combat Log Panel
    this.updateCombatLog(recentEvents);
  }

  private renderAuraStrip(containerId: string, entity: EntityBase, now: number): void {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = entity.auras
      .map((a) => {
        const rem = Math.max(0, Math.ceil((a.expiresAtMs - now) / 1000));
        return `
        <div class="aura-chip ${a.type === 'BUFF' ? 'aura-buff' : 'aura-debuff'}" title="${a.name} (${rem}s)">
          <span>${a.icon}</span>
          ${a.stacks > 1 ? `<span class="aura-stacks">${a.stacks}</span>` : ''}
          <span class="aura-rem">${rem}s</span>
        </div>
      `;
      })
      .join('');
  }

  private updateCombatLog(events: CombatLogEvent[]): void {
    const logContainer = document.getElementById('combat-log-messages');
    if (!logContainer) return;

    const filtered = events.filter((e) => {
      if (this.combatLogFilter === 'COMBAT') {
        return (
          e.type === 'SWING_DAMAGE' ||
          e.type === 'SPELL_DAMAGE' ||
          e.type === 'SPELL_HEAL'
        );
      }
      if (this.combatLogFilter === 'AURAS') {
        return (
          e.type === 'AURA_APPLIED' ||
          e.type === 'AURA_STACK_CHANGE' ||
          e.type === 'AURA_REMOVED'
        );
      }
      if (this.combatLogFilter === 'INTERRUPTS') {
        return e.type === 'SPELL_INTERRUPTED';
      }
      return true;
    });

    const latestId = filtered[filtered.length - 1]?.id ?? null;
    if (latestId === this.lastRenderedEventId && logContainer.childElementCount > 0) {
      return;
    }
    this.lastRenderedEventId = latestId;

    logContainer.innerHTML = filtered
      .slice(-22)
      .map(
        (e) => `
        <div class="log-line log-${e.type.toLowerCase()}">
          <span class="log-badge">${e.type}</span>
          <span>${e.message}</span>
        </div>
      `
      )
      .join('');
    logContainer.scrollTop = logContainer.scrollHeight;
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
}

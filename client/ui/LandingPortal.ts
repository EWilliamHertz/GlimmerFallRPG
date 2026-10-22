import { ClassId, FactionId } from '../../shared/types';
import { CLASSES_REGISTRY } from '../../shared/classesRegistry';
import { FACTIONS_REGISTRY, TCG_RELIC_CARDS } from '../../shared/factionsRegistry';
import { authService, AuthSession } from '../services/authService';

export interface LandingPortalCallbacks {
  onEnterWorld: (session: AuthSession) => void;
}

export const FACTION_ICONS: Record<FactionId, string> = {
  SOLARI: '/assets/factions/solari.png',
  TERRA: '/assets/factions/terra.png',
  UMBRI: '/assets/factions/umbri.png',
  AETHER: '/assets/factions/aether.png',
};

interface FactionRadarStats {
  survivability: number;
  burstDamage: number;
  crowdControl: number;
  healingSupport: number;
  mobility: number;
}

const FACTION_RADAR_DATA: Record<FactionId, FactionRadarStats> = {
  SOLARI: {
    survivability: 94,
    burstDamage: 82,
    crowdControl: 70,
    healingSupport: 96,
    mobility: 65,
  },
  TERRA: {
    survivability: 98,
    burstDamage: 72,
    crowdControl: 92,
    healingSupport: 90,
    mobility: 68,
  },
  UMBRI: {
    survivability: 64,
    burstDamage: 98,
    crowdControl: 84,
    healingSupport: 62,
    mobility: 95,
  },
  AETHER: {
    survivability: 70,
    burstDamage: 95,
    crowdControl: 90,
    healingSupport: 68,
    mobility: 96,
  },
};

export class LandingPortal {
  private cb: LandingPortalCallbacks;
  private selectedFaction: FactionId = 'SOLARI';
  private selectedClass: ClassId = 'SUNFORGED_PALADIN';

  // Launcher Mode: 'GUEST' (instant 1-click play) vs 'ACCOUNT' (unified persistent sign in / register)
  private launcherMode: 'GUEST' | 'ACCOUNT' = 'GUEST';
  private guestHeroName: string = 'SunspireVanguard';

  // Unified single-form auth state (for ACCOUNT mode)
  private identifier: string = '';
  private authCheckState: 'IDLE' | 'CHECKING' | 'EXISTS' | 'NEW' = 'IDLE';
  private detectedHeroName: string = '';
  private authErrorMessage: string | null = null;
  private checkDebounceTimer: any = null;

  // Showcase state
  private activeRoleFilter: 'ALL' | 'TANK' | 'HEALER' | 'MELEE_DPS' | 'RANGED_DPS' = 'ALL';
  private activeShowcaseTab: 'FACTIONS' | 'WORLD' | 'TCG' | 'ENGINE' = 'FACTIONS';

  constructor(callbacks: LandingPortalCallbacks) {
    this.cb = callbacks;
    try {
      const s = localStorage.getItem('glimmerfall_saved_session');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed?.factionId && FACTIONS_REGISTRY[parsed.factionId as FactionId]) {
          this.selectedFaction = parsed.factionId;
        }
        if (parsed?.classId && CLASSES_REGISTRY[parsed.classId as ClassId]) {
          this.selectedClass = parsed.classId;
        }
        if (parsed?.heroName) {
          this.detectedHeroName = parsed.heroName;
          this.guestHeroName = parsed.heroName;
        }
        if (parsed?.email) {
          this.identifier = parsed.email;
          this.launcherMode = 'ACCOUNT';
        }
      }
    } catch {}

    this.renderPortal();
    this.pollServerHealth();
    setInterval(() => this.pollServerHealth(), 5000);

    // If identifier was loaded from cache, check it
    if (this.identifier) {
      this.performAccountCheck(this.identifier);
    }
  }

  public hide(): void {
    document.getElementById('landing-portal')?.classList.add('hidden');
  }

  public show(): void {
    document.getElementById('landing-portal')?.classList.remove('hidden');
  }

  public focusPlayModal(): void {
    const modalEl = document.getElementById('sec-play-modal');
    if (!modalEl) return;
    modalEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    modalEl.classList.remove('modal-focus-pulse');
    void modalEl.offsetWidth;
    modalEl.classList.add('modal-focus-pulse');

    const inputId = (this.launcherMode === 'GUEST'
      ? document.getElementById('input-guest-hero-name')
      : document.getElementById('input-auth-identifier')) as HTMLInputElement | null;
    if (inputId) {
      setTimeout(() => inputId.focus(), 300);
    }
  }

  private async pollServerHealth(): Promise<void> {
    const pillEl = document.getElementById('portal-server-status');
    if (!pillEl) return;
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('status');
      const data = await res.json();
      pillEl.innerHTML = `
        <span class="status-dot online"></span>
        <span>Engine: <strong>Online (${data.tickRateHz}Hz Authoritative)</strong> • ${data.playersOnline} Players Online • ${data.npcsActive} Active Shards</span>
      `;
    } catch {
      pillEl.innerHTML = `
        <span class="status-dot online"></span>
        <span>Authoritative Server: <strong>Online (20Hz Tick Loop)</strong></span>
      `;
    }
  }

  private renderPortal(): void {
    const root = document.getElementById('landing-portal');
    if (!root) return;

    root.innerHTML = `
      <!-- Ambient Animated Radiant Orbs -->
      <div class="portal-ambient-glow orb-left"></div>
      <div class="portal-ambient-glow orb-right"></div>
      <div class="portal-ambient-glow orb-center"></div>

      <!-- Top Sticky Navigation Bar -->
      <header class="portal-navbar">
        <div class="nav-brand">
          <img src="/glimmerfall_logo.png" alt="Glimmerfall Online" class="nav-brand-logo" />
          <div>
            <div class="nav-title">GLIMMERFALL ONLINE</div>
            <div class="nav-sub">The Living 3D World of Glimmerfall TCG</div>
          </div>
        </div>

        <nav class="nav-links">
          <a href="#sec-play-modal" class="nav-link-anchor">Launcher</a>
          <a href="#sec-classes-roles" class="nav-link-anchor">Classes & Roles</a>
          <a href="#sec-showcase" class="nav-link-anchor">World & Systems</a>
          <a href="https://www.glimmerfalltcg.com" target="_blank" rel="noopener" class="tcg-ext-badge">
            🃏 glimmerfalltcg.com ↗
          </a>
          <button id="nav-btn-play-header" class="nav-play-cta-btn">
            ⚔️ Play Now
          </button>
        </nav>
      </header>

      <main class="portal-main-content">
        <!-- 1. Top Centered Hero Branding Section -->
        <section class="portal-hero-centered" id="sec-hero">
          <div class="hero-logo-container">
            <img src="/glimmerfall_logo.png" alt="Glimmerfall Online Logo" class="hero-center-logo" />
          </div>

          <div id="portal-server-status" class="server-status-pill centered-pill">
            <span class="status-dot online"></span>
            <span>Server: <strong>Online (20Hz Authoritative)</strong> • Deterministic Combat Loop</span>
          </div>

          <h1 class="hero-headline-centered">
            GLIMMERFALL ONLINE
            <span class="hero-tagline-sub">The Living 3D MMORPG of Glimmerfall TCG</span>
          </h1>

          <p class="hero-lead-centered">
            Step into the <strong>Glimmerfall Expanse</strong>—an expansive, authoritative 3D Open-World MMORPG.
            Traverse massive mountain valleys on high-altitude flight mounts, engage in tactical 20Hz deterministic combat,
            delve into 5-player instanced dungeons, and socket <strong>Glimmerfall TCG Relic Cards</strong> directly into your character to mutate your abilities in real time.
          </p>

          <div class="hero-kpi-strip-centered">
            <div class="kpi-box">
              <strong>4</strong>
              <span>Faction Biomes & Valleys</span>
            </div>
            <div class="kpi-box">
              <strong>8</strong>
              <span>Playable 3D Classes</span>
            </div>
            <div class="kpi-box highlight-kpi">
              <strong>20Hz</strong>
              <span>Authoritative Tick Rate</span>
            </div>
            <div class="kpi-box">
              <strong>3D</strong>
              <span>Aerial Flight Mounts</span>
            </div>
          </div>
        </section>

        <!-- 2. Centered Play Modal / Game Launcher Directly Underneath Hero -->
        <section class="portal-launcher-wrapper" id="sec-play-modal">
          <div class="launcher-card" id="sec-launcher-card">
            <div class="launcher-card-top">
              <div class="ea-badge-group">
                <span class="ea-badge">⚡ Early Access 3D Nexus</span>
                <span class="engine-badge">20Hz Engine</span>
              </div>
              <span class="version-tag">v0.5.3 Multi-Ready</span>
            </div>

            <!-- Mode Selector: Guest Mode vs Account Mode -->
            <div class="launcher-mode-toggle" id="launcher-mode-toggle">
              <button class="mode-tab-btn ${this.launcherMode === 'GUEST' ? 'active' : ''}" data-launcher-mode="GUEST">
                ⚡ Guest Quick-Play
              </button>
              <button class="mode-tab-btn ${this.launcherMode === 'ACCOUNT' ? 'active' : ''}" data-launcher-mode="ACCOUNT">
                🔑 Account (Sign In / Register)
              </button>
            </div>

            <div class="launcher-intro-row">
              <h2 class="launcher-title" id="launcher-mode-heading">
                ${this.launcherMode === 'GUEST' ? '⚡ Guest Quick-Play' : '🔑 Account Portal (Unified Login & Register)'}
              </h2>
              <p class="launcher-desc" id="launcher-mode-subtext">
                ${
                  this.launcherMode === 'GUEST'
                    ? 'Play immediately without registration. Choose a hero name and start exploring the Nexus.'
                    : 'Unified login & registration. Type your username/email; if already registered, enter your password to resume your hero progression.'
                }
              </p>
            </div>

            <!-- Auth Input Slot (Guest Hero Name or Unified Account Form) -->
            <div id="portal-auth-slot"></div>

            <!-- Faction & Class Selector inside Launcher -->
            <div class="launcher-selector-section">
              <div class="selector-head-row">
                <label class="field-label">1. Choose Faction Allegiance</label>
                <span class="selector-hint" id="selected-fac-name">Solari</span>
              </div>
              <div class="launcher-faction-row" id="launcher-factions"></div>

              <div class="selector-head-row" style="margin-top:14px;">
                <label class="field-label">2. Choose Playable Hero Class</label>
                <span class="selector-hint" id="selected-cls-role">Tank</span>
              </div>
              <div class="launcher-class-row" id="launcher-classes"></div>
            </div>

            <!-- Primary Enter World Button -->
            <button id="btn-launch-enter-world" class="cta-enter-nexus-btn">
              ${this.launcherMode === 'GUEST' ? '⚔️ PLAY AS GUEST — ENTER THE NEXUS' : '🔑 SIGN IN & PLAY — ENTER THE NEXUS'}
            </button>
          </div>
        </section>

        <!-- 3. Classes and Roles Section Directly Underneath Play Modal -->
        <section class="portal-classes-section" id="sec-classes-roles">
          <div class="section-header-centered">
            <span class="section-eyebrow">THE 8 HEROES OF GLIMMERFALL</span>
            <h2 class="section-title">Playable Classes & Combat Roles</h2>
            <p class="section-lead">
              Glimmerfall Online is forged on the holy trinity of <strong>Tanks</strong>, <strong>Healers</strong>, and high-impact <strong>Damage Dealers</strong>.
              Every class features distinct primary and secondary resource dynamics, signature cooldowns, and seamless 3D action controls.
            </p>

            <!-- Role Filter Pills -->
            <div class="role-filter-strip" id="role-filter-strip">
              <button class="role-filter-pill ${this.activeRoleFilter === 'ALL' ? 'active' : ''}" data-role-filter="ALL">
                ✨ All Classes (8)
              </button>
              <button class="role-filter-pill ${this.activeRoleFilter === 'TANK' ? 'active' : ''}" data-role-filter="TANK">
                🛡️ Tanks (2)
              </button>
              <button class="role-filter-pill ${this.activeRoleFilter === 'HEALER' ? 'active' : ''}" data-role-filter="HEALER">
                💚 Healers (2)
              </button>
              <button class="role-filter-pill ${this.activeRoleFilter === 'MELEE_DPS' ? 'active' : ''}" data-role-filter="MELEE_DPS">
                ⚔️ Melee DPS (2)
              </button>
              <button class="role-filter-pill ${this.activeRoleFilter === 'RANGED_DPS' ? 'active' : ''}" data-role-filter="RANGED_DPS">
                🏹 Ranged DPS (2)
              </button>
            </div>
          </div>

          <div class="classes-grid-cards" id="classes-grid-container">
            <!-- Dynamic Class Cards rendered below -->
          </div>
        </section>

        <!-- 4. Interactive Matrix & Systems Showcase -->
        <section class="showcase-container" id="sec-showcase">
          <div class="section-header-centered">
            <span class="section-eyebrow">DEEP ARCHITECTURE & WORLD SYSTEMS</span>
            <h2 class="section-title">Explore the Core Pillars</h2>
          </div>

          <div class="showcase-tabs-nav" id="showcase-nav">
            <button class="showcase-tab-btn ${this.activeShowcaseTab === 'FACTIONS' ? 'active' : ''}" data-showcase="FACTIONS">
              ⚔️ The 4 Faction Biomes
            </button>
            <button class="showcase-tab-btn ${this.activeShowcaseTab === 'WORLD' ? 'active' : ''}" data-showcase="WORLD">
              🦅 Vast Terrain & 3D Flight
            </button>
            <button class="showcase-tab-btn ${this.activeShowcaseTab === 'TCG' ? 'active' : ''}" data-showcase="TCG">
              🃏 TCG Relic Mutations
            </button>
            <button class="showcase-tab-btn ${this.activeShowcaseTab === 'ENGINE' ? 'active' : ''}" data-showcase="ENGINE">
              🌐 Authoritative 20Hz Tick
            </button>
          </div>

          <div id="showcase-content-slot"></div>
        </section>
      </main>

      <footer class="portal-footer">
        <div class="footer-inner">
          <div class="footer-left">
            <img src="/glimmerfall_logo.png" alt="Glimmerfall" class="footer-logo" />
            <span>GLIMMERFALL ONLINE 3D • 20Hz Authoritative Engine • Connected to Glimmerfall TCG</span>
          </div>
          <div class="footer-links">
            <a href="#sec-play-modal">Launcher</a>
            <a href="#sec-classes-roles">Classes & Roles</a>
            <a href="https://www.glimmerfalltcg.com" target="_blank" rel="noopener">www.glimmerfalltcg.com</a>
          </div>
        </div>
      </footer>
    `;

    this.renderAuthSlotContent();
    this.renderLauncherFactionAndClassSelectors();
    this.renderClassesAndRolesSection();
    this.renderActiveShowcasePanel();
    this.bindPortalEvents();
  }

  private renderAuthSlotContent(): void {
    const slot = document.getElementById('portal-auth-slot');
    const ctaBtn = document.getElementById('btn-launch-enter-world');
    if (!slot) return;

    if (this.launcherMode === 'GUEST') {
      slot.innerHTML = `
        <div class="unified-auth-container">
          <div class="form-group">
            <label class="field-label" for="input-guest-hero-name">
              <span>Hero Display Name</span>
              <span class="label-hint">(Instant 1-Click Guest Access)</span>
            </label>
            <div class="input-with-action">
              <input
                id="input-guest-hero-name"
                class="portal-input"
                type="text"
                value="${this.guestHeroName}"
                placeholder="Enter your hero name..."
                maxlength="24"
              />
              <button id="btn-randomize-hero-name" class="input-random-btn" title="Generate Random Name">🎲 Random</button>
            </div>
          </div>
        </div>
      `;
      if (ctaBtn) {
        ctaBtn.innerHTML = `⚔️ PLAY AS GUEST — ENTER THE NEXUS`;
      }
      this.bindGuestInputs();
    } else {
      // ACCOUNT MODE (Unified Login / Register)
      slot.innerHTML = `
        <div class="unified-auth-container">
          <div class="form-group">
            <label class="field-label" for="input-auth-identifier">
              <span>Username or Email</span>
              <span class="label-hint">(Automatically detects registered accounts)</span>
            </label>
            <div class="input-with-status">
              <input
                id="input-auth-identifier"
                class="portal-input"
                type="text"
                value="${this.identifier}"
                placeholder="Enter username or email..."
                autocomplete="username"
              />
              <span id="identifier-status-icon" class="input-status-indicator"></span>
            </div>
          </div>

          <!-- Dynamic Password Slot: 1 Password if account exists, 2 Passwords if new account -->
          <div id="dynamic-auth-password-slot"></div>

          <!-- Auth Error Banner -->
          <div id="auth-error-banner" class="auth-error-banner ${this.authErrorMessage ? '' : 'hidden'}">
            ${this.authErrorMessage || ''}
          </div>
        </div>
      `;
      this.renderDynamicPasswordSlot();
      this.bindAccountInputs();
    }
  }

  private renderDynamicPasswordSlot(): void {
    const slot = document.getElementById('dynamic-auth-password-slot');
    const statusIcon = document.getElementById('identifier-status-icon');
    const ctaBtn = document.getElementById('btn-launch-enter-world');
    if (!slot) return;

    if (this.authCheckState === 'CHECKING') {
      if (statusIcon) statusIcon.innerHTML = `<span class="spinner-icon">⏳</span>`;
      slot.innerHTML = `
        <div class="auth-status-banner checking">
          <span>🔍 Checking adventurer archives...</span>
        </div>
      `;
    } else if (this.authCheckState === 'EXISTS') {
      if (statusIcon) statusIcon.innerHTML = `<span class="check-icon">✅</span>`;
      slot.innerHTML = `
        <div class="auth-fields-slide-in">
          <div class="auth-status-banner exists">
            <span>✅ Welcome back, <strong>${this.detectedHeroName || 'Adventurer'}</strong>! Enter your password to play:</span>
          </div>
          <div class="form-group" style="margin-top:10px;">
            <label class="field-label" for="input-auth-password">Password</label>
            <input
              id="input-auth-password"
              class="portal-input"
              type="password"
              placeholder="Enter your password..."
              autocomplete="current-password"
            />
          </div>
        </div>
      `;
      if (ctaBtn) {
        ctaBtn.innerHTML = `🔑 SIGN IN & PLAY — ENTER THE NEXUS`;
      }
    } else if (this.authCheckState === 'NEW') {
      if (statusIcon) statusIcon.innerHTML = `<span class="new-icon">✨</span>`;
      slot.innerHTML = `
        <div class="auth-fields-slide-in">
          <div class="auth-status-banner new-account">
            <span>✨ New Adventurer detected! Create your hero name & password:</span>
          </div>
          <div class="form-group" style="margin-top:10px;">
            <label class="field-label" for="input-hero-name">Hero Display Name</label>
            <input
              id="input-hero-name"
              class="portal-input"
              type="text"
              value="${this.detectedHeroName || ''}"
              placeholder="Hero name (e.g. DawnVanguard)"
              maxlength="24"
            />
          </div>
          <div class="form-row-dual" style="margin-top:10px;">
            <div class="form-group">
              <label class="field-label" for="input-auth-password">Create Password</label>
              <input
                id="input-auth-password"
                class="portal-input"
                type="password"
                placeholder="Min 3 characters..."
                autocomplete="new-password"
              />
            </div>
            <div class="form-group">
              <label class="field-label" for="input-auth-password-confirm">Confirm Password</label>
              <input
                id="input-auth-password-confirm"
                class="portal-input"
                type="password"
                placeholder="Repeat password..."
                autocomplete="new-password"
              />
            </div>
          </div>
        </div>
      `;
      if (ctaBtn) {
        ctaBtn.innerHTML = `✨ CREATE ACCOUNT & PLAY — ENTER THE NEXUS`;
      }
    } else {
      // IDLE
      if (statusIcon) statusIcon.innerHTML = ``;
      slot.innerHTML = `
        <div class="auth-status-banner idle">
          <span>Type your username/email above to sign in or register.</span>
        </div>
      `;
      if (ctaBtn) {
        ctaBtn.innerHTML = `🔑 SIGN IN / REGISTER — ENTER THE NEXUS`;
      }
    }

    slot.querySelectorAll<HTMLInputElement>('input').forEach((inp) => {
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          this.handleEnterWorldSubmit();
        }
      });
    });
  }

  private async performAccountCheck(identifier: string): Promise<void> {
    const clean = identifier.trim();
    if (!clean) {
      this.authCheckState = 'IDLE';
      this.authErrorMessage = null;
      this.renderDynamicPasswordSlot();
      return;
    }

    this.authCheckState = 'CHECKING';
    this.renderDynamicPasswordSlot();

    try {
      const res = await authService.checkAccount(clean);
      if (res.exists) {
        this.authCheckState = 'EXISTS';
        this.detectedHeroName = res.heroName || clean.split('@')[0];
        if (res.factionId && FACTIONS_REGISTRY[res.factionId]) {
          this.selectedFaction = res.factionId;
        }
        if (res.classId && CLASSES_REGISTRY[res.classId]) {
          this.selectedClass = res.classId;
        }
        this.renderLauncherFactionAndClassSelectors();
      } else {
        this.authCheckState = 'NEW';
        if (!this.detectedHeroName) {
          this.detectedHeroName = clean.split('@')[0].slice(0, 24);
        }
      }
    } catch {
      this.authCheckState = 'NEW';
    }

    this.renderDynamicPasswordSlot();
  }

  private renderLauncherFactionAndClassSelectors(): void {
    const facRow = document.getElementById('launcher-factions');
    const clsRow = document.getElementById('launcher-classes');
    const facLabel = document.getElementById('selected-fac-name');
    const clsLabel = document.getElementById('selected-cls-role');
    if (!facRow || !clsRow) return;

    const currentFaction = FACTIONS_REGISTRY[this.selectedFaction];
    const currentClass = CLASSES_REGISTRY[this.selectedClass];

    if (facLabel) {
      facLabel.textContent = currentFaction.name;
      facLabel.style.color = currentFaction.accentColor;
    }
    if (clsLabel) {
      clsLabel.textContent = `${currentClass.role} • ${currentClass.name}`;
    }

    facRow.innerHTML = Object.values(FACTIONS_REGISTRY)
      .map((fac) => {
        const active = fac.id === this.selectedFaction;
        const iconPath = FACTION_ICONS[fac.id];
        return `
          <button class="launcher-fac-btn ${active ? 'active' : ''}" data-sel-faction="${fac.id}" style="--fac-color:${fac.bannerColor}">
            <img src="${iconPath}" alt="${fac.name}" class="fac-icon-img" />
            <span class="fac-name">${fac.name}</span>
          </button>
        `;
      })
      .join('');

    clsRow.innerHTML = currentFaction.classes
      .map((cid) => {
        const cls = CLASSES_REGISTRY[cid];
        const active = cid === this.selectedClass;
        const roleIcon = cls.role === 'TANK' ? '🛡️' : cls.role === 'HEALER' ? '💚' : cls.role === 'MELEE_DPS' ? '⚔️' : '🏹';
        return `
          <button class="launcher-cls-btn ${active ? 'active' : ''}" data-sel-class="${cid}">
            <div class="cls-btn-top">
              <span class="cls-name">${cls.name}</span>
              <span class="cls-role-tag">${roleIcon} ${cls.role}</span>
            </div>
            <div class="cls-armor-tag">${cls.armorType}</div>
          </button>
        `;
      })
      .join('');

    facRow.querySelectorAll<HTMLButtonElement>('[data-sel-faction]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const fid = btn.getAttribute('data-sel-faction') as FactionId;
        this.selectedFaction = fid;
        this.selectedClass = FACTIONS_REGISTRY[fid].classes[0];
        this.renderLauncherFactionAndClassSelectors();
        if (this.activeShowcaseTab === 'FACTIONS') {
          this.renderActiveShowcasePanel();
        }
      });
    });

    clsRow.querySelectorAll<HTMLButtonElement>('[data-sel-class]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedClass = btn.getAttribute('data-sel-class') as ClassId;
        this.renderLauncherFactionAndClassSelectors();
      });
    });
  }

  private renderClassesAndRolesSection(): void {
    const container = document.getElementById('classes-grid-container');
    if (!container) return;

    const allClasses = Object.values(CLASSES_REGISTRY);
    const filtered = allClasses.filter((c) => {
      if (this.activeRoleFilter === 'ALL') return true;
      return c.role === this.activeRoleFilter;
    });

    container.innerHTML = filtered
      .map((cls) => {
        const faction = FACTIONS_REGISTRY[cls.factionId];
        const isSelected = cls.id === this.selectedClass;
        const factionIconPath = FACTION_ICONS[cls.factionId];
        const roleBadge = cls.role === 'TANK' ? '🛡️ TANK' : cls.role === 'HEALER' ? '💚 HEALER' : cls.role === 'MELEE_DPS' ? '⚔️ MELEE DPS' : '🏹 RANGED DPS';

        return `
          <div class="class-card-detailed ${isSelected ? 'selected' : ''}" style="--card-border-color:${faction.bannerColor}">
            <div class="ccd-header">
              <div class="ccd-faction-emblem">
                <img src="${factionIconPath}" alt="${faction.name}" class="ccd-faction-img" />
              </div>
              <div class="ccd-title-wrap">
                <div class="ccd-role-pill role-${cls.role.toLowerCase()}">${roleBadge}</div>
                <h3 class="ccd-name">${cls.name}</h3>
                <span class="ccd-faction-name" style="color:${faction.accentColor}">Allegiance: ${faction.name} (${faction.title})</span>
              </div>
            </div>

            <p class="ccd-description">${cls.description}</p>

            <div class="ccd-meta-box">
              <div class="ccd-meta-row">
                <span class="meta-label">Armor Class:</span>
                <span class="meta-val">${cls.armorType}</span>
              </div>
              <div class="ccd-meta-row">
                <span class="meta-label">Combat Resource:</span>
                <span class="meta-val" style="color:${faction.accentColor}">${faction.primaryResource} & ${faction.secondaryResource}</span>
              </div>
              <div class="ccd-meta-row">
                <span class="meta-label">Specializations:</span>
                <span class="meta-val">${cls.specializations.join(' • ')}</span>
              </div>
            </div>

            <div class="ccd-abilities-section">
              <div class="ccd-abilities-label">Signature Abilities:</div>
              <div class="ccd-abilities-grid">
                ${cls.abilities.slice(0, 5).map((ab) => `
                  <div class="ccd-ability-item" title="${ab.description}">
                    <span class="ab-icon">${ab.icon}</span>
                    <span class="ab-name">${ab.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <button class="ccd-select-btn ${isSelected ? 'active' : ''}" data-select-class="${cls.id}" data-select-faction="${cls.factionId}">
              ${isSelected ? '✓ ACTIVE IN LAUNCHER' : '⚔️ SELECT THIS CLASS & PLAY'}
            </button>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll<HTMLButtonElement>('[data-select-class]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cid = btn.getAttribute('data-select-class') as ClassId;
        const fid = btn.getAttribute('data-select-faction') as FactionId;
        this.selectedClass = cid;
        this.selectedFaction = fid;
        this.renderLauncherFactionAndClassSelectors();
        this.renderClassesAndRolesSection();
        this.focusPlayModal();
      });
    });
  }

  private renderActiveShowcasePanel(): void {
    const slot = document.getElementById('showcase-content-slot');
    if (!slot) return;

    if (this.activeShowcaseTab === 'FACTIONS') {
      const fac = FACTIONS_REGISTRY[this.selectedFaction];
      const radar = FACTION_RADAR_DATA[this.selectedFaction];
      const facIcon = FACTION_ICONS[this.selectedFaction];

      slot.innerHTML = `
        <div class="showcase-panel">
          <div class="faction-matrix-grid">
            <div class="faction-radar-panel" style="border-color:${fac.bannerColor}">
              <div class="faction-showcase-head">
                <img src="${facIcon}" alt="${fac.name}" class="showcase-fac-crest" />
                <div>
                  <h3 style="color:${fac.accentColor}; font-size:19px; margin-bottom:2px;">${fac.title}</h3>
                  <small style="color:#94a3b8; font-size:12px;">${fac.lore}</small>
                </div>
              </div>

              <div class="resource-summary-card">
                <strong style="color:${fac.accentColor}">${fac.primaryResource} & ${fac.secondaryResource}:</strong>
                <p style="margin-top:4px; font-size:11.5px; color:#cbd5e1; line-height:1.45;">${fac.resourceDescription}</p>
              </div>

              <div class="radar-stat-bar">
                <div class="radar-label-row"><span>Survivability</span><strong>${radar.survivability}%</strong></div>
                <div class="radar-track"><div class="radar-fill" style="width:${radar.survivability}%; background:${fac.bannerColor}"></div></div>
              </div>
              <div class="radar-stat-bar">
                <div class="radar-label-row"><span>Burst Damage</span><strong>${radar.burstDamage}%</strong></div>
                <div class="radar-track"><div class="radar-fill" style="width:${radar.burstDamage}%; background:${fac.bannerColor}"></div></div>
              </div>
              <div class="radar-stat-bar">
                <div class="radar-label-row"><span>Crowd Control</span><strong>${radar.crowdControl}%</strong></div>
                <div class="radar-track"><div class="radar-fill" style="width:${radar.crowdControl}%; background:${fac.bannerColor}"></div></div>
              </div>
              <div class="radar-stat-bar">
                <div class="radar-label-row"><span>Healing & Support</span><strong>${radar.healingSupport}%</strong></div>
                <div class="radar-track"><div class="radar-fill" style="width:${radar.healingSupport}%; background:${fac.bannerColor}"></div></div>
              </div>
              <div class="radar-stat-bar">
                <div class="radar-label-row"><span>Mobility</span><strong>${radar.mobility}%</strong></div>
                <div class="radar-track"><div class="radar-fill" style="width:${radar.mobility}%; background:${fac.bannerColor}"></div></div>
              </div>
            </div>

            <div class="classes-grid-showcase">
              ${fac.classes
                .map((cid) => {
                  const c = CLASSES_REGISTRY[cid];
                  return `
                    <div class="class-card-showcase" style="border-color:${cid === this.selectedClass ? fac.bannerColor : 'rgba(148,163,184,0.2)'}">
                      <div class="ccs-head">
                        <span class="ccs-title">${c.name}</span>
                        <span class="ccs-role-tag">${c.role}</span>
                      </div>
                      <p style="font-size:12px; color:#cbd5e1; line-height:1.45;">${c.description}</p>
                      <div style="font-size:11px; font-weight:700; color:#94a3b8; margin-top:4px;">Signature Abilities:</div>
                      <div class="ccs-abilities-strip">
                        ${c.abilities.slice(0, 5).map((a) => `<span class="ccs-ab-badge">${a.icon} ${a.name}</span>`).join('')}
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        </div>
      `;
    } else if (this.activeShowcaseTab === 'WORLD') {
      slot.innerHTML = `
        <div class="showcase-panel">
          <div class="pillars-grid">
            <div class="pillar-card">
              <span class="pillar-icon">🦅</span>
              <h4>High-Altitude Flight Mounts</h4>
              <p>Press <strong>[M]</strong> to summon majestic Sky-Drakes or Gryphons. Soar above winding canyons, cross jagged cliffs, and scout distant world boss spawns from the clouds.</p>
            </div>
            <div class="pillar-card">
              <span class="pillar-icon">🏔️</span>
              <h4>Sprawling Longitudinal Terrain</h4>
              <p>Explore elongated valleys, narrow mountain passes, and hazardous gorges designed for tactical ambush points and cross-faction territory battles.</p>
            </div>
            <div class="pillar-card">
              <span class="pillar-icon">⚔️</span>
              <h4>Cross-Faction Warzone Borders</h4>
              <p>Venture beyond peaceful sanctuaries into volatile disputed territories where Solari, Terra, Umbri, and Aether forces collide for control of Relic Obelisks.</p>
            </div>
            <div class="pillar-card">
              <span class="pillar-icon">🏰</span>
              <h4>5-Player Instanced Dungeons</h4>
              <p>Press <strong>[I]</strong> from anywhere in the world to queue for dungeons like the Sunspire Vaults or Hollowed Crypts with instant AI party auto-fill.</p>
            </div>
          </div>
        </div>
      `;
    } else if (this.activeShowcaseTab === 'TCG') {
      slot.innerHTML = `
        <div class="showcase-panel">
          <div class="tcg-steps-row">
            <div class="tcg-step-box">
              <span style="font-size:24px;">🃏</span>
              <h4>Step 1: Collect Cards</h4>
              <p>Acquire physical or digital cards from <strong>glimmerfalltcg.com</strong> or harvest in-game 3D Relic Obelisks.</p>
            </div>
            <span class="tcg-arrow-sep">➔</span>
            <div class="tcg-step-box">
              <span style="font-size:24px;">🛡️</span>
              <h4>Step 2: Socket Deck</h4>
              <p>Press <strong>[C]</strong> in the 3D world to socket any 3 cards into your active combat relic deck.</p>
            </div>
            <span class="tcg-arrow-sep">➔</span>
            <div class="tcg-step-box">
              <span style="font-size:24px;">⚡</span>
              <h4>Step 3: Mutate Abilities</h4>
              <p>Heals chain across allies, crits ignite Solar Burn, and Purges refund cooldowns dynamically.</p>
            </div>
          </div>

          <div class="tcg-cards-grid">
            ${TCG_RELIC_CARDS.map((card) => {
              const f = FACTIONS_REGISTRY[card.factionId];
              return `
                <div class="tcg-relic-card" style="border-color:${f.bannerColor}">
                  <div class="trc-head">
                    <span style="color:${f.accentColor}">${card.factionId} • ${card.rarity}</span>
                    <span>${card.cardNumber}</span>
                  </div>
                  <div class="trc-art">${card.icon}</div>
                  <div class="trc-name">${card.name}</div>
                  <div class="trc-summary">${card.effectSummary}</div>
                  <blockquote style="font-size:10px; font-style:italic; color:#94a3b8; border-top:1px solid rgba(255,255,255,0.08); padding-top:4px; margin-top:auto;">${card.loreQuote}</blockquote>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else {
      // ENGINE
      slot.innerHTML = `
        <div class="showcase-panel">
          <div class="pillars-grid">
            <div class="pillar-card">
              <span class="pillar-icon">🌐</span>
              <h4>Authoritative 20Hz Tick Engine</h4>
              <p>Zero client-side trust. All positions, cooldowns, threat tables, damage checks, and hit detection run on the 50ms Node.js tick server.</p>
            </div>
            <div class="pillar-card">
              <span class="pillar-icon">🎮</span>
              <h4>Three.js WebGL & GLB Rig</h4>
              <p>Smooth third-person orbital camera, hardware-accelerated shaders, procedural terrain textures, and skeletal .glb character animations.</p>
            </div>
            <div class="pillar-card">
              <span class="pillar-icon">🏰</span>
              <h4>Cross-World Matchmaking</h4>
              <p>Role-based dungeon finder (Tank, Healer, DPS) with automatic party formation and instant AI companion backup bots.</p>
            </div>
            <div class="pillar-card">
              <span class="pillar-icon">🎯</span>
              <h4>Customized Tactical HUD</h4>
              <p>90% clear viewport, 6-slot tactical combat bar, live combat log, custom keybindings, and dynamic floating combat numbers.</p>
            </div>
          </div>
        </div>
      `;
    }
  }

  private bindGuestInputs(): void {
    const guestInput = document.getElementById('input-guest-hero-name') as HTMLInputElement | null;
    if (guestInput) {
      guestInput.addEventListener('input', () => {
        this.guestHeroName = guestInput.value.trim().slice(0, 24);
      });
      guestInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          this.handleEnterWorldSubmit();
        }
      });
    }

    document.getElementById('btn-randomize-hero-name')?.addEventListener('click', () => {
      const cls = CLASSES_REGISTRY[this.selectedClass];
      const titles = ['Champion', 'Vanguard', 'Warden', 'Aegis', 'Striker', 'Shadow', 'Weaver', 'Blade'];
      const pickTitle = titles[Math.floor(Math.random() * titles.length)];
      const randNum = Math.floor(100 + Math.random() * 899);
      this.guestHeroName = `${cls.name.split(' ')[0]}_${pickTitle}${randNum}`.slice(0, 24);
      if (guestInput) {
        guestInput.value = this.guestHeroName;
      }
    });
  }

  private bindAccountInputs(): void {
    const idInput = document.getElementById('input-auth-identifier') as HTMLInputElement | null;
    if (idInput) {
      idInput.addEventListener('input', () => {
        this.identifier = idInput.value;
        if (this.checkDebounceTimer) clearTimeout(this.checkDebounceTimer);
        this.checkDebounceTimer = setTimeout(() => {
          this.performAccountCheck(this.identifier);
        }, 350);
      });

      idInput.addEventListener('blur', () => {
        this.identifier = idInput.value;
        this.performAccountCheck(this.identifier);
      });

      idInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          const passInput = document.getElementById('input-auth-password') as HTMLInputElement | null;
          if (passInput) {
            passInput.focus();
          } else {
            this.handleEnterWorldSubmit();
          }
        }
      });
    }
  }

  private async handleEnterWorldSubmit(): Promise<void> {
    this.authErrorMessage = null;
    const errorEl = document.getElementById('auth-error-banner');
    if (errorEl) errorEl.classList.add('hidden');

    if (this.launcherMode === 'GUEST') {
      const guestInput = document.getElementById('input-guest-hero-name') as HTMLInputElement | null;
      const cleanHeroName = (guestInput?.value || this.guestHeroName || '').trim() || `Vanguard_${Math.floor(100 + Math.random() * 899)}`;

      const res = await authService.authenticate({
        heroName: cleanHeroName.slice(0, 24),
        factionId: this.selectedFaction,
        classId: this.selectedClass,
        isGuest: true,
      });

      if (res.ok && res.session) {
        this.hide();
        this.cb.onEnterWorld(res.session);
      }
      return;
    }

    // ACCOUNT MODE
    const idInput = document.getElementById('input-auth-identifier') as HTMLInputElement | null;
    const cleanId = (idInput?.value || this.identifier).trim();

    if (!cleanId) {
      this.showAuthError('Please enter your username or email.');
      idInput?.focus();
      return;
    }

    if (this.authCheckState === 'EXISTS') {
      const passInput = document.getElementById('input-auth-password') as HTMLInputElement | null;
      const password = passInput?.value || '';
      if (!password) {
        this.showAuthError('Please enter your account password.');
        passInput?.focus();
        return;
      }

      const res = await authService.authenticate({
        identifier: cleanId,
        password,
        factionId: this.selectedFaction,
        classId: this.selectedClass,
      });

      if (!res.ok || !res.session) {
        this.showAuthError(res.error || 'Incorrect password.');
        return;
      }

      this.hide();
      this.cb.onEnterWorld(res.session);
    } else {
      // NEW account registration
      const heroInput = document.getElementById('input-hero-name') as HTMLInputElement | null;
      const passInput = document.getElementById('input-auth-password') as HTMLInputElement | null;
      const confirmInput = document.getElementById('input-auth-password-confirm') as HTMLInputElement | null;

      const heroName = (heroInput?.value || cleanId.split('@')[0]).trim().slice(0, 24);
      const password = passInput?.value || '';
      const confirm = confirmInput?.value || '';

      if (!password || password.length < 3) {
        this.showAuthError('Password must be at least 3 characters.');
        passInput?.focus();
        return;
      }
      if (password !== confirm) {
        this.showAuthError('Passwords do not match. Please re-enter.');
        confirmInput?.focus();
        return;
      }

      const res = await authService.authenticate({
        identifier: cleanId,
        password,
        heroName: heroName || `Hero_${Math.floor(Math.random() * 900 + 100)}`,
        factionId: this.selectedFaction,
        classId: this.selectedClass,
      });

      if (!res.ok || !res.session) {
        this.showAuthError(res.error || 'Registration failed.');
        return;
      }

      this.hide();
      this.cb.onEnterWorld(res.session);
    }
  }

  private showAuthError(msg: string): void {
    this.authErrorMessage = msg;
    const errorEl = document.getElementById('auth-error-banner');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
    }
  }

  private bindPortalEvents(): void {
    const root = document.getElementById('landing-portal');
    if (!root) return;

    // Header "⚔️ Play Now" button
    document.getElementById('nav-btn-play-header')?.addEventListener('click', () => {
      this.focusPlayModal();
    });

    // Launcher Mode Switcher (⚡ Guest Quick-Play vs 🔑 Account Mode)
    root.querySelectorAll<HTMLButtonElement>('[data-launcher-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('[data-launcher-mode]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.launcherMode = btn.getAttribute('data-launcher-mode') as 'GUEST' | 'ACCOUNT';
        const heading = document.getElementById('launcher-mode-heading');
        const subtext = document.getElementById('launcher-mode-subtext');
        if (heading && subtext) {
          if (this.launcherMode === 'GUEST') {
            heading.textContent = '⚡ Guest Quick-Play';
            subtext.textContent = 'Play immediately without registration. Choose a hero name and start exploring the Nexus.';
          } else {
            heading.textContent = '🔑 Account Portal (Unified Login & Register)';
            subtext.textContent = 'Unified login & registration. Type your username/email; if already registered, enter your password to resume your hero progression.';
          }
        }
        this.renderAuthSlotContent();
      });
    });

    // Launch Enter World button
    document.getElementById('btn-launch-enter-world')?.addEventListener('click', () => {
      this.handleEnterWorldSubmit();
    });

    // Role filter pills
    root.querySelectorAll<HTMLButtonElement>('[data-role-filter]').forEach((pill) => {
      pill.addEventListener('click', () => {
        root.querySelectorAll('[data-role-filter]').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeRoleFilter = pill.getAttribute('data-role-filter') as any;
        this.renderClassesAndRolesSection();
      });
    });

    // Showcase tab switching
    root.querySelectorAll<HTMLButtonElement>('[data-showcase]').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('[data-showcase]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeShowcaseTab = btn.getAttribute('data-showcase') as any;
        this.renderActiveShowcasePanel();
      });
    });
  }
}

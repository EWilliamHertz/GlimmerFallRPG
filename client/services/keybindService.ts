export interface KeybindConfig {
  slot0: string; // Action Slot 1 (Default 1)
  slot1: string; // Action Slot 2 (Default 2)
  slot2: string; // Action Slot 3 (Default 3)
  slot3: string; // Action Slot 4 (Default 4)
  slot4: string; // Action Slot 5 (Default 5)
  slot5: string; // Action Slot 6 / Ultimate (Default 6)
  jump: string;  // Space
  dodge: string; // Shift
  tabTarget: string; // Tab
  harvest: string;   // G
  toggleMount: string; // M
  openLoadout: string; // K
  openQueue: string;   // I
  openHero: string;    // C
  openTalents: string; // N
  openKeybinds: string; // O
}

export const DEFAULT_KEYBINDS: KeybindConfig = {
  slot0: '1',
  slot1: '2',
  slot2: '3',
  slot3: '4',
  slot4: '5',
  slot5: '6',
  jump: 'Space',
  dodge: 'Shift',
  tabTarget: 'Tab',
  harvest: 'g',
  toggleMount: 'm',
  openLoadout: 'k',
  openQueue: 'i',
  openHero: 'c',
  openTalents: 'n',
  openKeybinds: 'o',
};

export const KEYBIND_LABELS: Record<keyof KeybindConfig, string> = {
  slot0: 'Action Slot 1 (Default 1)',
  slot1: 'Action Slot 2 (Default 2)',
  slot2: 'Action Slot 3 (Default 3)',
  slot3: 'Action Slot 4 (Default 4)',
  slot4: 'Action Slot 5 (Default 5)',
  slot5: 'Ultimate / Slot 6 (Default 6)',
  jump: '3D Jump (Space)',
  dodge: 'Dodge Roll / Dash (Shift)',
  tabTarget: 'Cycle Hostile Target (Tab)',
  harvest: 'Harvest Relic Node (G)',
  toggleMount: 'Summon Emberwing Hawk Mount (M)',
  openLoadout: 'Abilities & Spellbook (K)',
  openQueue: 'Dungeons & PvP Queue (I)',
  openHero: 'Hero Attributes & TCG Relics (C)',
  openTalents: 'Talents Matrix (N)',
  openKeybinds: 'Keybindings Settings (O)',
};

const STORAGE_KEY = 'glimmerfall_online_keybinds_v3';

const RESERVED_MOVEMENT_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'keyw',
  'keya',
  'keys',
  'keyd',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
]);

class KeybindService {
  private config: KeybindConfig;
  private listeners: Array<(cfg: KeybindConfig) => void> = [];

  constructor() {
    this.config = this.loadConfig();
  }

  public getConfig(): KeybindConfig {
    return { ...this.config };
  }

  public getDisplayLabel(action: keyof KeybindConfig): string {
    const key = this.config[action] || DEFAULT_KEYBINDS[action];
    if (key === 'Space') return 'Space';
    if (key === 'Shift') return 'Shift';
    if (key === 'Tab') return 'Tab';
    return key.toUpperCase();
  }

  public setKeybind(action: keyof KeybindConfig, newKey: string): void {
    // Strictly prevent binding mouse buttons or core movement keys to abilities or action slots
    if (!newKey || newKey.startsWith('Mouse') || RESERVED_MOVEMENT_KEYS.has(newKey.toLowerCase())) return;
    this.config[action] = newKey;
    this.saveConfig();
    this.notify();
  }

  public resetDefaults(): void {
    this.config = { ...DEFAULT_KEYBINDS };
    this.saveConfig();
    this.notify();
  }

  public subscribe(cb: (cfg: KeybindConfig) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(): void {
    for (const cb of this.listeners) {
      cb(this.config);
    }
  }

  private loadConfig(): KeybindConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_KEYBINDS };
      const parsed = JSON.parse(raw);
      // Strip any legacy mouse binds or accidental movement key collisions
      for (const k of Object.keys(DEFAULT_KEYBINDS) as Array<keyof KeybindConfig>) {
        if (
          !parsed[k] ||
          typeof parsed[k] !== 'string' ||
          parsed[k].startsWith('Mouse') ||
          RESERVED_MOVEMENT_KEYS.has(parsed[k].toLowerCase())
        ) {
          parsed[k] = DEFAULT_KEYBINDS[k];
        }
      }
      return { ...DEFAULT_KEYBINDS, ...parsed };
    } catch {
      return { ...DEFAULT_KEYBINDS };
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // Ignore localStorage error
    }
  }
}

export const keybindService = new KeybindService();

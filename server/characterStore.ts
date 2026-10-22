import fs from 'fs';
import path from 'path';
import { PlayerEntity, ClassId, PrimaryAttributes } from '../shared/types';
import { CLASSES_REGISTRY } from '../shared/classesRegistry';

export interface SavedCharacterData {
  name: string;
  classId: ClassId;
  level: number;
  currentXp: number;
  maxXp: number;
  attributePointsAvailable: number;
  allocatedAttributes: Partial<PrimaryAttributes>;
  abilityPointsAvailable: number;
  abilityRanks: Record<string, number>;
  talents: Record<string, number>;
  talentPointsAvailable: number;
  equippedRelicDeck: [string, string, string];
  actionBars: (string | null)[];
  tacticalLoadout: [string, string, string, string, string, string];
  x?: number;
  y?: number;
  z?: number;
  facingRad?: number;
  savedOpenWorldPos?: { x: number; y: number; z: number } | null;
  lastSavedAt: number;
}

export interface AccountData {
  identifier: string; // lowercase email or username
  passwordHash: string;
  heroName: string;
  factionId: string;
  classId: string;
  createdAt: number;
}

const DATA_DIR = path.resolve(__dirname, '../data');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

class CharacterStore {
  private characters: Map<string, SavedCharacterData> = new Map();
  private accounts: Map<string, AccountData> = new Map();
  private dirty: boolean = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(CHARACTERS_FILE)) {
        const raw = fs.readFileSync(CHARACTERS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            this.characters.set(k.toLowerCase(), v as SavedCharacterData);
          }
        }
      }
      if (fs.existsSync(ACCOUNTS_FILE)) {
        const raw = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            this.accounts.set(k.toLowerCase(), v as AccountData);
          }
        }
      }
    } catch (err) {
      console.error('[CharacterStore] Failed to load data from disk:', err);
    }
  }

  public flush(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const charObj: Record<string, SavedCharacterData> = {};
      for (const [k, v] of this.characters.entries()) {
        charObj[k] = v;
      }
      fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(charObj, null, 2), 'utf-8');

      const accObj: Record<string, AccountData> = {};
      for (const [k, v] of this.accounts.entries()) {
        accObj[k] = v;
      }
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accObj, null, 2), 'utf-8');

      this.dirty = false;
    } catch (err) {
      console.error('[CharacterStore] Failed to write data to disk:', err);
    }
  }

  private scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.flush();
    }, 1000);
  }

  public getAccount(identifier: string): AccountData | null {
    if (!identifier) return null;
    return this.accounts.get(identifier.trim().toLowerCase()) ?? null;
  }

  public createAccount(
    identifier: string,
    password: string,
    heroName: string,
    factionId: string,
    classId: string
  ): AccountData {
    const key = identifier.trim().toLowerCase();
    const data: AccountData = {
      identifier: key,
      passwordHash: password, // Store password
      heroName: heroName.trim().slice(0, 24),
      factionId,
      classId,
      createdAt: Date.now(),
    };
    this.accounts.set(key, data);
    this.scheduleSave();
    return data;
  }

  public verifyAccount(
    identifier: string,
    password: string
  ): { ok: boolean; account?: AccountData; reason?: string } {
    const acc = this.getAccount(identifier);
    if (!acc) {
      return { ok: false, reason: 'Account does not exist' };
    }
    if (acc.passwordHash !== password) {
      return { ok: false, reason: 'Incorrect password' };
    }
    return { ok: true, account: acc };
  }

  public getCharacter(heroName: string): SavedCharacterData | null {
    if (!heroName) return null;
    return this.characters.get(heroName.trim().toLowerCase()) ?? null;
  }

  public savePlayer(player: PlayerEntity): void {
    if (!player.name || player.isAiCompanion) return;
    const key = player.name.trim().toLowerCase();
    const data: SavedCharacterData = {
      name: player.name.trim(),
      classId: player.classId,
      level: player.level || 1,
      currentXp: player.currentXp || 0,
      maxXp: player.maxXp || Math.round((player.level || 1) * 300),
      attributePointsAvailable: player.attributePointsAvailable || 0,
      allocatedAttributes: player.allocatedAttributes || {},
      abilityPointsAvailable: player.abilityPointsAvailable || 0,
      abilityRanks: player.abilityRanks || {},
      talents: player.talents || {},
      talentPointsAvailable: player.talentPointsAvailable ?? 60,
      equippedRelicDeck: [...player.equippedRelicDeck],
      actionBars: [...player.actionBars],
      tacticalLoadout: [...player.tacticalLoadout],
      x: player.x,
      y: player.y,
      z: player.z,
      facingRad: player.facingRad,
      savedOpenWorldPos: player.savedOpenWorldPos,
      lastSavedAt: Date.now(),
    };
    this.characters.set(key, data);
    this.scheduleSave();
  }

  public restorePlayer(player: PlayerEntity, data: SavedCharacterData): void {
    player.name = data.name;
    player.classId = data.classId;
    const cls = CLASSES_REGISTRY[data.classId];
    if (cls) {
      player.factionId = cls.factionId;
      player.role = cls.role;
      player.tankStance = cls.role === 'TANK';
    }
    player.level = Math.max(1, data.level || 1);
    player.currentXp = Math.max(0, data.currentXp || 0);
    player.maxXp = data.maxXp || Math.round(player.level * 300);
    player.attributePointsAvailable = data.attributePointsAvailable ?? 0;
    player.allocatedAttributes = data.allocatedAttributes || {};
    player.abilityPointsAvailable = data.abilityPointsAvailable ?? 0;
    player.abilityRanks = data.abilityRanks || {};
    player.talents = data.talents || {};
    player.talentPointsAvailable = data.talentPointsAvailable ?? 60;
    player.targetId = null;
    if (Array.isArray(data.equippedRelicDeck) && data.equippedRelicDeck.length === 3) {
      player.equippedRelicDeck = [...data.equippedRelicDeck];
    }
    if (Array.isArray(data.actionBars) && data.actionBars.length === 24) {
      player.actionBars = [...data.actionBars];
    }
    if (Array.isArray(data.tacticalLoadout) && data.tacticalLoadout.length === 6) {
      player.tacticalLoadout = [...data.tacticalLoadout];
    }
    if (typeof data.x === 'number' && typeof data.y === 'number') {
      player.x = data.x;
      player.y = data.y;
      player.z = data.z ?? 0;
    }
    if (typeof data.facingRad === 'number') {
      player.facingRad = data.facingRad;
    }
    if (data.savedOpenWorldPos) {
      player.savedOpenWorldPos = data.savedOpenWorldPos;
    }
  }
}

export const characterStore = new CharacterStore();

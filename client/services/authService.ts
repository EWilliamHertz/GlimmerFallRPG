import { ClassId, FactionId } from '../../shared/types';

export interface AuthSession {
  mode: 'GUEST' | 'ACCOUNT';
  heroName: string;
  factionId: FactionId;
  classId: ClassId;
  email?: string;
  authenticatedAtMs: number;
}

export interface AccountCheckResult {
  exists: boolean;
  heroName?: string;
  factionId?: FactionId;
  classId?: ClassId;
}

export interface AuthResponse {
  ok: boolean;
  session?: AuthSession;
  error?: string;
}

export const authService = {
  async checkAccount(identifier: string): Promise<AccountCheckResult> {
    const clean = identifier.trim().toLowerCase();
    if (!clean) {
      return { exists: false };
    }
    try {
      const res = await fetch(`/api/account/check?identifier=${encodeURIComponent(clean)}`);
      if (!res.ok) {
        return { exists: false };
      }
      return (await res.json()) as AccountCheckResult;
    } catch (err) {
      console.warn('[authService] checkAccount network fallback:', err);
      return { exists: false };
    }
  },

  async authenticate(params: {
    identifier?: string;
    password?: string;
    heroName?: string;
    factionId?: FactionId;
    classId?: ClassId;
    isGuest?: boolean;
  }): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/account/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error || 'Authentication failed' };
      }
      return { ok: true, session: data.session as AuthSession };
    } catch (err) {
      console.warn('[authService] authenticate network fallback:', err);
      // Fallback in case of network issue
      if (params.isGuest) {
        const cleanName = params.heroName?.trim() || `Vanguard_${Math.floor(100 + Math.random() * 899)}`;
        return {
          ok: true,
          session: {
            mode: 'GUEST',
            heroName: cleanName.slice(0, 24),
            factionId: params.factionId || 'SOLARI',
            classId: params.classId || 'SUNFORGED_PALADIN',
            authenticatedAtMs: Date.now(),
          },
        };
      }
      return { ok: false, error: 'Could not connect to server. Please try again.' };
    }
  },

  playAsGuest(heroName: string, factionId: FactionId, classId: ClassId): AuthSession {
    const cleanName = heroName.trim() || `Vanguard_${Math.floor(100 + Math.random() * 899)}`;
    return {
      mode: 'GUEST',
      heroName: cleanName.slice(0, 24),
      factionId,
      classId,
      authenticatedAtMs: Date.now(),
    };
  },

  login(email: string, _password: string, factionId: FactionId, classId: ClassId): AuthSession {
    const derivedName = email.split('@')[0]?.trim() || 'SunspireChampion';
    return {
      mode: 'ACCOUNT',
      heroName: derivedName.slice(0, 24),
      factionId,
      classId,
      email,
      authenticatedAtMs: Date.now(),
    };
  },

  register(
    heroName: string,
    email: string,
    _password: string,
    factionId: FactionId,
    classId: ClassId
  ): AuthSession {
    const cleanName = heroName.trim() || email.split('@')[0] || 'RootdeepWarden';
    return {
      mode: 'ACCOUNT',
      heroName: cleanName.slice(0, 24),
      factionId,
      classId,
      email,
      authenticatedAtMs: Date.now(),
    };
  },
};

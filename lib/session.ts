import { Role, SessionUser } from './types';

// Each role area keeps its own token so you can be logged in as an admin in one
// tab and an end user in another without them clobbering each other.
type Area = 'super-admin' | 'admin' | 'user';

export interface StoredSession {
  accessToken: string;
  refreshToken?: string;
  role: Role;
  user?: SessionUser;
}

const keyFor = (area: Area) => `ff.session.${area}`;

export function saveSession(area: Area, session: StoredSession): void {
  localStorage.setItem(keyFor(area), JSON.stringify(session));
}

export function loadSession(area: Area): StoredSession | null {
  const raw = localStorage.getItem(keyFor(area));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function clearSession(area: Area): void {
  localStorage.removeItem(keyFor(area));
}

export type { Area };

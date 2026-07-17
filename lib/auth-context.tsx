'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Area,
  StoredSession,
  clearSession,
  loadSession,
  saveSession,
} from './session';

// A lightweight global auth store implemented with the Context API (in place of
// Redux, to match this project's dependency-light frontend). It mirrors the
// per-area sessions persisted in localStorage so components re-render on
// login/logout, while localStorage remains the source of truth across reloads.
interface AuthContextValue {
  ready: boolean;
  getSession: (area: Area) => StoredSession | null;
  setSession: (area: Area, session: StoredSession) => void;
  clear: (area: Area) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AREAS: Area[] = ['super-admin', 'admin', 'user'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Record<string, StoredSession | null>>(
    {},
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial: Record<string, StoredSession | null> = {};
    for (const area of AREAS) initial[area] = loadSession(area);
    setSessions(initial);
    setReady(true);
  }, []);

  const getSession = useCallback(
    (area: Area) => sessions[area] ?? null,
    [sessions],
  );

  const setSession = useCallback((area: Area, session: StoredSession) => {
    saveSession(area, session);
    setSessions((prev) => ({ ...prev, [area]: session }));
  }, []);

  const clear = useCallback((area: Area) => {
    clearSession(area);
    setSessions((prev) => ({ ...prev, [area]: null }));
  }, []);

  const value = useMemo(
    () => ({ ready, getSession, setSession, clear }),
    [ready, getSession, setSession, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

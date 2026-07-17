'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { FeatureCheckResult, OrgFeature, SessionUser } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { Field } from '@/components/Field';
import { Alert } from '@/components/Alert';

export default function UserPage() {
  const { ready, getSession, setSession, clear } = useAuth();
  const session = getSession('user');
  const token = session?.accessToken ?? null;
  const user = session?.user ?? null;

  const onLogout = useCallback(() => clear('user'), [clear]);

  const applyAuth = useCallback(
    (result: Awaited<ReturnType<typeof api.login>>) =>
      setSession('user', {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        role: 'end_user',
        user: result.user,
      }),
    [setSession],
  );

  if (!ready) return null;

  return (
    <>
      <div className="page-header">
        <div className="spread">
          <h1>End User</h1>
          <Link href="/" className="muted">
            Home
          </Link>
        </div>
        {user ? (
          <p>
            Features for <strong>{user.organizationName ?? 'your organization'}</strong>.
          </p>
        ) : (
          <p>Sign up with your work email — we detect your organization automatically.</p>
        )}
      </div>
      {token && user ? (
        <FeatureScreen token={token} user={user} onLogout={onLogout} />
      ) : (
        <AuthPanel onAuthenticated={applyAuth} />
      )}
    </>
  );
}

function AuthPanel({
  onAuthenticated,
}: {
  onAuthenticated: (result: Awaited<ReturnType<typeof api.login>>) => void;
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === 'login'
          ? await api.login(email, password)
          : await api.signup({ name, email, password, phone: phone || undefined });
      onAuthenticated(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="spread">
        <h2>{mode === 'login' ? 'Log in' : 'Sign up'}</h2>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? 'Need an account?' : 'Have an account?'}
        </button>
      </div>
      <Alert kind="error" message={error} />
      <form onSubmit={submit}>
        {mode === 'signup' && (
          <Field
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@yourcompany.com"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {mode === 'signup' && (
          <Field
            label="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        )}
        <button type="submit" disabled={busy || !email || !password}>
          {busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
      </form>
      {mode === 'signup' && (
        <p className="muted">
          Your organization is identified from your email domain. If it says “not
          registered”, ask your admin to have it added.
        </p>
      )}
      {mode === 'login' && (
        <p className="muted">
          Forgot your password? <Link href="/forgot-password">Reset it</Link>.
        </p>
      )}
    </div>
  );
}

function FeatureScreen({
  token,
  user,
  onLogout,
}: {
  token: string;
  user: SessionUser;
  onLogout: () => void;
}) {
  const [features, setFeatures] = useState<OrgFeature[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<FeatureCheckResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const rows = await api.getMyFeatures(token);
      setFeatures(rows);
      // Pre-check everything so the user can submit their selection.
      setSelected(new Set(rows.map((r) => r.code)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onLogout();
      else setError(err instanceof ApiError ? err.message : 'Could not load features');
    }
  }, [token, onLogout]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setBusy(true);
    try {
      setResults(await api.checkMyFeatures(Array.from(selected), token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Check failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card">
        <div className="spread">
          <h2>Select features</h2>
          <button className="secondary" onClick={onLogout}>
            Log out ({user.email})
          </button>
        </div>
        <Alert kind="error" message={error} />
        <form onSubmit={submit}>
          <ul className="checklist">
            {features.map((f) => (
              <li key={f.code}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.has(f.code)}
                    onChange={() => toggle(f.code)}
                  />
                  <span>
                    <strong>{f.name}</strong>
                    {f.custom && <span className="tag on"> custom</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button type="submit" disabled={busy || selected.size === 0}>
            {busy ? 'Checking...' : 'Submit'}
          </button>
        </form>
      </div>

      {results && (
        <div className="card">
          <h2>Availability</h2>
          <ul className="list">
            {results.map((r) => (
              <li key={r.code}>
                <div className="spread">
                  <strong>{r.name}</strong>
                  <span className={`tag ${r.enabled ? 'on' : 'off'}`}>
                    {r.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

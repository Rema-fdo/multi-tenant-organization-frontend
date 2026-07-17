'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { ManagedUser, OrgFeature, SessionUser } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { Field } from '@/components/Field';
import { Alert } from '@/components/Alert';

export default function AdminPage() {
  const { ready, getSession, setSession, clear } = useAuth();
  const session = getSession('admin');
  const token = session?.accessToken ?? null;
  const user = session?.user ?? null;

  const onLogout = useCallback(() => clear('admin'), [clear]);

  if (!ready) return null;

  return (
    <>
      <div className="page-header">
        <div className="spread">
          <h1>Organization Admin</h1>
          <Link href="/" className="muted">
            Home
          </Link>
        </div>
        {user ? (
          <p>
            Managing <strong>{user.organizationName ?? 'your organization'}</strong>.
          </p>
        ) : (
          <p>Enable features and manage users for your organization.</p>
        )}
      </div>
      {token && user ? (
        <AdminConsole token={token} user={user} onLogout={onLogout} />
      ) : (
        <LoginPanel
          onLogin={(result) =>
            setSession('admin', {
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              role: 'org_admin',
              user: result.user,
            })
          }
        />
      )}
    </>
  );
}

function LoginPanel({
  onLogin,
}: {
  onLogin: (result: Awaited<ReturnType<typeof api.login>>) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      onLogin(await api.login(email, password));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Log in</h2>
      <Alert kind="error" message={error} />
      <form onSubmit={submit}>
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="muted">
        New admin? <Link href="/admin/onboard">Complete onboarding</Link>. Forgot
        your password? <Link href="/forgot-password">Reset it</Link>.
      </p>
    </div>
  );
}

function AdminConsole({
  token,
  user,
  onLogout,
}: {
  token: string;
  user: SessionUser;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="card">
        <div className="spread">
          <h2>Signed in</h2>
          <button className="secondary" onClick={onLogout}>
            Log out ({user.email})
          </button>
        </div>
      </div>
      <FeatureSelection token={token} onUnauthorized={onLogout} />
      <UserManagement token={token} onUnauthorized={onLogout} />
    </>
  );
}

function FeatureSelection({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  const [features, setFeatures] = useState<OrgFeature[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<OrgFeature | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await api.getOrganizationFeatures(token);
      setFeatures(rows);
      setSelected(new Set(rows.filter((r) => r.enabled).map((r) => r.code)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onUnauthorized();
      else setError(err instanceof ApiError ? err.message : 'Could not load');
    }
  }, [token, onUnauthorized]);

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
    setOk(null);
    setBusy(true);
    try {
      await api.setOrganizationFeatures(Array.from(selected), token);
      setOk('Features saved.');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  async function remove(f: OrgFeature) {
    if (!confirm(`Delete the custom feature “${f.name}”? This cannot be undone.`))
      return;
    setError(null);
    setOk(null);
    try {
      await api.deleteCustomFeature(f.id, token);
      setOk(`Deleted “${f.name}”.`);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete');
    }
  }

  return (
    <div className="card">
      <h2>Features</h2>
      <p className="muted">
        Select the features enabled for your organization. Custom features are
        specific to your organization and are not visible to any other.
      </p>
      <Alert kind="error" message={error} />
      <Alert kind="success" message={ok} />
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
                  {f.description && <em className="muted"> — {f.description}</em>}
                </span>
              </label>
              {f.custom && (
                <span className="row">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setEditing(f)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => remove(f)}
                  >
                    Delete
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
        <button type="submit" disabled={busy}>
          {busy ? 'Saving...' : 'Save features'}
        </button>
      </form>

      <hr style={{ margin: '20px 0', opacity: 0.2 }} />

      {editing ? (
        <EditCustomFeatureForm
          token={token}
          feature={editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            setOk('Custom feature updated.');
            await refresh();
          }}
        />
      ) : (
        <CreateCustomFeatureForm
          token={token}
          onCreated={async (name) => {
            setOk(`Custom feature “${name}” created.`);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function CreateCustomFeatureForm({
  token,
  onCreated,
}: {
  token: string;
  onCreated: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.createCustomFeature(
        { name, description: description || undefined },
        token,
      );
      setName('');
      setDescription('');
      onCreated(name);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create feature');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h3>Add a custom feature</h3>
      <p className="muted">
        Only your organization will see this feature.
      </p>
      <Alert kind="error" message={error} />
      <Field
        label="Feature name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Culturals"
      />
      <Field
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Cultural events and activities"
      />
      <button type="submit" disabled={busy || name.trim().length < 2}>
        {busy ? 'Creating...' : 'Create custom feature'}
      </button>
    </form>
  );
}

function EditCustomFeatureForm({
  token,
  feature,
  onSaved,
  onCancel,
}: {
  token: string;
  feature: OrgFeature;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(feature.name);
  const [description, setDescription] = useState(feature.description);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.updateCustomFeature(feature.id, { name, description }, token);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update feature');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h3>Edit custom feature</h3>
      <p className="muted">
        Code <code>{feature.code}</code> cannot be changed.
      </p>
      <Alert kind="error" message={error} />
      <Field
        label="Feature name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Field
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="row">
        <button type="submit" disabled={busy || name.trim().length < 2}>
          {busy ? 'Saving...' : 'Save changes'}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function UserManagement({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setUsers(await api.listUsers(token));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onUnauthorized();
      else setError(err instanceof ApiError ? err.message : 'Could not load users');
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggle(u: ManagedUser) {
    setError(null);
    try {
      await api.setUserStatus(
        u.id,
        u.status === 'active' ? 'inactive' : 'active',
        token,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update user');
    }
  }

  return (
    <div className="card">
      <h2>Users ({users.length})</h2>
      <Alert kind="error" message={error} />
      {users.length === 0 ? (
        <p className="muted">No users in your organization yet.</p>
      ) : (
        <ul className="list">
          {users.map((u) => (
            <li key={u.id}>
              <div className="spread">
                <div>
                  <div className="row">
                    <strong>
                      {u.firstName || u.lastName
                        ? `${u.firstName} ${u.lastName}`.trim()
                        : u.email}
                    </strong>
                    <span className="tag">{u.role}</span>
                    <span className={`tag ${u.status === 'active' ? 'on' : 'off'}`}>
                      {u.status}
                    </span>
                  </div>
                  <div className="muted">{u.email}</div>
                </div>
                <button
                  className={u.status === 'active' ? 'danger' : 'secondary'}
                  onClick={() => toggle(u)}
                >
                  {u.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="muted">Users cannot be deleted — only activated or deactivated.</p>
    </div>
  );
}

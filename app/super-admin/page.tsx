'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { CreateAdminResult, ManagedUser, Organization } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { Field } from '@/components/Field';
import { Alert } from '@/components/Alert';

export default function SuperAdminPage() {
  const { ready, getSession, setSession, clear } = useAuth();
  const session = getSession('super-admin');
  const token = session?.accessToken ?? null;

  const onLogout = useCallback(() => clear('super-admin'), [clear]);

  if (!ready) return null;

  return (
    <>
      <div className="page-header">
        <div className="spread">
          <h1>Super Admin</h1>
          <Link href="/" className="muted">
            Home
          </Link>
        </div>
        <p>Create organizations and onboard their admins.</p>
      </div>
      {token ? (
        <Dashboard token={token} onLogout={onLogout} />
      ) : (
        <LoginPanel
          onLogin={(result) =>
            setSession('super-admin', {
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              role: 'super_admin',
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
  onLogin: (result: Awaited<ReturnType<typeof api.superAdminLogin>>) => void;
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      onLogin(await api.superAdminLogin(identifier, password));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Log in</h2>
      <Alert kind="error" message={error} />
      <Field
        label="Email or username"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        autoComplete="username"
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
  );
}

function Dashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Organization | null>(null);

  const refresh = useCallback(async () => {
    try {
      setOrgs(await api.listOrganizations(token));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onLogout();
      else setError(err instanceof ApiError ? err.message : 'Could not load');
    }
  }, [token, onLogout]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <>
      <div className="card">
        <div className="spread">
          <h2>Organizations ({orgs.length})</h2>
          <button className="secondary" onClick={onLogout}>
            Log out
          </button>
        </div>
        <Alert kind="error" message={error} />
        <CreateOrgForm token={token} onCreated={refresh} />
      </div>

      <div className="card">
        <h2>All organizations</h2>
        {orgs.length === 0 ? (
          <p className="muted">No organizations yet.</p>
        ) : (
          <ul className="list">
            {orgs.map((org) => (
              <li key={org.id}>
                <div className="spread">
                  <div>
                    <div className="row">
                      <strong>{org.name}</strong>
                      <code>{org.code}</code>
                      <span className={`tag ${org.status === 'active' ? 'on' : 'off'}`}>
                        {org.status}
                      </span>
                    </div>
                    <div className="muted">domain: {org.domain}</div>
                  </div>
                  <div className="row">
                    <button
                      className="secondary"
                      onClick={() => setSelected(org)}
                    >
                      Manage admins
                    </button>
                    <StatusButton token={token} org={org} onDone={refresh} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <AdminsPanel
          token={token}
          org={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function CreateOrgForm({
  token,
  onCreated,
}: {
  token: string;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.createOrganization({ name, code, domain }, token);
      setName('');
      setCode('');
      setDomain('');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <Alert kind="error" message={error} />
      <Field
        label="Organization name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="company name"
      />
      <Field
        label="Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="company code"
      />
      <Field
        label="Email domain"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="companydomain.in"
      />
      <button
        type="submit"
        disabled={busy || !name.trim() || !code.trim() || !domain.trim()}
      >
        {busy ? 'Creating...' : 'Create organization'}
      </button>
    </form>
  );
}

function StatusButton({
  token,
  org,
  onDone,
}: {
  token: string;
  org: Organization;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const nextStatus = org.status === 'active' ? 'inactive' : 'active';

  async function toggle() {
    setBusy(true);
    try {
      await api.setOrganizationStatus(org.id, nextStatus, token);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className={org.status === 'active' ? 'danger' : 'secondary'} onClick={toggle} disabled={busy}>
      {org.status === 'active' ? 'Deactivate' : 'Activate'}
    </button>
  );
}

function AdminsPanel({
  token,
  org,
  onClose,
}: {
  token: string;
  org: Organization;
  onClose: () => void;
}) {
  const [admins, setAdmins] = useState<ManagedUser[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastOtp, setLastOtp] = useState<CreateAdminResult['otp'] | null>(null);

  const refresh = useCallback(async () => {
    try {
      setAdmins(await api.listAdmins(org.id, token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load admins');
    }
  }, [org.id, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await api.createAdmin(
        org.id,
        { firstName, lastName, email, phone: phone || undefined },
        token,
      );
      setLastOtp(result.otp);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create admin');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="spread">
        <h2>Admins — {org.name}</h2>
        <button className="secondary" onClick={onClose}>
          Close
        </button>
      </div>
      <Alert kind="error" message={error} />
      {lastOtp && (
        <div className="alert success">
          Admin created. An onboarding OTP was sent to {lastOtp.email}.
          {lastOtp.devCode && (
            <>
              {' '}
              <strong>Dev OTP: {lastOtp.devCode}</strong> (expires{' '}
              {new Date(lastOtp.expiresAt).toLocaleTimeString()})
            </>
          )}
        </div>
      )}
      <form onSubmit={create}>
        <div className="row-fields">
          <Field
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Field
            label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={`name@${org.domain}`}
        />
        <Field
          label="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy || !firstName.trim() || !lastName.trim() || !email.trim()}
        >
          {busy ? 'Creating...' : 'Create admin & send OTP'}
        </button>
      </form>

      <h3 style={{ marginTop: 20 }}>Existing admins ({admins.length})</h3>
      {admins.length === 0 ? (
        <p className="muted">No admins yet.</p>
      ) : (
        <ul className="list">
          {admins.map((a) => (
            <li key={a.id}>
              <div className="spread">
                <div>
                  <strong>
                    {a.firstName} {a.lastName}
                  </strong>
                  <div className="muted">{a.email}</div>
                </div>
                <span className={`tag ${a.otpVerified ? 'on' : 'off'}`}>
                  {a.otpVerified ? 'active' : 'pending OTP'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

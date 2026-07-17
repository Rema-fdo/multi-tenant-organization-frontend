'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Field } from '@/components/Field';
import { Alert } from '@/components/Alert';

// Admin onboarding: verify the emailed OTP, then set an initial password. On
// success the admin is logged in and sent to the admin console.
type Step = 'verify' | 'password';

export default function AdminOnboardPage() {
  const router = useRouter();
  const { setSession } = useAuth();

  const [step, setStep] = useState<Step>('verify');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function resend() {
    setError(null);
    setOk(null);
    try {
      const info = await api.sendOtp(email, 'admin_onboarding');
      setOk(
        info.devCode
          ? `OTP re-sent. Dev OTP: ${info.devCode}`
          : 'A new OTP has been sent to your email.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send OTP');
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.verifyOtp(email, 'admin_onboarding', otp);
      setStep('password');
      setOk('OTP verified. Set your password.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  async function setPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const result = await api.setPassword(email, password, 'admin_onboarding');
      setSession('admin', {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        role: 'org_admin',
        user: result.user,
      });
      router.push('/admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not set password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="spread">
          <h1>Admin Onboarding</h1>
          <Link href="/admin" className="muted">
            Back to login
          </Link>
        </div>
        <p>Verify the code sent to your email, then choose a password.</p>
      </div>

      <div className="card">
        <Alert kind="error" message={error} />
        <Alert kind="success" message={ok} />

        {step === 'verify' ? (
          <form onSubmit={verify}>
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Field
              label="OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
            />
            <div className="row">
              <button type="submit" disabled={busy || !email || !otp}>
                {busy ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={resend}
                disabled={!email}
              >
                Resend OTP
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={setPasswordSubmit}>
            <Field
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Field
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            <button type="submit" disabled={busy || password.length < 8}>
              {busy ? 'Saving...' : 'Set password & continue'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

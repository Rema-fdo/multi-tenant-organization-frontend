'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Field } from '@/components/Field';
import { Alert } from '@/components/Alert';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prefill email from the ?email= query param without needing a Suspense
  // boundary (useSearchParams would require one).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('email');
    if (e) setEmail(e);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(email, otp, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="spread">
          <h1>Reset Password</h1>
          <Link href="/forgot-password" className="muted">
            Back
          </Link>
        </div>
        <p>Enter the code from your email and choose a new password.</p>
      </div>
      <div className="card">
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
            label="OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
          />
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
          <button type="submit" disabled={busy || !email || !otp || password.length < 8}>
            {busy ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      </div>
    </>
  );
}

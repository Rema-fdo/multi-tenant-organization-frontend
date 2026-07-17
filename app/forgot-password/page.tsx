'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Field } from '@/components/Field';
import { Alert } from '@/components/Alert';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const info = await api.forgotPassword(email);
      setOk(
        info.devCode
          ? `If the account exists, a reset code was sent. Dev OTP: ${info.devCode}`
          : 'If the account exists, a reset code has been sent to the email.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send reset code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="spread">
          <h1>Forgot Password</h1>
          <Link href="/" className="muted">
            Home
          </Link>
        </div>
        <p>We’ll email you a one-time code to reset your password.</p>
      </div>
      <div className="card">
        <Alert kind="error" message={error} />
        <Alert kind="success" message={ok} />
        <form onSubmit={submit}>
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <div className="row">
            <button type="submit" disabled={busy || !email}>
              {busy ? 'Sending...' : 'Send reset code'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                router.push(`/reset-password?email=${encodeURIComponent(email)}`)
              }
              disabled={!email}
            >
              I have a code
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Feature Platform',
  description: 'Multi-tenant feature management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <header className="app-header">
            <div className="app-header-inner">
              <Link href="/" className="brand">
                Feature<span>Platform</span>
              </Link>
              <span className="brand-sub">multi-tenant control</span>
            </div>
          </header>
          <main className="container">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}

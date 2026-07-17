import Link from 'next/link';

const areas = [
  {
    href: '/super-admin',
    badge: 'SA',
    title: 'Super Admin',
    blurb: 'Log in to create organizations and onboard their admins.',
  },
  {
    href: '/admin',
    badge: 'AD',
    title: 'Organization Admin',
    blurb: 'Log in to enable features and manage your organization’s users.',
  },
  {
    href: '/user',
    badge: 'EU',
    title: 'End User',
    blurb: 'Sign up with your work email, then check your available features.',
  },
];

export default function Home() {
  return (
    <>
      <div className="page-header home-intro">
        <h1>Feature Platform</h1>
        <p>Pick the area that matches your role.</p>
      </div>
      <nav className="home-links">
        {areas.map((area) => (
          <Link key={area.href} href={area.href} className="role-card">
            <span className="role-badge">{area.badge}</span>
            <span className="role-text">
              <strong>{area.title}</strong>
              <span>{area.blurb}</span>
            </span>
            <span className="role-arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        ))}
      </nav>
      <p className="muted" style={{ marginTop: 18 }}>
        Trouble signing in? <Link href="/forgot-password">Reset your password</Link>.
        New admins: <Link href="/admin/onboard">complete onboarding</Link>.
      </p>
    </>
  );
}

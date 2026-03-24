import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/profile', label: 'Profile' },
];

function WealthWiseLogo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="brand-logo-svg">
      <defs>
        <linearGradient id="wealthwiseLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2b78b8" />
          <stop offset="100%" stopColor="#0a3558" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#wealthwiseLogoGradient)" />
      <path d="M18 22L24 42L31 28L38 42L46 22" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="46" cy="22" r="3.5" fill="#d9b16a" />
    </svg>
  );
}

export default function AppShell({ title, subtitle, aside, children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleNavigate() {
    setMenuOpen(false);
  }

  function handleLogout() {
    setMenuOpen(false);
    logout();
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/dashboard" className="brand-link" onClick={handleNavigate}>
            <span className="brand-logo" aria-hidden="true">
              <WealthWiseLogo />
            </span>
            <span className="brand-text">
              <strong>WealthWise</strong>
              <small>Web App</small>
            </span>
          </Link>

          <button
            type="button"
            className={`menu-toggle ${menuOpen ? 'is-open' : ''}`}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span className="menu-toggle-box" aria-hidden="true">
              <span className="menu-line line-1" />
              <span className="menu-line line-2" />
              <span className="menu-line line-3" />
            </span>
          </button>

          <nav className={`header-collapse ${menuOpen ? 'is-open' : ''}`}>
            <div className="top-nav">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={handleNavigate}
                  className={({ isActive }) => isActive ? 'top-nav-link active' : 'top-nav-link'}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </nav>

          <div className="header-user desktop-only">
            <div className="user-badge">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
            <div className="user-copy">
              <strong>{user?.name}</strong>
              <span className="user-email" title={user?.email}>{user?.email}</span>
            </div>
            <button type="button" className="ghost-button" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="page-hero">
          <div>
            <p className="eyebrow">WealthWise</p>
            <h1>{title}</h1>
            <p className="hero-copy">{subtitle}</p>
          </div>
        </section>

        {aside && <section className="stat-grid">{aside}</section>}
        <section className="content-stack">{children}</section>
      </main>
    </div>
  );
}
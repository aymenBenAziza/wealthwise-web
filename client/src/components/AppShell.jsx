import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import http from '../api/http';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/budgets', label: 'Budgets' },
  { to: '/savings-goals', label: 'Savings' },
  { to: '/analytics', label: 'Analytics' },
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

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="header-icon-svg">
      <path d="M12 3a4 4 0 0 0-4 4v1.2c0 .9-.3 1.8-.86 2.5L5.7 12.6A2 2 0 0 0 7.3 16h9.4a2 2 0 0 0 1.6-3.4l-1.44-1.9A4.2 4.2 0 0 1 16 8.2V7a4 4 0 0 0-4-4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ProfileAvatar({ user }) {
  const avatarUrl = user?.profile?.avatarUrl;
  const initials = user?.name?.[0]?.toUpperCase() || 'U';

  if (avatarUrl) {
    return <img src={avatarUrl} alt="Profile" className="header-avatar-image" />;
  }

  return <span className="header-avatar-fallback">{initials}</span>;
}

export default function AppShell({ title, subtitle, aside, children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    http.get('/notifications')
      .then((response) => setUnreadCount(response.data.unreadCount || 0))
      .catch(() => {});
  }, []);

  function handleNavigate() {
    setMenuOpen(false);
    setProfileOpen(false);
  }

  function handleLogout() {
    setMenuOpen(false);
    setProfileOpen(false);
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
              <NavLink to="/notifications" onClick={handleNavigate} className={({ isActive }) => isActive ? 'top-nav-link active mobile-profile-link' : 'top-nav-link mobile-profile-link'}>
                Notifications
              </NavLink>

            </div>
          </nav>

          <div className="header-user">
            <Link to="/notifications" className="header-icon-link" aria-label="Open notifications" onClick={handleNavigate}>
              <BellIcon />
              {unreadCount > 0 && <span className="header-icon-badge">{unreadCount}</span>}
            </Link>
            <div className="profile-menu-wrap">
              <button
                type="button"
                className="header-avatar-link profile-toggle"
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((value) => !value)}
              >
                <ProfileAvatar user={user} />
              </button>
              {profileOpen && (
                <div className="profile-dropdown">
                  <Link to="/profile" className="profile-dropdown-link" onClick={handleNavigate}>Profile</Link>
                  <button type="button" className="profile-dropdown-link danger-link" onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
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


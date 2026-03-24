import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  const aside = (
    <>
      <article className="metric-card card soft-card accent-card">
        <span className="metric-label">Account</span>
        <strong className="metric-value">{user?.role}</strong>
        <p>Authenticated through the shared desktop and web database.</p>
      </article>
      <article className="metric-card card soft-card">
        <span className="metric-label">Next module</span>
        <strong className="metric-value">Budgets</strong>
        <p>Module 3 can now build on top of real transactions and categories.</p>
      </article>
    </>
  );

  return (
    <AppShell
      title="Dashboard"
      subtitle="Overview of the current web migration status and authenticated session."
      aside={aside}
    >
      <section className="dashboard-grid">
        <article className="card soft-card panel-grid">
          <div>
            <p className="section-kicker">Session</p>
            <h2>{user?.name}</h2>
            <p className="muted">{user?.email}</p>
          </div>
          <div className="detail-list">
            <div><span>Role</span><strong>{user?.role}</strong></div>
            <div><span>Language</span><strong>{user?.profile?.language || 'FR'}</strong></div>
            <div><span>Currency</span><strong>{user?.profile?.preferredCurrency || 'TND'}</strong></div>
          </div>
        </article>

        <article className="card soft-card panel-grid">
          <div>
            <p className="section-kicker">Migration progress</p>
            <h2>Modules 1 and 2</h2>
            <p className="muted">Authentication, profile, transactions, categories, and filtering are wired.</p>
          </div>
          <ul className="check-list">
            <li>JWT auth is active</li>
            <li>Shared MD5 login compatibility is active</li>
            <li>Transactions CRUD is active</li>
            <li>Custom categories are active</li>
          </ul>
        </article>
      </section>

      <section className="card soft-card action-strip">
        <div>
          <p className="section-kicker">Quick actions</p>
          <h2>Continue building</h2>
        </div>
        <div className="inline-actions wrap-end">
          <Link to="/transactions" className="button-link primary-link">Open transactions</Link>
          <Link to="/profile" className="button-link secondary-link">Open profile</Link>
        </div>
      </section>
    </AppShell>
  );
}
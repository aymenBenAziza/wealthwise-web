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
        <strong className="metric-value">Savings</strong>
        <p>Goals and contributions are now available in the web app.</p>
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
            <h2>Modules 1 to 4</h2>
            <p className="muted">Authentication, profile, transactions, budgets, and savings goals are wired.</p>
          </div>
          <ul className="check-list">
            <li>JWT auth is active</li>
            <li>Shared MD5 login compatibility is active</li>
            <li>Budget usage calculations are active</li>
            <li>Savings goal progress is active</li>
          </ul>
        </article>
      </section>

      <section className="card soft-card action-strip">
        <div>
          <p className="section-kicker">Quick actions</p>
          <h2>Continue building</h2>
        </div>
        <div className="inline-actions wrap-end">
          <Link to="/budgets" className="button-link secondary-link">Open budgets</Link>
          <Link to="/savings-goals" className="button-link primary-link">Open savings</Link>
        </div>
      </section>
    </AppShell>
  );
}
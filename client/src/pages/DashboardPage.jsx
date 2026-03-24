import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p>Module 1 web foundation is active.</p>
        </div>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/profile">Profile</Link>
          <button className="link-button" onClick={logout}>Logout</button>
        </nav>
      </header>

      <section className="grid two">
        <article className="card">
          <h2>Session</h2>
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.role}</p>
        </article>

        <article className="card">
          <h2>Module status</h2>
          <ul className="plain-list">
            <li>Authentication API connected</li>
            <li>JWT protected routes enabled</li>
            <li>User profile loaded from MySQL</li>
            <li>Profile update page available</li>
          </ul>
        </article>
      </section>
    </div>
  );
}

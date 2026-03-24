import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { user, updateProfile, refreshProfile, logout } = useAuth();
  const [form, setForm] = useState({ name: '', monthlyIncome: 0, preferredCurrency: 'TND', language: 'FR' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refreshProfile().catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        monthlyIncome: user.profile?.monthlyIncome ?? 0,
        preferredCurrency: user.profile?.preferredCurrency ?? 'TND',
        language: user.profile?.language ?? 'FR',
      });
    }
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      await updateProfile({
        name: form.name,
        monthlyIncome: Number(form.monthlyIncome),
        preferredCurrency: form.preferredCurrency,
        language: form.language,
      });
      setMessage('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Profile update failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <h1>Profile</h1>
          <p>Manage user information and preferences.</p>
        </div>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/profile">Profile</Link>
          <button className="link-button" onClick={logout}>Logout</button>
        </nav>
      </header>

      <form className="card profile-form" onSubmit={handleSubmit}>
        <h2>My profile</h2>
        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert error">{error}</div>}

        <label>
          <span>Full name</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>

        <label>
          <span>Monthly income</span>
          <input type="number" min="0" step="0.01" value={form.monthlyIncome} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} required />
        </label>

        <label>
          <span>Preferred currency</span>
          <select value={form.preferredCurrency} onChange={(e) => setForm({ ...form, preferredCurrency: e.target.value })}>
            <option value="TND">TND</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </label>

        <label>
          <span>Language</span>
          <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
            <option value="FR">Francais</option>
            <option value="EN">English</option>
            <option value="AR">Arabic</option>
          </select>
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}

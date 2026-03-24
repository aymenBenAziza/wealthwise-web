import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { user, updateProfile, refreshProfile } = useAuth();
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

  const aside = (
    <article className="metric-card card soft-card accent-card">
      <span className="metric-label">Profile state</span>
      <strong className="metric-value">Synced</strong>
      <p>User information and preferences are stored in the shared MySQL database.</p>
    </article>
  );

  return (
    <AppShell
      title="Profile"
      subtitle="Manage the shared account information and financial preferences used by the web client."
      aside={aside}
    >
      {(message || error) && (
        <div className={`alert ${error ? 'error' : 'success'}`}>
          {error || message}
        </div>
      )}

      <section className="profile-layout">
        <article className="card soft-card profile-summary">
          <div className="profile-badge">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <div>
            <h2>{user?.name}</h2>
            <p className="muted">{user?.email}</p>
          </div>
          <div className="detail-list compact-list">
            <div><span>Role</span><strong>{user?.role}</strong></div>
            <div><span>Language</span><strong>{user?.profile?.language || 'FR'}</strong></div>
            <div><span>Currency</span><strong>{user?.profile?.preferredCurrency || 'TND'}</strong></div>
          </div>
        </article>

        <form className="card soft-card form-panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Preferences</p>
              <h2>Update profile</h2>
            </div>
          </div>

          <div className="form-grid two-cols">
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
          </div>

          <div className="inline-actions wrap-end">
            <button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save profile'}</button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
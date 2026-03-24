import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell auth-surface">
      <section className="auth-showcase">
        <p className="eyebrow">WealthWise Web</p>
        <h1>Shared finance workspace for desktop and web.</h1>
        <p className="hero-copy">Module-by-module migration with the same MySQL schema, same authentication model, and responsive web UX.</p>
        <div className="showcase-pills">
          <span className="hero-pill">React</span>
          <span className="hero-pill">Express</span>
          <span className="hero-pill">MySQL</span>
        </div>
      </section>

      <form className="card auth-card soft-card" onSubmit={handleSubmit}>
        <div>
          <p className="section-kicker">Authentication</p>
          <h2>Sign in</h2>
        </div>
        {error && <div className="alert error">{error}</div>}
        <label>
          <span>Email</span>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label>
          <span>Password</span>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </label>
        <button type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Login'}</button>
        <p className="muted">No account yet? <Link to="/register">Create one</Link></p>
      </form>
    </div>
  );
}
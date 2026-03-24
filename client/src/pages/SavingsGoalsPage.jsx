import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import http from '../api/http';

const emptyGoal = {
  name: '',
  targetAmount: '',
  currentAmount: '',
  deadline: '',
};

export default function SavingsGoalsPage() {
  const [goals, setGoals] = useState([]);
  const [goalForm, setGoalForm] = useState(emptyGoal);
  const [editingId, setEditingId] = useState(null);
  const [contributionValues, setContributionValues] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGoals().finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => {
    const target = goals.reduce((sum, goal) => sum + Number(goal.targetAmount), 0);
    const current = goals.reduce((sum, goal) => sum + Number(goal.currentAmount), 0);
    const achieved = goals.filter((goal) => goal.isAchieved).length;
    return { target, current, achieved };
  }, [goals]);

  async function loadGoals() {
    const response = await http.get('/savings-goals');
    setGoals(response.data.goals);
  }

  function resetGoalForm() {
    setGoalForm(emptyGoal);
    setEditingId(null);
  }

  async function handleGoalSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        name: goalForm.name,
        targetAmount: Number(goalForm.targetAmount),
        currentAmount: goalForm.currentAmount === '' ? 0 : Number(goalForm.currentAmount),
        deadline: goalForm.deadline,
      };

      if (editingId) {
        await http.put(`/savings-goals/${editingId}`, payload);
        setMessage('Savings goal updated successfully');
      } else {
        await http.post('/savings-goals', payload);
        setMessage('Savings goal created successfully');
      }

      resetGoalForm();
      await loadGoals();
    } catch (err) {
      setError(err.response?.data?.message || 'Savings goal save failed');
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(goal) {
    setEditingId(goal.id);
    setGoalForm({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      currentAmount: String(goal.currentAmount),
      deadline: String(goal.deadline).slice(0, 10),
    });
    setMessage('');
    setError('');
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this savings goal?')) return;

    try {
      await http.delete(`/savings-goals/${id}`);
      if (editingId === id) resetGoalForm();
      setMessage('Savings goal deleted successfully');
      setError('');
      await loadGoals();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  }

  async function handleContribution(goalId) {
    const amount = contributionValues[goalId];
    if (!amount) return;

    try {
      await http.post(`/savings-goals/${goalId}/contributions`, { amount: Number(amount) });
      setContributionValues((current) => ({ ...current, [goalId]: '' }));
      setMessage('Contribution added successfully');
      setError('');
      await loadGoals();
    } catch (err) {
      setError(err.response?.data?.message || 'Contribution failed');
    }
  }

  const aside = (
    <>
      <article className="metric-card card soft-card accent-card">
        <span className="metric-label">Saved</span>
        <strong className="metric-value">{totals.current.toFixed(2)} TND</strong>
        <p>Total amount currently accumulated across all goals.</p>
      </article>
      <article className="metric-card card soft-card">
        <span className="metric-label">Achieved</span>
        <strong className="metric-value">{totals.achieved}</strong>
        <p>Goals that have already reached or exceeded the target amount.</p>
      </article>
    </>
  );

  return (
    <AppShell
      title="Savings Goals"
      subtitle="Create savings targets, track progress, and add contributions over time."
      aside={aside}
    >
      {(message || error) && (
        <div className={`alert ${error ? 'error' : 'success'}`}>
          {error || message}
        </div>
      )}

      <section className="workspace-grid savings-workspace">
        <form className="card soft-card form-panel" onSubmit={handleGoalSubmit}>
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Savings editor</p>
              <h2>{editingId ? 'Edit goal' : 'New goal'}</h2>
            </div>
            {editingId && <span className="status-pill">Editing</span>}
          </div>

          <div className="form-grid two-cols">
            <label className="span-2">
              <span>Goal name</span>
              <input value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} required />
            </label>

            <label>
              <span>Target amount</span>
              <input type="number" min="0.01" step="0.01" value={goalForm.targetAmount} onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })} required />
            </label>

            <label>
              <span>Current amount</span>
              <input type="number" min="0" step="0.01" value={goalForm.currentAmount} onChange={(e) => setGoalForm({ ...goalForm, currentAmount: e.target.value })} />
            </label>

            <label className="span-2">
              <span>Deadline</span>
              <input type="date" value={goalForm.deadline} onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })} required />
            </label>
          </div>

          <div className="inline-actions wrap-end">
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update goal' : 'Add goal'}</button>
            {editingId && <button type="button" className="secondary-button" onClick={resetGoalForm}>Cancel edit</button>}
          </div>
        </form>

        <article className="card soft-card form-panel compact-panel savings-summary-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Summary</p>
              <h2>Totals</h2>
            </div>
          </div>
          <div className="detail-list compact-list">
            <div><span>Target</span><strong>{totals.target.toFixed(2)} TND</strong></div>
            <div><span>Current</span><strong>{totals.current.toFixed(2)} TND</strong></div>
            <div><span>Achieved</span><strong>{totals.achieved}</strong></div>
          </div>
        </article>
      </section>

      <section className="card soft-card stack-gap savings-stack">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Goals</p>
            <h2>Savings list</h2>
          </div>
        </div>

        {loading ? (
          <p>Loading savings goals...</p>
        ) : goals.length === 0 ? (
          <p className="muted">No savings goals found.</p>
        ) : (
          <div className="savings-grid">
            {goals.map((goal) => (
              <article key={goal.id} className="savings-card">
                <div className="savings-card-head">
                  <div className="savings-card-title">
                    <span className={`goal-badge ${goal.isAchieved ? 'achieved' : ''}`}>{goal.isAchieved ? 'Achieved' : 'In progress'}</span>
                    <h3>{goal.name}</h3>
                    <p className="muted">Deadline: {String(goal.deadline).slice(0, 10)}</p>
                  </div>
                  <div className="inline-actions table-actions">
                    <button type="button" className="secondary-button" onClick={() => handleEdit(goal)}>Edit</button>
                    <button type="button" className="danger-button" onClick={() => handleDelete(goal.id)}>Delete</button>
                  </div>
                </div>

                <div className="savings-stats">
                  <div>
                    <span>Target</span>
                    <strong>{Number(goal.targetAmount).toFixed(2)} TND</strong>
                  </div>
                  <div>
                    <span>Saved</span>
                    <strong>{Number(goal.currentAmount).toFixed(2)} TND</strong>
                  </div>
                  <div>
                    <span>Remaining</span>
                    <strong>{Number(goal.remainingAmount).toFixed(2)} TND</strong>
                  </div>
                </div>

                <div className="savings-progress-meta">
                  <span>Progress</span>
                  <strong>{goal.progressPercent.toFixed(2)}%</strong>
                </div>
                <div className="budget-progress-track savings-progress-track">
                  <div
                    className={`budget-progress-fill ${goal.progressPercent >= 100 ? 'over' : goal.progressPercent >= 80 ? 'warning' : ''}`}
                    style={{ width: `${Math.min(goal.progressPercent, 100)}%` }}
                  />
                </div>

                <div className="goal-contribution-panel">
                  <p className="section-kicker">Add contribution</p>
                  <div className="goal-contribution-row">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Contribution amount"
                      value={contributionValues[goal.id] || ''}
                      onChange={(e) => setContributionValues((current) => ({ ...current, [goal.id]: e.target.value }))}
                    />
                    <button type="button" onClick={() => handleContribution(goal.id)}>Add</button>
                  </div>
                </div>

                {goal.contributions?.length > 0 && (
                  <div className="goal-history">
                    <p className="section-kicker">Recent contributions</p>
                    <div className="goal-history-list">
                      {goal.contributions.slice(0, 3).map((contribution) => (
                        <div key={contribution.id} className="goal-history-item">
                          <span>{Number(contribution.amount).toFixed(2)} TND</span>
                          <small>{String(contribution.contributedAt).slice(0, 10)}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
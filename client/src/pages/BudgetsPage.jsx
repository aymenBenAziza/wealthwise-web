import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import http from '../api/http';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

const emptyBudget = {
  categoryId: '',
  monthYear: currentMonth(),
  limitAmount: '',
};

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [monthYear, setMonthYear] = useState(currentMonth());
  const [form, setForm] = useState(emptyBudget);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([loadCategories(), loadBudgets(currentMonth())]).finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => {
    const limit = budgets.reduce((sum, budget) => sum + Number(budget.limitAmount), 0);
    const spent = budgets.reduce((sum, budget) => sum + Number(budget.spentAmount), 0);
    const remaining = Math.max(limit - spent, 0);
    return { limit, spent, remaining };
  }, [budgets]);

  async function loadCategories() {
    const response = await http.get('/categories');
    setCategories(response.data.categories.filter((category) => category.name !== 'Salary' && category.name !== 'Freelance'));
  }

  async function loadBudgets(nextMonthYear = monthYear) {
    const response = await http.get('/budgets', { params: { monthYear: nextMonthYear } });
    setBudgets(response.data.budgets);
  }

  function resetForm(nextMonth = monthYear) {
    setForm({ ...emptyBudget, monthYear: nextMonth });
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        categoryId: Number(form.categoryId),
        monthYear: form.monthYear,
        limitAmount: Number(form.limitAmount),
      };

      if (editingId) {
        await http.put(`/budgets/${editingId}`, payload);
        setMessage('Budget updated successfully');
      } else {
        await http.post('/budgets', payload);
        setMessage('Budget created successfully');
      }

      resetForm(form.monthYear);
      await loadBudgets(form.monthYear);
    } catch (err) {
      setError(err.response?.data?.message || 'Budget save failed');
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(budget) {
    setEditingId(budget.id);
    setForm({
      categoryId: String(budget.categoryId),
      monthYear: budget.monthYear,
      limitAmount: String(budget.limitAmount),
    });
    setMessage('');
    setError('');
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this budget?')) return;

    try {
      await http.delete(`/budgets/${id}`);
      if (editingId === id) resetForm(monthYear);
      setMessage('Budget deleted successfully');
      setError('');
      await loadBudgets(monthYear);
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  }

  async function handleMonthChange(nextMonth) {
    setMonthYear(nextMonth);
    setForm((current) => ({ ...current, monthYear: nextMonth }));
    setEditingId(null);
    await loadBudgets(nextMonth);
  }

  const aside = (
    <>
      <article className="metric-card card soft-card accent-card">
        <span className="metric-label">Budgeted</span>
        <strong className="metric-value">{totals.limit.toFixed(2)} TND</strong>
        <p>Total monthly limits configured for the selected month.</p>
      </article>
      <article className="metric-card card soft-card">
        <span className="metric-label">Spent</span>
        <strong className="metric-value">{totals.spent.toFixed(2)} TND</strong>
        <p>Expense transactions matched against the current month budgets.</p>
      </article>
    </>
  );

  return (
    <AppShell
      title="Budgets"
      subtitle="Define monthly spending limits by category and track how much has already been consumed."
      aside={aside}
    >
      {(message || error) && (
        <div className={`alert ${error ? 'error' : 'success'}`}>
          {error || message}
        </div>
      )}

      <section className="workspace-grid">
        <form className="card soft-card form-panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Budget editor</p>
              <h2>{editingId ? 'Edit budget' : 'New budget'}</h2>
            </div>
            {editingId && <span className="status-pill">Editing</span>}
          </div>

          <div className="form-grid two-cols">
            <label>
              <span>Category</span>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Month</span>
              <input type="month" value={form.monthYear} onChange={(e) => setForm({ ...form, monthYear: e.target.value })} required />
            </label>

            <label className="span-2">
              <span>Limit amount</span>
              <input type="number" min="0.01" step="0.01" value={form.limitAmount} onChange={(e) => setForm({ ...form, limitAmount: e.target.value })} required />
            </label>
          </div>

          <div className="inline-actions wrap-end">
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update budget' : 'Add budget'}</button>
            {editingId && <button type="button" className="secondary-button" onClick={() => resetForm(monthYear)}>Cancel edit</button>}
          </div>
        </form>

        <article className="card soft-card form-panel compact-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Overview</p>
              <h2>{monthYear}</h2>
            </div>
          </div>
          <div className="detail-list compact-list">
            <div><span>Total limit</span><strong>{totals.limit.toFixed(2)} TND</strong></div>
            <div><span>Total spent</span><strong>{totals.spent.toFixed(2)} TND</strong></div>
            <div><span>Remaining</span><strong>{totals.remaining.toFixed(2)} TND</strong></div>
          </div>
        </article>
      </section>

      <section className="card soft-card stack-gap">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Month filter</p>
            <h2>Budget list</h2>
          </div>
          <div className="filter-inline">
            <input type="month" value={monthYear} onChange={(e) => handleMonthChange(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <p>Loading budgets...</p>
        ) : budgets.length === 0 ? (
          <p className="muted">No budgets found for this month.</p>
        ) : (
          <div className="budget-list">
            {budgets.map((budget) => (
              <article key={budget.id} className="budget-card">
                <div className="budget-card-top">
                  <div>
                    <span className="category-chip" style={{ borderColor: budget.categoryColor || '#dbe4ec' }}>{budget.categoryName}</span>
                    <h3>{budget.monthYear}</h3>
                  </div>
                  <div className="inline-actions table-actions">
                    <button type="button" className="secondary-button" onClick={() => handleEdit(budget)}>Edit</button>
                    <button type="button" className="danger-button" onClick={() => handleDelete(budget.id)}>Delete</button>
                  </div>
                </div>

                <div className="budget-metrics">
                  <div><span>Limit</span><strong>{Number(budget.limitAmount).toFixed(2)} TND</strong></div>
                  <div><span>Spent</span><strong>{Number(budget.spentAmount).toFixed(2)} TND</strong></div>
                  <div><span>Remaining</span><strong>{Number(budget.remainingAmount).toFixed(2)} TND</strong></div>
                </div>

                <div className="budget-progress-track">
                  <div
                    className={`budget-progress-fill ${budget.usagePercent >= 100 ? 'over' : budget.usagePercent >= 80 ? 'warning' : ''}`}
                    style={{ width: `${Math.min(budget.usagePercent, 100)}%` }}
                  />
                </div>
                <p className="muted">Usage: {budget.usagePercent.toFixed(2)}%</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
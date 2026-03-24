import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import http from '../api/http';

const emptyTransaction = {
  categoryId: '',
  amount: '',
  type: 'EXPENSE',
  transactionDate: new Date().toISOString().slice(0, 10),
  note: '',
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyTransaction);
  const [filters, setFilters] = useState({ search: '', type: '', categoryId: '' });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: '', color: '#3498db' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([loadCategories(), loadTransactions()]).finally(() => setLoading(false));
  }, []);

  const categoryMap = useMemo(() => new Map(categories.map((category) => [String(category.id), category])), [categories]);
  const incomeTotal = useMemo(() => transactions.filter((item) => item.type === 'INCOME').reduce((sum, item) => sum + Number(item.amount), 0), [transactions]);
  const expenseTotal = useMemo(() => transactions.filter((item) => item.type === 'EXPENSE').reduce((sum, item) => sum + Number(item.amount), 0), [transactions]);

  async function loadCategories() {
    const response = await http.get('/categories');
    setCategories(response.data.categories);
  }

  async function loadTransactions(nextFilters = filters) {
    const params = {};
    if (nextFilters.search) params.search = nextFilters.search;
    if (nextFilters.type) params.type = nextFilters.type;
    if (nextFilters.categoryId) params.categoryId = nextFilters.categoryId;

    const response = await http.get('/transactions', { params });
    setTransactions(response.data.transactions);
  }

  function resetTransactionForm() {
    setForm({ ...emptyTransaction, transactionDate: new Date().toISOString().slice(0, 10) });
    setEditingId(null);
  }

  async function handleTransactionSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        ...form,
        categoryId: Number(form.categoryId),
        amount: Number(form.amount),
      };

      if (editingId) {
        await http.put(`/transactions/${editingId}`, payload);
        setMessage('Transaction updated successfully');
      } else {
        await http.post('/transactions', payload);
        setMessage('Transaction created successfully');
      }

      resetTransactionForm();
      await loadTransactions();
    } catch (err) {
      setError(err.response?.data?.message || 'Transaction save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this transaction?')) return;

    try {
      await http.delete(`/transactions/${id}`);
      if (editingId === id) resetTransactionForm();
      setMessage('Transaction deleted successfully');
      setError('');
      await loadTransactions();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  }

  function handleEdit(transaction) {
    setEditingId(transaction.id);
    setForm({
      categoryId: String(transaction.categoryId),
      amount: String(transaction.amount),
      type: transaction.type,
      transactionDate: String(transaction.transactionDate).slice(0, 10),
      note: transaction.note || '',
    });
    setMessage('');
    setError('');
  }

  async function handleCategorySubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await http.post('/categories', categoryForm);
      setCategoryForm({ name: '', icon: '', color: '#3498db' });
      await loadCategories();
      setMessage('Category created successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Category creation failed');
    }
  }

  async function applyFilters(event) {
    event.preventDefault();
    await loadTransactions(filters);
  }

  const aside = (
    <>
      <article className="metric-card card soft-card accent-card">
        <span className="metric-label">Income</span>
        <strong className="metric-value">{incomeTotal.toFixed(2)} TND</strong>
        <p>Based on the currently loaded transaction set.</p>
      </article>
      <article className="metric-card card soft-card">
        <span className="metric-label">Expense</span>
        <strong className="metric-value">{expenseTotal.toFixed(2)} TND</strong>
        <p>Filtered totals update with search and type selection.</p>
      </article>
    </>
  );

  return (
    <AppShell
      title="Transactions"
      subtitle="Manage income, expenses, custom categories, and search from a single responsive workspace."
      aside={aside}
    >
      {(message || error) && (
        <div className={`alert ${error ? 'error' : 'success'}`}>
          {error || message}
        </div>
      )}

      <section className="workspace-grid">
        <form className="card soft-card form-panel" onSubmit={handleTransactionSubmit}>
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Transaction editor</p>
              <h2>{editingId ? 'Edit transaction' : 'New transaction'}</h2>
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
              <span>Amount</span>
              <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </label>

            <label>
              <span>Type</span>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </label>

            <label>
              <span>Date</span>
              <input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} required />
            </label>

            <label className="span-2">
              <span>Note</span>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional note" />
            </label>
          </div>

          <div className="inline-actions wrap-end">
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update transaction' : 'Add transaction'}</button>
            {editingId && <button type="button" className="secondary-button" onClick={resetTransactionForm}>Cancel edit</button>}
          </div>
        </form>

        <form className="card soft-card form-panel compact-panel" onSubmit={handleCategorySubmit}>
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Categories</p>
              <h2>Custom category</h2>
            </div>
          </div>

          <label>
            <span>Name</span>
            <input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
          </label>
          <label>
            <span>Icon</span>
            <input value={categoryForm.icon} onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })} placeholder="fa-tag" />
          </label>
          <label>
            <span>Color</span>
            <input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })} />
          </label>
          <button type="submit">Add category</button>
        </form>
      </section>

      <section className="card soft-card stack-gap">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Search and filter</p>
            <h2>Transaction list</h2>
          </div>
        </div>

        <form className="filters-grid" onSubmit={applyFilters}>
          <input placeholder="Search note or category" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All types</option>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
          <select value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <button type="submit">Apply filters</button>
        </form>

        {loading ? (
          <p>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="muted">No transactions found.</p>
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{String(transaction.transactionDate).slice(0, 10)}</td>
                    <td>
                      <span className="category-chip" style={{ borderColor: categoryMap.get(String(transaction.categoryId))?.color || '#dbe4ec' }}>
                        {transaction.categoryName}
                      </span>
                    </td>
                    <td><span className="status-pill muted-status">{transaction.type}</span></td>
                    <td className={transaction.type === 'INCOME' ? 'amount-positive' : 'amount-negative'}>
                      {transaction.type === 'INCOME' ? '+' : '-'}{Number(transaction.amount).toFixed(2)}
                    </td>
                    <td>{transaction.note || '-'}</td>
                    <td>
                      <div className="inline-actions table-actions">
                        <button type="button" className="secondary-button" onClick={() => handleEdit(transaction)}>Edit</button>
                        <button type="button" className="danger-button" onClick={() => handleDelete(transaction.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
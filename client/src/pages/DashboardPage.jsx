import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import { useAuth } from '../contexts/AuthContext';
import http from '../api/http';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function money(value) {
  return `${Number(value || 0).toFixed(2)} TND`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [monthYear] = useState(currentMonth());
  const [report, setReport] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const [analyticsResponse, transactionsResponse, budgetsResponse, goalsResponse, notificationsResponse] = await Promise.all([
          http.get('/analytics/monthly-report', { params: { monthYear } }),
          http.get('/transactions'),
          http.get('/budgets', { params: { monthYear } }),
          http.get('/savings-goals'),
          http.get('/notifications'),
        ]);

        if (!active) return;

        setReport(analyticsResponse.data.report || null);
        setTransactions((transactionsResponse.data.transactions || []).slice(0, 5));
        setBudgets(budgetsResponse.data.budgets || []);
        setGoals(goalsResponse.data.goals || []);
        setUnreadCount(notificationsResponse.data.unreadCount || 0);
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Dashboard load failed');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [monthYear]);

  const summary = useMemo(() => {
    const totalIncome = Number(report?.headline?.totalIncome || 0);
    const totalExpense = Number(report?.headline?.totalExpense || 0);
    const balance = Number(report?.headline?.balance || 0);
    return { totalIncome, totalExpense, balance };
  }, [report]);

  const urgentBudgets = useMemo(() => budgets.filter((budget) => Number(budget.usagePercent) >= 80).slice(0, 3), [budgets]);
  const activeGoals = useMemo(() => goals.filter((goal) => !goal.isAchieved).slice(0, 3), [goals]);
  const trendMax = useMemo(() => {
    if (!report?.trend?.length) return 0;
    return Math.max(...report.trend.flatMap((item) => [Number(item.income), Number(item.expense)]), 0);
  }, [report]);

  const aside = (
    <>
      <article className="metric-card card soft-card accent-card dashboard-kpi-card">
        <span className="metric-label">Balance</span>
        <strong className="metric-value">{money(summary.balance)}</strong>
        <p>Current month net result for {monthYear}.</p>
      </article>
      <article className="metric-card card soft-card dashboard-kpi-card">
        <span className="metric-label">Income</span>
        <strong className="metric-value">{money(summary.totalIncome)}</strong>
        <p>Income captured in the current reporting month.</p>
      </article>
      <article className="metric-card card soft-card dashboard-kpi-card">
        <span className="metric-label">Expenses</span>
        <strong className="metric-value">{money(summary.totalExpense)}</strong>
        <p>Expense transactions posted in the same month.</p>
      </article>
      <article className="metric-card card soft-card dashboard-kpi-card">
        <span className="metric-label">Unread</span>
        <strong className="metric-value">{unreadCount}</strong>
        <p>Notifications still waiting for action.</p>
      </article>
    </>
  );

  return (
    <AppShell
      title="Dashboard"
      subtitle="Operational overview of this month, with the items that need action first."
      aside={aside}
    >
      {error && <div className="alert error">{error}</div>}

      <section className="dashboard-board">
        <section className="dashboard-main-grid">
          <article className="card soft-card stack-gap dashboard-panel dashboard-trend-panel">
            <div className="panel-heading dashboard-heading-tight">
              <div>
                <p className="section-kicker">Trend</p>
                <h2>Income vs expense</h2>
              </div>
              <span className="status-pill muted-status">Last 6 months</span>
            </div>
            {loading ? (
              <p>Loading dashboard...</p>
            ) : !report?.trend?.length ? (
              <p className="muted">Not enough history to render the trend yet.</p>
            ) : (
              <div className="trend-chart dashboard-trend-chart">
                {report.trend.map((item) => (
                  <div key={item.monthYear} className="trend-bar-group">
                    <div className="trend-bars">
                      <div className="trend-bar income" style={{ height: `${trendMax ? (Number(item.income) / trendMax) * 180 : 0}px` }} title={`Income: ${money(item.income)}`} />
                      <div className="trend-bar expense" style={{ height: `${trendMax ? (Number(item.expense) / trendMax) * 180 : 0}px` }} title={`Expense: ${money(item.expense)}`} />
                    </div>
                    <span className="trend-label">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="card soft-card stack-gap dashboard-panel dashboard-attention-panel">
            <div className="panel-heading dashboard-heading-tight">
              <div>
                <p className="section-kicker">Attention</p>
                <h2>Needs action</h2>
              </div>
            </div>
            <div className="dashboard-alert-list">
              {urgentBudgets.length > 0 ? urgentBudgets.map((budget) => (
                <article key={`budget-${budget.id}`} className="dashboard-alert-card">
                  <span className="status-pill muted-status">Budget</span>
                  <strong>{budget.categoryName}</strong>
                  <p>{Number(budget.usagePercent).toFixed(0)}% of {money(budget.limitAmount)} used.</p>
                </article>
              )) : null}

              {activeGoals.length > 0 ? activeGoals.map((goal) => (
                <article key={`goal-${goal.id}`} className="dashboard-alert-card">
                  <span className="status-pill muted-status">Goal</span>
                  <strong>{goal.name}</strong>
                  <p>{money(goal.currentAmount)} saved of {money(goal.targetAmount)}.</p>
                </article>
              )) : null}

              {urgentBudgets.length === 0 && activeGoals.length === 0 && (
                <p className="muted">No urgent budget or savings items right now.</p>
              )}
            </div>
          </article>
        </section>

        <section className="dashboard-secondary-grid">
          <article className="card soft-card stack-gap dashboard-panel">
            <div className="panel-heading dashboard-heading-tight">
              <div>
                <p className="section-kicker">Breakdown</p>
                <h2>Expense categories</h2>
              </div>
            </div>
            {loading ? (
              <p>Loading dashboard...</p>
            ) : !report?.categoryBreakdown?.length ? (
              <p className="muted">No expense categories available for this month.</p>
            ) : (
              <div className="breakdown-list">
                {report.categoryBreakdown.slice(0, 5).map((category) => {
                  const width = summary.totalExpense > 0 ? (Number(category.total) / summary.totalExpense) * 100 : 0;
                  return (
                    <div key={category.categoryId} className="breakdown-row">
                      <div className="breakdown-meta">
                        <span className="category-chip" style={{ borderColor: category.categoryColor || '#dbe4ec' }}>{category.categoryName}</span>
                        <strong>{money(category.total)}</strong>
                      </div>
                      <div className="breakdown-track">
                        <div className="breakdown-fill" style={{ width: `${width}%`, background: category.categoryColor || '#0f4c81' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="card soft-card stack-gap dashboard-panel">
            <div className="panel-heading dashboard-heading-tight">
              <div>
                <p className="section-kicker">Recent activity</p>
                <h2>Latest transactions</h2>
              </div>
              <Link to="/transactions" className="link-button">View all</Link>
            </div>
            {loading ? (
              <p>Loading dashboard...</p>
            ) : transactions.length === 0 ? (
              <p className="muted">No transactions recorded yet.</p>
            ) : (
              <div className="dashboard-activity-list">
                {transactions.map((transaction) => (
                  <article key={transaction.id} className="dashboard-activity-row">
                    <div>
                      <strong>{transaction.categoryName}</strong>
                      <p className="muted">{transaction.note || 'No note'} . {formatDate(transaction.transactionDate)}</p>
                    </div>
                    <strong className={transaction.type === 'INCOME' ? 'amount-positive' : 'amount-negative'}>
                      {transaction.type === 'INCOME' ? '+' : '-'}{money(transaction.amount)}
                    </strong>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="card soft-card action-strip dashboard-actions-strip">
          <div>
            <p className="section-kicker">Quick actions</p>
            <h2>Move directly to core workflows</h2>
          </div>
          <div className="inline-actions wrap-end dashboard-actions-row">
            <Link to="/transactions" className="button-link primary-link">Add transaction</Link>
            <Link to="/budgets" className="button-link secondary-link">Create budget</Link>
            <Link to="/savings-goals" className="button-link secondary-link">Create goal</Link>
            <Link to="/analytics" className="button-link secondary-link">Open analytics</Link>
          </div>
        </section>
      </section>
    </AppShell>
  );
}

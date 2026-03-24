import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import http from '../api/http';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function money(value) {
  return `${Number(value || 0).toFixed(2)} TND`;
}

function percent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export default function AnalyticsPage() {
  const [monthYear, setMonthYear] = useState(currentMonth());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [assistantInput, setAssistantInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'I can explain your month, coach your budgets, help with savings goals, and answer from your real data.' },
  ]);
  const [assistantSource, setAssistantSource] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [simulationForm, setSimulationForm] = useState({ categoryName: '', reductionPercent: '10', months: '3' });
  const [simulationResult, setSimulationResult] = useState('');
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchReport() {
      setLoading(true);
      setError('');
      setStatus('');

      try {
        const response = await http.get('/analytics/monthly-report', { params: { monthYear } });
        if (active) {
          const nextReport = response.data.report;
          setReport(nextReport);
          setMessages([
            { role: 'assistant', content: 'I can explain your month, coach your budgets, help with savings goals, and answer from your real data.' },
          ]);
          setAssistantSource(nextReport?.aiSource || '');
          setSimulationForm((current) => ({
            ...current,
            categoryName: nextReport?.simulationCategories?.includes(current.categoryName)
              ? current.categoryName
              : nextReport?.simulationCategories?.[0] || '',
          }));
          setSimulationResult('');
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Analytics load failed');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchReport();
    return () => {
      active = false;
    };
  }, [monthYear]);

  const aside = useMemo(() => {
    if (!report) {
      return (
        <>
          <article className="metric-card card soft-card accent-card">
            <span className="metric-label">Income</span>
            <strong className="metric-value">0.00 TND</strong>
            <p>Monthly report data will appear once analytics is loaded.</p>
          </article>
          <article className="metric-card card soft-card">
            <span className="metric-label">Expense</span>
            <strong className="metric-value">0.00 TND</strong>
            <p>Track spending pressure, balance, and category concentration.</p>
          </article>
        </>
      );
    }

    return (
      <>
        <article className="metric-card card soft-card accent-card">
          <span className="metric-label">Income</span>
          <strong className="metric-value">{money(report.headline.totalIncome)}</strong>
          <p>Income recorded for the selected month.</p>
        </article>
        <article className="metric-card card soft-card">
          <span className="metric-label">Expense</span>
          <strong className="metric-value">{money(report.headline.totalExpense)}</strong>
          <p>Expense outflow tracked across your current categories.</p>
        </article>
      </>
    );
  }, [report]);

  const trendMax = useMemo(() => {
    if (!report?.trend?.length) return 0;
    return Math.max(...report.trend.flatMap((item) => [Number(item.income), Number(item.expense)]), 0);
  }, [report]);

  function sendPrompt(prompt) {
    setAssistantInput(prompt);
    setTimeout(() => {
      const form = document.getElementById('analytics-chat-form');
      form?.requestSubmit();
    }, 0);
  }

  async function handleGenerateReport() {
    setReportLoading(true);
    setError('');
    setStatus('Generating analytics report...');

    try {
      const response = await http.post('/analytics/generate-report', { monthYear });
      const nextReport = response.data.report;
      setReport(nextReport);
      setAssistantSource(nextReport?.aiSource || '');
      setSimulationForm((current) => ({
        ...current,
        categoryName: nextReport?.simulationCategories?.includes(current.categoryName)
          ? current.categoryName
          : nextReport?.simulationCategories?.[0] || '',
      }));
      setStatus(response.data.message || 'Analytics report generated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Report generation failed');
      setStatus('');
    } finally {
      setReportLoading(false);
    }
  }

  function handlePrintReport() {
    window.print();
  }

  async function handleAssistantSubmit(event) {
    event.preventDefault();
    const trimmed = assistantInput.trim();
    if (!trimmed) return;

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setAssistantInput('');
    setAssistantLoading(true);
    setError('');
    setStatus('');

    try {
      const response = await http.post('/analytics/assistant', {
        history: nextMessages,
        monthYear,
      });
      setMessages((current) => [...current, { role: 'assistant', content: response.data.answer || 'No answer returned.' }]);
      setAssistantSource(response.data.source || 'local');
    } catch (err) {
      setError(err.response?.data?.message || 'Assistant request failed');
      setMessages((current) => [...current, { role: 'assistant', content: 'The assistant request failed. Try again.' }]);
    } finally {
      setAssistantLoading(false);
    }
  }

  async function handleSimulation(event) {
    event.preventDefault();
    setSimulationLoading(true);
    setError('');
    setStatus('');

    try {
      const response = await http.post('/analytics/simulate', {
        monthYear,
        categoryName: simulationForm.categoryName,
        reductionPercent: Number(simulationForm.reductionPercent),
        months: Number(simulationForm.months),
      });
      setSimulationResult(response.data.result || 'No simulation result returned.');
    } catch (err) {
      setError(err.response?.data?.message || 'Simulation failed');
    } finally {
      setSimulationLoading(false);
    }
  }

  return (
    <AppShell
      title="Analytics"
      subtitle="Monthly financial report with AI summary, coach notes, simulation, and a data-grounded assistant."
      aside={aside}
    >
      {error && <div className="alert error no-print">{error}</div>}
      {status && <div className="alert success no-print">{status}</div>}

      <section className="card soft-card stack-gap no-print analytics-toolbar-card">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Report actions</p>
            <h2>Generate and print</h2>
          </div>
          <div className="inline-actions">
            <button type="button" onClick={handleGenerateReport} disabled={reportLoading}>{reportLoading ? 'Generating...' : 'Generate report'}</button>
            <button type="button" className="secondary-button" onClick={handlePrintReport}>Print report</button>
          </div>
        </div>
      </section>

      <div className="print-report-shell">
        <section className="workspace-grid analytics-overview-grid">
          <article className="card soft-card form-panel compact-panel analytics-summary-card">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Report filter</p>
                <h2>Month selection</h2>
              </div>
            </div>
            <label className="no-print">
              <span>Month</span>
              <input type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
            </label>
            <div className="print-only print-month">Month: {monthYear}</div>
            {report && (
              <div className="detail-list compact-list">
                <div><span>Balance</span><strong>{money(report.headline.balance)}</strong></div>
                <div><span>Savings rate</span><strong>{percent(report.headline.savingsRate)}</strong></div>
                <div><span>Top category</span><strong>{report.topCategory?.categoryName || 'No expense data'}</strong></div>
              </div>
            )}
          </article>

          <article className="card soft-card form-panel analytics-highlight-card">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">AI executive summary</p>
                <h2>Monthly briefing</h2>
              </div>
              {report?.aiSource && <span className="status-pill muted-status">Source: {report.aiSource}</span>}
            </div>
            {loading ? (
              <p>Loading analytics...</p>
            ) : report?.aiSummary ? (
              <>
                <p className="analytics-ai-copy">{report.aiSummary}</p>
                {report?.aiError && <p className="muted">Fallback used because the Groq request failed.</p>}
              </>
            ) : (
              <p className="muted">No AI summary available for this month.</p>
            )}
          </article>
        </section>

        <section className="analytics-grid">
          <article className="card soft-card stack-gap analytics-chart-card">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Trend</p>
                <h2>Income vs expense</h2>
              </div>
            </div>
            {loading ? (
              <p>Loading analytics...</p>
            ) : !report?.trend?.length ? (
              <p className="muted">Not enough transaction history to render a trend yet.</p>
            ) : (
              <div className="trend-chart">
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

          <article className="card soft-card stack-gap analytics-chart-card">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Breakdown</p>
                <h2>Expense categories</h2>
              </div>
            </div>
            {loading ? (
              <p>Loading analytics...</p>
            ) : !report?.categoryBreakdown?.length ? (
              <p className="muted">No expense transactions found for this month.</p>
            ) : (
              <div className="breakdown-list">
                {report.categoryBreakdown.map((category) => {
                  const width = report.headline.totalExpense > 0 ? (Number(category.total) / Number(report.headline.totalExpense)) * 100 : 0;
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
        </section>

        <section className="analytics-grid analytics-secondary-grid">
          <article className="card soft-card stack-gap analytics-assistant-card no-print">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">AI assistant</p>
                <h2>Assistant</h2>
              </div>
              {assistantSource && <span className="status-pill muted-status">Source: {assistantSource}</span>}
            </div>
            <div className="analytics-quick-actions">
              <button type="button" className="secondary-button" onClick={() => sendPrompt('Explain my month in simple terms.')}>Explain My Month</button>
              <button type="button" className="secondary-button" onClick={() => sendPrompt('Which budget needs my attention most, and what should I do?')}>Budget Coach</button>
              <button type="button" className="secondary-button" onClick={() => sendPrompt('Help me make a savings plan based on my active goal.')}>Savings Plan</button>
              <button type="button" className="secondary-button" onClick={() => sendPrompt('What looks unusual or risky in my finances this month?')}>Spot Anomalies</button>
            </div>
            <div className="analytics-chat-thread">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`chat-bubble ${message.role === 'user' ? 'chat-user' : 'chat-assistant'}`}>
                  <span className="chat-role">{message.role === 'user' ? 'You' : 'Assistant'}</span>
                  <p>{message.content}</p>
                </div>
              ))}
              {assistantLoading && (
                <div className="chat-bubble chat-assistant">
                  <span className="chat-role">Assistant</span>
                  <p>Thinking...</p>
                </div>
              )}
            </div>
            <form id="analytics-chat-form" className="stack-gap" onSubmit={handleAssistantSubmit}>
              <label>
                <span>Message</span>
                <input
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  placeholder="Ask about your spending, budgets, goals, or trends"
                />
              </label>
              <div className="inline-actions">
                <button type="submit" disabled={assistantLoading}>{assistantLoading ? 'Sending...' : 'Send'}</button>
              </div>
            </form>
          </article>

          <div className="analytics-side-stack">
            <article className="card soft-card stack-gap analytics-simulation-card no-print">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">What-if simulator</p>
                  <h2>Simulation</h2>
                </div>
              </div>
              <p className="muted">Test how cutting one expense category could improve your savings.</p>
              <form className="stack-gap" onSubmit={handleSimulation}>
                <label>
                  <span>Category</span>
                  <select value={simulationForm.categoryName} onChange={(e) => setSimulationForm((current) => ({ ...current, categoryName: e.target.value }))}>
                    <option value="">Choose category</option>
                    {(report?.simulationCategories || []).map((categoryName) => (
                      <option key={categoryName} value={categoryName}>{categoryName}</option>
                    ))}
                  </select>
                </label>
                <div className="two-cols form-grid">
                  <label>
                    <span>Reduction %</span>
                    <input value={simulationForm.reductionPercent} onChange={(e) => setSimulationForm((current) => ({ ...current, reductionPercent: e.target.value }))} />
                  </label>
                  <label>
                    <span>Months</span>
                    <input value={simulationForm.months} onChange={(e) => setSimulationForm((current) => ({ ...current, months: e.target.value }))} />
                  </label>
                </div>
                <button type="submit" disabled={simulationLoading}>{simulationLoading ? 'Running...' : 'Run simulation'}</button>
              </form>
              {simulationResult && <div className="analytics-assistant-answer">{simulationResult}</div>}
            </article>

            <article className="card soft-card stack-gap">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Smart coach notes</p>
                  <h2>Coach notes</h2>
                </div>
              </div>
              {!report?.coachTips?.length ? (
                <p className="muted">No coach notes available yet.</p>
              ) : (
                <div className="analytics-list">
                  {report.coachTips.map((tip, index) => (
                    <article key={index} className="analytics-list-card analytics-tip-card">
                      <span className="status-pill muted-status">AI</span>
                      <p>{tip}</p>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>

        <section className="card soft-card stack-gap">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">AI insights</p>
              <h2>Generated report notes</h2>
            </div>
          </div>
          {loading ? (
            <p>Loading analytics...</p>
          ) : !report?.insights?.length ? (
            <p className="muted">No insights available yet.</p>
          ) : (
            <div className="analytics-insights-grid">
              {report.insights.map((insight, index) => (
                <article key={`${insight.type}-${index}`} className={`analytics-insight-card severity-${insight.severity}`}>
                  <div className="inline-actions analytics-insight-meta">
                    <span className="status-pill muted-status">{insight.type}</span>
                  </div>
                  <h3>{insight.title}</h3>
                  <p>{insight.message}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

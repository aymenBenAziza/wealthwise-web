const pool = require('../config/db');
const groqService = require('./groqService');

function toMonthYear(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function safeNumber(value) {
  return Number(value || 0);
}

function monthLabel(monthYear) {
  return monthYear;
}

async function getMonthlyReport(userId, monthYear = toMonthYear()) {
  const report = await buildMonthlyReport(userId, monthYear);
  const advisorContext = buildAdvisorContext(report);

  return {
    ...report,
    coachTips: buildCoachTips(advisorContext),
    simulationCategories: Object.keys(advisorContext.expenseBreakdown),
  };
}

async function generateReport(userId, monthYear = toMonthYear()) {
  const report = await getMonthlyReport(userId, monthYear);
  await persistReport(userId, report);
  await persistInsights(userId, report.insights);
  return report;
}

async function buildMonthlyReport(userId, monthYear) {
  const [totalsRows] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS totalIncome,
       COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS totalExpense
     FROM transaction
     WHERE user_id = ? AND DATE_FORMAT(transaction_date, '%Y-%m') = ?`,
    [userId, monthYear]
  );

  const [categoryRows] = await pool.execute(
    `SELECT
       c.id AS categoryId,
       c.name AS categoryName,
       c.color AS categoryColor,
       COALESCE(SUM(t.amount), 0) AS total
     FROM category c
     INNER JOIN transaction t ON t.category_id = c.id
     WHERE t.user_id = ?
       AND t.type = 'EXPENSE'
       AND DATE_FORMAT(t.transaction_date, '%Y-%m') = ?
     GROUP BY c.id, c.name, c.color
     ORDER BY total DESC`,
    [userId, monthYear]
  );

  const [trendRows] = await pool.execute(
    `SELECT
       DATE_FORMAT(transaction_date, '%Y-%m') AS monthYear,
       COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS expense
     FROM transaction
     WHERE user_id = ?
       AND transaction_date >= DATE_SUB(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'), INTERVAL 5 MONTH)
       AND transaction_date < DATE_ADD(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'), INTERVAL 1 MONTH)
     GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
     ORDER BY monthYear ASC`,
    [userId, monthYear, monthYear]
  );

  const [budgetRows] = await pool.execute(
    `SELECT
       b.id,
       c.name AS categoryName,
       c.color AS categoryColor,
       b.limit_amount AS limitAmount,
       COALESCE(SUM(CASE
         WHEN t.type = 'EXPENSE'
          AND DATE_FORMAT(t.transaction_date, '%Y-%m') = b.month_year
         THEN t.amount
         ELSE 0
       END), 0) AS spentAmount
     FROM budget b
     INNER JOIN category c ON c.id = b.category_id
     LEFT JOIN transaction t
       ON t.user_id = b.user_id
      AND t.category_id = b.category_id
     WHERE b.user_id = ? AND b.month_year = ?
     GROUP BY b.id, c.name, c.color, b.limit_amount
     ORDER BY spentAmount DESC`,
    [userId, monthYear]
  );

  const [goalRows] = await pool.execute(
    `SELECT
       id,
       name,
       target_amount AS targetAmount,
       current_amount AS currentAmount,
       deadline,
       is_achieved AS isAchieved
     FROM savings_goal
     WHERE user_id = ?
     ORDER BY is_achieved ASC, deadline ASC, id DESC
     LIMIT 5`,
    [userId]
  );

  const totalIncome = safeNumber(totalsRows[0]?.totalIncome);
  const totalExpense = safeNumber(totalsRows[0]?.totalExpense);
  const balance = totalIncome - totalExpense;
  const topCategory = categoryRows[0]
    ? {
        categoryId: categoryRows[0].categoryId,
        categoryName: categoryRows[0].categoryName,
        categoryColor: categoryRows[0].categoryColor,
        total: safeNumber(categoryRows[0].total),
      }
    : null;

  const budgetPressure = budgetRows.map((row) => {
    const limitAmount = safeNumber(row.limitAmount);
    const spentAmount = safeNumber(row.spentAmount);
    const usagePercent = limitAmount === 0 ? 0 : Number(((spentAmount / limitAmount) * 100).toFixed(2));
    return {
      id: row.id,
      categoryName: row.categoryName,
      categoryColor: row.categoryColor,
      limitAmount,
      spentAmount,
      usagePercent,
    };
  });

  const goalProgress = goalRows.map((row) => {
    const targetAmount = safeNumber(row.targetAmount);
    const currentAmount = safeNumber(row.currentAmount);
    return {
      id: row.id,
      name: row.name,
      targetAmount,
      currentAmount,
      deadline: row.deadline,
      isAchieved: Boolean(row.isAchieved),
      progressPercent: targetAmount === 0 ? 0 : Number(Math.min((currentAmount / targetAmount) * 100, 100).toFixed(2)),
    };
  });

  const report = {
    monthYear,
    headline: {
      totalIncome,
      totalExpense,
      balance,
      savingsRate: totalIncome === 0 ? 0 : Number((((totalIncome - totalExpense) / totalIncome) * 100).toFixed(2)),
    },
    topCategory,
    categoryBreakdown: categoryRows.map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryColor: row.categoryColor,
      total: safeNumber(row.total),
    })),
    trend: trendRows.map((row) => ({
      monthYear: row.monthYear,
      label: monthLabel(row.monthYear),
      income: safeNumber(row.income),
      expense: safeNumber(row.expense),
    })),
    budgetPressure,
    goalProgress,
    insights: buildInsights({ monthYear, totalIncome, totalExpense, balance, topCategory, budgetPressure, goalProgress }),
  };

  return enrichWithAi(report);
}

async function persistReport(userId, report) {
  const [existingRows] = await pool.execute(
    'SELECT id FROM report WHERE user_id = ? AND month_year = ? LIMIT 1',
    [userId, report.monthYear]
  );

  if (existingRows.length > 0) {
    await pool.execute(
      `UPDATE report
       SET total_income = ?, total_expense = ?, top_category_id = ?, generated_at = NOW()
       WHERE user_id = ? AND month_year = ?`,
      [
        report.headline.totalIncome,
        report.headline.totalExpense,
        report.topCategory?.categoryId || null,
        userId,
        report.monthYear,
      ]
    );
    return;
  }

  await pool.execute(
    `INSERT INTO report (user_id, month_year, total_income, total_expense, top_category_id)
     VALUES (?, ?, ?, ?, ?)`,
    [
      userId,
      report.monthYear,
      report.headline.totalIncome,
      report.headline.totalExpense,
      report.topCategory?.categoryId || null,
    ]
  );
}

async function persistInsights(userId, insights) {
  await pool.execute('DELETE FROM ai_insight WHERE user_id = ?', [userId]);

  for (const insight of insights) {
    await pool.execute(
      `INSERT INTO ai_insight (user_id, type, message, is_read, generated_at)
       VALUES (?, ?, ?, FALSE, NOW())`,
      [userId, normalizeInsightType(insight.type), insight.message]
    );
  }
}

function normalizeInsightType(type) {
  const allowed = new Set(['OVERSPENDING', 'SAVING_TIP', 'ANOMALY', 'BUDGET_ADVICE']);
  return allowed.has(type) ? type : 'BUDGET_ADVICE';
}

function buildAdvisorContext(report) {
  const expenseBreakdown = Object.fromEntries(
    (report.categoryBreakdown || []).map((item) => [item.categoryName, Number(item.total)])
  );

  const highestBudgetPressure = [...(report.budgetPressure || [])]
    .sort((a, b) => Number(b.usagePercent) - Number(a.usagePercent))[0] || null;

  const closestGoal = [...(report.goalProgress || [])]
    .filter((goal) => !goal.isAchieved)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0] || null;

  return {
    monthYear: report.monthYear,
    totalIncome: Number(report.headline.totalIncome || 0),
    totalExpense: Number(report.headline.totalExpense || 0),
    balance: Number(report.headline.balance || 0),
    topExpenseCategory: report.topCategory?.categoryName || 'N/A',
    expenseBreakdown,
    budgets: report.budgetPressure || [],
    goals: report.goalProgress || [],
    highestBudgetPressure,
    closestGoal,
  };
}

async function enrichWithAi(report) {
  const fallbackSummary = buildFallbackSummary(report);

  if (!groqService.hasGroqConfig()) {
    return {
      ...report,
      aiSummary: fallbackSummary,
      aiSource: 'local',
    };
  }

  try {
    const aiSummary = await groqService.createFinancialSummary(report);
    return {
      ...report,
      aiSummary: aiSummary || fallbackSummary,
      aiSource: aiSummary ? 'groq' : 'local',
    };
  } catch (error) {
    return {
      ...report,
      aiSummary: fallbackSummary,
      aiSource: 'local',
      aiError: error.message,
    };
  }
}

async function askAssistant(userId, monthYear, history) {
  const report = await buildMonthlyReport(userId, monthYear || toMonthYear());
  const context = buildAdvisorContext(report);
  const lastUserMessage = [...(Array.isArray(history) ? history : [])].reverse().find((item) => item?.role === 'user')?.content || '';
  const fallbackAnswer = buildFallbackAssistantAnswer(lastUserMessage, context);

  if (!groqService.hasGroqConfig()) {
    return { answer: fallbackAnswer, source: 'local', report };
  }

  try {
    const answer = await groqService.answerQuestion(lastUserMessage, buildFinancePrompt(context), history);
    return {
      answer: answer || fallbackAnswer,
      source: answer ? 'groq' : 'local',
      report,
    };
  } catch (error) {
    return {
      answer: fallbackAnswer,
      source: 'local',
      error: error.message,
      report,
    };
  }
}

async function runSimulation(userId, monthYear, categoryName, reductionPercent, months) {
  const report = await buildMonthlyReport(userId, monthYear || toMonthYear());
  const context = buildAdvisorContext(report);
  const currentSpend = context.expenseBreakdown[categoryName];

  if (!currentSpend) {
    return { result: 'No expense data was found for that category this month.' };
  }

  const monthlySavings = Number(((currentSpend * reductionPercent) / 100).toFixed(2));
  const totalSavings = Number((monthlySavings * months).toFixed(2));

  let result = `If you reduce ${categoryName} by ${reductionPercent}%, you could save about ${monthlySavings.toFixed(2)} TND per month.\n\n`;
  result += `Over ${months} month${months > 1 ? 's' : ''}, that is roughly ${totalSavings.toFixed(2)} TND.\n`;

  if (context.closestGoal) {
    const remaining = Math.max(Number(context.closestGoal.targetAmount) - Number(context.closestGoal.currentAmount), 0);
    const progress = Math.min(totalSavings, remaining);
    result += `Applied to your goal "${context.closestGoal.name}", this could cover ${progress.toFixed(2)} TND of the remaining amount.`;
  }

  return { result };
}

function buildCoachTips(context) {
  const tips = [];

  if (context.totalExpense > context.totalIncome) {
    tips.push(`You are spending more than you earn this month. Start by trimming ${context.topExpenseCategory}.`);
  } else {
    tips.push('Your cash flow is positive this month. Protect that surplus with a savings transfer.');
  }

  if (context.highestBudgetPressure) {
    tips.push(`Your budget for ${context.highestBudgetPressure.categoryName} is at ${Math.round(context.highestBudgetPressure.usagePercent)}% usage.`);
  }

  if (context.closestGoal) {
    const remaining = Math.max(Number(context.closestGoal.targetAmount) - Number(context.closestGoal.currentAmount), 0);
    tips.push(`Your closest goal is ${context.closestGoal.name}. You still need ${remaining.toFixed(2)} TND.`);
  }

  const anomalies = detectAnomalies(context);
  if (anomalies.length > 0) {
    tips.push(anomalies[0]);
  }

  return tips;
}

function buildFinancePrompt(context) {
  const lines = [
    `Current month: ${context.monthYear}`,
    `Income: ${context.totalIncome.toFixed(2)} TND`,
    `Expenses: ${context.totalExpense.toFixed(2)} TND`,
    `Net: ${context.balance.toFixed(2)} TND`,
    `Top expense category: ${context.topExpenseCategory}`,
    'Expense breakdown:',
  ];

  for (const [categoryName, total] of Object.entries(context.expenseBreakdown)) {
    lines.push(`- ${categoryName}: ${Number(total).toFixed(2)} TND`);
  }

  lines.push('Budgets:');
  for (const budget of context.budgets) {
    lines.push(`- ${budget.categoryName}: spent ${Number(budget.spentAmount).toFixed(2)} / ${Number(budget.limitAmount).toFixed(2)} TND (${Math.round(budget.usagePercent)}%)`);
  }

  lines.push('Savings goals:');
  for (const goal of context.goals) {
    lines.push(`- ${goal.name}: ${Number(goal.currentAmount).toFixed(2)} / ${Number(goal.targetAmount).toFixed(2)} TND, deadline ${String(goal.deadline).slice(0, 10)}`);
  }

  return lines.join('\n');
}

function buildFallbackAssistantAnswer(question, context) {
  const q = String(question || '').trim().toLowerCase();

  if (!q) {
    return 'Ask me about this month, your budgets, spending, savings goals, or unusual activity.';
  }

  if (['hi', 'hello', 'hey', 'salut', 'salam'].includes(q)) {
    return 'Hello. I can explain this month, review your budgets, and help with savings goals using your real data.';
  }

  if (q.includes('budget')) {
    if (!context.highestBudgetPressure) {
      return 'You do not have a current-month budget yet. Add a budget first and I can coach you against it.';
    }
    return `Your most pressured budget is ${context.highestBudgetPressure.categoryName} at ${Math.round(context.highestBudgetPressure.usagePercent)}% of its limit. Focus there first before tightening smaller categories.`;
  }

  if (q.includes('save') || q.includes('savings') || q.includes('goal')) {
    if (!context.closestGoal) {
      return 'You do not have an active savings goal right now. Create one and I can help you build a monthly plan.';
    }

    const remaining = Math.max(Number(context.closestGoal.targetAmount) - Number(context.closestGoal.currentAmount), 0);
    return `Your closest active goal is "${context.closestGoal.name}". You still need ${remaining.toFixed(2)} TND to complete it.`;
  }

  if (q.includes('anomaly') || q.includes('unusual') || q.includes('stand out')) {
    const anomalies = detectAnomalies(context);
    if (anomalies.length === 0) {
      return `Nothing extreme stands out in your current-month data. Your biggest expense driver is still ${context.topExpenseCategory}.`;
    }
    return anomalies.join('\n');
  }

  return `This month you earned ${context.totalIncome.toFixed(2)} TND and spent ${context.totalExpense.toFixed(2)} TND, for a net of ${context.balance.toFixed(2)} TND. Your largest expense category is ${context.topExpenseCategory}.`;
}

function detectAnomalies(context) {
  const anomalies = [];
  const entries = Object.entries(context.expenseBreakdown);

  if (entries.length === 0) {
    return anomalies;
  }

  const [categoryName, amount] = entries[0];
  if (Number(amount) > 500) {
    anomalies.push(`The ${categoryName} category is notably high this month at ${Number(amount).toFixed(2)} TND.`);
  }

  if (context.highestBudgetPressure && Number(context.highestBudgetPressure.usagePercent) >= 90) {
    anomalies.push(`Your budget for ${context.highestBudgetPressure.categoryName} is close to the limit at ${Math.round(context.highestBudgetPressure.usagePercent)}%.`);
  }

  return anomalies;
}

function buildFallbackSummary(report) {
  const net = Number(report.headline.balance || 0);
  const balanceLabel = net >= 0 ? 'positive' : 'negative';
  return `This month closed with ${balanceLabel} cash flow of ${net.toFixed(2)} TND. Your main expense pressure came from ${report.topCategory?.categoryName || 'N/A'}.`;
}

function buildInsights({ monthYear, totalIncome, totalExpense, balance, topCategory, budgetPressure, goalProgress }) {
  const insights = [];

  if (balance < 0) {
    insights.push({
      type: 'OVERSPENDING',
      title: 'Monthly balance is negative',
      message: `In ${monthYear}, expenses exceeded income by ${Math.abs(balance).toFixed(2)} TND.`,
      severity: 'high',
    });
  } else if (totalIncome > 0) {
    insights.push({
      type: 'SAVING_TIP',
      title: 'Positive monthly balance',
      message: `You kept ${balance.toFixed(2)} TND after expenses this month. Consider allocating part of it to savings goals.`,
      severity: 'medium',
    });
  }

  if (topCategory) {
    insights.push({
      type: 'BUDGET_ADVICE',
      title: 'Top spending category',
      message: `${topCategory.categoryName} is the highest expense category at ${topCategory.total.toFixed(2)} TND this month.`,
      severity: 'medium',
    });
  }

  budgetPressure
    .filter((budget) => budget.usagePercent >= 80)
    .slice(0, 2)
    .forEach((budget) => {
      insights.push({
        type: 'OVERSPENDING',
        title: 'Budget limit under pressure',
        message: `${budget.categoryName} has reached ${budget.usagePercent.toFixed(2)}% of its monthly budget.`,
        severity: budget.usagePercent >= 100 ? 'high' : 'medium',
      });
    });

  const nearGoal = goalProgress.find((goal) => !goal.isAchieved && goal.progressPercent >= 75);
  if (nearGoal) {
    insights.push({
      type: 'SAVING_TIP',
      title: 'Savings goal is close',
      message: `${nearGoal.name} is ${nearGoal.progressPercent.toFixed(2)}% complete. A final contribution could close it soon.`,
      severity: 'low',
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'ANOMALY',
      title: 'Not enough data yet',
      message: 'Add more transactions, budgets, or savings goals to unlock richer analytics.',
      severity: 'low',
    });
  }

  return insights;
}

module.exports = { getMonthlyReport, generateReport, askAssistant, runSimulation };

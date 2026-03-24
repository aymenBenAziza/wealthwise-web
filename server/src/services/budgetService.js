const { z } = require('zod');
const pool = require('../config/db');

const budgetSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  monthYear: z.string().regex(/^\d{4}-\d{2}$/),
  limitAmount: z.coerce.number().positive(),
});

async function ensureCategoryOwnership(userId, categoryId) {
  const [rows] = await pool.execute(
    `SELECT id
     FROM category
     WHERE id = ? AND (user_id IS NULL OR user_id = ?)`,
    [categoryId, userId]
  );

  if (rows.length === 0) {
    const error = new Error('Category not found');
    error.status = 404;
    throw error;
  }
}

function mapBudget(row) {
  const limitAmount = Number(row.limitAmount);
  const spentAmount = Number(row.spentAmount || 0);
  const remainingAmount = Math.max(limitAmount - spentAmount, 0);
  const usagePercent = limitAmount === 0 ? 0 : Math.min((spentAmount / limitAmount) * 100, 999.99);

  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categoryColor: row.categoryColor,
    monthYear: row.monthYear,
    limitAmount,
    spentAmount,
    remainingAmount,
    usagePercent: Number(usagePercent.toFixed(2)),
    createdAt: row.createdAt,
  };
}

async function listBudgets(userId, monthYear) {
  const params = [userId];
  let filterSql = '';

  if (monthYear) {
    filterSql = 'AND b.month_year = ?';
    params.push(monthYear);
  }

  const [rows] = await pool.execute(
    `SELECT
       b.id,
       b.user_id AS userId,
       b.category_id AS categoryId,
       b.month_year AS monthYear,
       b.limit_amount AS limitAmount,
       b.created_at AS createdAt,
       c.name AS categoryName,
       c.color AS categoryColor,
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
     WHERE b.user_id = ? ${filterSql}
     GROUP BY b.id, b.user_id, b.category_id, b.month_year, b.limit_amount, b.created_at, c.name, c.color
     ORDER BY b.month_year DESC, c.name ASC`,
    params
  );

  return rows.map(mapBudget);
}

async function createBudget(userId, input) {
  const data = budgetSchema.parse(input);
  await ensureCategoryOwnership(userId, data.categoryId);

  const [existing] = await pool.execute(
    `SELECT id
     FROM budget
     WHERE user_id = ? AND category_id = ? AND month_year = ?
     LIMIT 1`,
    [userId, data.categoryId, data.monthYear]
  );

  if (existing.length > 0) {
    const error = new Error('Budget already exists for this category and month');
    error.status = 409;
    throw error;
  }

  const [result] = await pool.execute(
    `INSERT INTO budget (user_id, category_id, month_year, limit_amount)
     VALUES (?, ?, ?, ?)`,
    [userId, data.categoryId, data.monthYear, data.limitAmount]
  );

  return getBudgetById(userId, result.insertId);
}

async function getBudgetById(userId, budgetId) {
  const [rows] = await pool.execute(
    `SELECT
       b.id,
       b.user_id AS userId,
       b.category_id AS categoryId,
       b.month_year AS monthYear,
       b.limit_amount AS limitAmount,
       b.created_at AS createdAt,
       c.name AS categoryName,
       c.color AS categoryColor,
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
     WHERE b.id = ? AND b.user_id = ?
     GROUP BY b.id, b.user_id, b.category_id, b.month_year, b.limit_amount, b.created_at, c.name, c.color
     LIMIT 1`,
    [budgetId, userId]
  );

  const row = rows[0];
  if (!row) {
    const error = new Error('Budget not found');
    error.status = 404;
    throw error;
  }

  return mapBudget(row);
}

async function updateBudget(userId, budgetId, input) {
  const data = budgetSchema.parse(input);
  const current = await getBudgetById(userId, budgetId);
  await ensureCategoryOwnership(userId, data.categoryId);

  const [existing] = await pool.execute(
    `SELECT id
     FROM budget
     WHERE user_id = ? AND category_id = ? AND month_year = ? AND id <> ?
     LIMIT 1`,
    [userId, data.categoryId, data.monthYear, budgetId]
  );

  if (existing.length > 0) {
    const error = new Error('Budget already exists for this category and month');
    error.status = 409;
    throw error;
  }

  await pool.execute(
    `UPDATE budget
     SET category_id = ?, month_year = ?, limit_amount = ?
     WHERE id = ? AND user_id = ?`,
    [data.categoryId, data.monthYear, data.limitAmount, budgetId, userId]
  );

  return getBudgetById(userId, current.id);
}

async function deleteBudget(userId, budgetId) {
  await getBudgetById(userId, budgetId);
  await pool.execute('DELETE FROM budget WHERE id = ? AND user_id = ?', [budgetId, userId]);
}

module.exports = {
  listBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
};
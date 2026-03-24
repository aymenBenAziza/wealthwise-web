const { z } = require('zod');
const pool = require('../config/db');
const notificationService = require('./notificationService');

const transactionSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  transactionDate: z.string().min(1),
  note: z.string().max(500).optional().nullable(),
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

async function listTransactions(userId, query) {
  const filters = ['t.user_id = ?'];
  const params = [userId];

  if (query.type) {
    filters.push('t.type = ?');
    params.push(query.type);
  }

  if (query.categoryId) {
    filters.push('t.category_id = ?');
    params.push(Number(query.categoryId));
  }

  if (query.search) {
    filters.push('(t.note LIKE ? OR c.name LIKE ?)');
    const term = `%${query.search}%`;
    params.push(term, term);
  }

  if (query.dateFrom) {
    filters.push('t.transaction_date >= ?');
    params.push(query.dateFrom);
  }

  if (query.dateTo) {
    filters.push('t.transaction_date <= ?');
    params.push(query.dateTo);
  }

  const [rows] = await pool.execute(
    `SELECT
       t.id,
       t.user_id AS userId,
       t.category_id AS categoryId,
       t.amount,
       t.type,
       t.transaction_date AS transactionDate,
       t.note,
       t.created_at AS createdAt,
       c.name AS categoryName,
       c.color AS categoryColor
     FROM transaction t
     INNER JOIN category c ON c.id = t.category_id
     WHERE ${filters.join(' AND ')}
     ORDER BY t.transaction_date DESC, t.id DESC`,
    params
  );

  return rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));
}

async function createTransaction(userId, input) {
  const data = transactionSchema.parse(input);
  await ensureCategoryOwnership(userId, data.categoryId);

  const [result] = await pool.execute(
    `INSERT INTO transaction (user_id, category_id, amount, type, transaction_date, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, data.categoryId, data.amount, data.type, data.transactionDate, data.note || null]
  );

  await notificationService.syncBudgetAlerts(userId, String(data.transactionDate).slice(0, 7));
  return getTransactionById(userId, result.insertId);
}

async function getTransactionById(userId, transactionId) {
  const [rows] = await pool.execute(
    `SELECT
       t.id,
       t.user_id AS userId,
       t.category_id AS categoryId,
       t.amount,
       t.type,
       t.transaction_date AS transactionDate,
       t.note,
       t.created_at AS createdAt,
       c.name AS categoryName,
       c.color AS categoryColor
     FROM transaction t
     INNER JOIN category c ON c.id = t.category_id
     WHERE t.id = ? AND t.user_id = ?
     LIMIT 1`,
    [transactionId, userId]
  );

  const row = rows[0];
  if (!row) {
    const error = new Error('Transaction not found');
    error.status = 404;
    throw error;
  }

  return {
    ...row,
    amount: Number(row.amount),
  };
}

async function updateTransaction(userId, transactionId, input) {
  const data = transactionSchema.parse(input);
  await getTransactionById(userId, transactionId);
  await ensureCategoryOwnership(userId, data.categoryId);

  await pool.execute(
    `UPDATE transaction
     SET category_id = ?, amount = ?, type = ?, transaction_date = ?, note = ?
     WHERE id = ? AND user_id = ?`,
    [data.categoryId, data.amount, data.type, data.transactionDate, data.note || null, transactionId, userId]
  );

  await notificationService.syncBudgetAlerts(userId, String(data.transactionDate).slice(0, 7));
  return getTransactionById(userId, transactionId);
}

async function deleteTransaction(userId, transactionId) {
  const transaction = await getTransactionById(userId, transactionId);
  await pool.execute('DELETE FROM transaction WHERE id = ? AND user_id = ?', [transactionId, userId]);
  await notificationService.syncBudgetAlerts(userId, String(transaction.transactionDate).slice(0, 7));
}

module.exports = {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};

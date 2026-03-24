const { z } = require('zod');
const pool = require('../config/db');

const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  icon: z.string().max(100).optional().nullable(),
  color: z.string().min(4).max(7).optional(),
});

async function listCategories(userId) {
  const [rows] = await pool.execute(
    `SELECT id, name, icon, color, is_custom AS isCustom, user_id AS userId
     FROM category
     WHERE user_id IS NULL OR user_id = ?
     ORDER BY is_custom ASC, name ASC`,
    [userId]
  );
  return rows;
}

async function createCategory(userId, input) {
  const data = createCategorySchema.parse(input);

  const [existingRows] = await pool.execute(
    `SELECT id
     FROM category
     WHERE LOWER(name) = LOWER(?) AND (user_id IS NULL OR user_id = ?)
     LIMIT 1`,
    [data.name, userId]
  );

  if (existingRows.length > 0) {
    const error = new Error('Category already exists');
    error.status = 409;
    throw error;
  }

  const [result] = await pool.execute(
    `INSERT INTO category (name, icon, color, is_custom, user_id)
     VALUES (?, ?, ?, ?, ?)`,
    [data.name, data.icon || null, data.color || '#3498db', true, userId]
  );

  const [rows] = await pool.execute(
    `SELECT id, name, icon, color, is_custom AS isCustom, user_id AS userId
     FROM category
     WHERE id = ?`,
    [result.insertId]
  );

  return rows[0];
}

module.exports = { listCategories, createCategory };
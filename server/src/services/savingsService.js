const { z } = require('zod');
const pool = require('../config/db');

const savingsGoalSchema = z.object({
  name: z.string().min(2).max(150),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().min(0).optional(),
  deadline: z.string().min(1),
});

const contributionSchema = z.object({
  amount: z.coerce.number().positive(),
  note: z.string().max(255).optional().nullable(),
});

function mapGoal(row, contributions = []) {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    targetAmount: Number(row.targetAmount),
    currentAmount: Number(row.currentAmount),
    deadline: row.deadline,
    isAchieved: Boolean(row.isAchieved),
    createdAt: row.createdAt,
    progressPercent: row.targetAmount == 0 ? 0 : Number(Math.min((Number(row.currentAmount) / Number(row.targetAmount)) * 100, 100).toFixed(2)),
    remainingAmount: Number(Math.max(Number(row.targetAmount) - Number(row.currentAmount), 0).toFixed(2)),
    contributions,
  };
}

async function listGoals(userId) {
  const [goalRows] = await pool.execute(
    `SELECT
       id,
       user_id AS userId,
       name,
       target_amount AS targetAmount,
       current_amount AS currentAmount,
       deadline,
       is_achieved AS isAchieved,
       created_at AS createdAt
     FROM savings_goal
     WHERE user_id = ?
     ORDER BY is_achieved ASC, deadline ASC, id DESC`,
    [userId]
  );

  const [contributionRows] = await pool.execute(
    `SELECT
       id,
       goal_id AS goalId,
       amount,
       note,
       contributed_at AS contributedAt
     FROM goal_contribution
     WHERE goal_id IN (SELECT id FROM savings_goal WHERE user_id = ?)
     ORDER BY contributed_at DESC, id DESC`,
    [userId]
  );

  const contributionsByGoal = new Map();
  for (const contribution of contributionRows) {
    const mapped = {
      id: contribution.id,
      goalId: contribution.goalId,
      amount: Number(contribution.amount),
      note: contribution.note,
      contributedAt: contribution.contributedAt,
    };
    if (!contributionsByGoal.has(contribution.goalId)) {
      contributionsByGoal.set(contribution.goalId, []);
    }
    contributionsByGoal.get(contribution.goalId).push(mapped);
  }

  return goalRows.map((row) => mapGoal(row, contributionsByGoal.get(row.id) || []));
}

async function getGoalById(userId, goalId) {
  const [goalRows] = await pool.execute(
    `SELECT
       id,
       user_id AS userId,
       name,
       target_amount AS targetAmount,
       current_amount AS currentAmount,
       deadline,
       is_achieved AS isAchieved,
       created_at AS createdAt
     FROM savings_goal
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [goalId, userId]
  );

  const row = goalRows[0];
  if (!row) {
    const error = new Error('Savings goal not found');
    error.status = 404;
    throw error;
  }

  const [contributionRows] = await pool.execute(
    `SELECT
       id,
       goal_id AS goalId,
       amount,
       note,
       contributed_at AS contributedAt
     FROM goal_contribution
     WHERE goal_id = ?
     ORDER BY contributed_at DESC, id DESC`,
    [goalId]
  );

  const contributions = contributionRows.map((contribution) => ({
    id: contribution.id,
    goalId: contribution.goalId,
    amount: Number(contribution.amount),
    note: contribution.note,
    contributedAt: contribution.contributedAt,
  }));

  return mapGoal(row, contributions);
}

async function createGoal(userId, input) {
  const data = savingsGoalSchema.parse(input);
  const initialAmount = Number(data.currentAmount || 0);
  const achieved = initialAmount >= Number(data.targetAmount);

  const [result] = await pool.execute(
    `INSERT INTO savings_goal (user_id, name, target_amount, current_amount, deadline, is_achieved)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, data.name, data.targetAmount, initialAmount, data.deadline, achieved]
  );

  if (initialAmount > 0) {
    await pool.execute(
      `INSERT INTO goal_contribution (goal_id, amount, note)
       VALUES (?, ?, ?)`,
      [result.insertId, initialAmount, 'Initial amount']
    );
  }

  return getGoalById(userId, result.insertId);
}

async function updateGoal(userId, goalId, input) {
  const current = await getGoalById(userId, goalId);
  const data = savingsGoalSchema.parse(input);
  const nextCurrentAmount = Number(data.currentAmount ?? current.currentAmount);
  const achieved = nextCurrentAmount >= Number(data.targetAmount);

  await pool.execute(
    `UPDATE savings_goal
     SET name = ?, target_amount = ?, current_amount = ?, deadline = ?, is_achieved = ?
     WHERE id = ? AND user_id = ?`,
    [data.name, data.targetAmount, nextCurrentAmount, data.deadline, achieved, goalId, userId]
  );

  return getGoalById(userId, goalId);
}

async function deleteGoal(userId, goalId) {
  await getGoalById(userId, goalId);
  await pool.execute('DELETE FROM savings_goal WHERE id = ? AND user_id = ?', [goalId, userId]);
}

async function addContribution(userId, goalId, input) {
  const goal = await getGoalById(userId, goalId);
  const data = contributionSchema.parse(input);

  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const appliedAmount = Math.min(Number(data.amount), remaining);
  const newAmount = Number((goal.currentAmount + appliedAmount).toFixed(2));
  const achieved = newAmount >= goal.targetAmount;

  await pool.execute(
    `INSERT INTO goal_contribution (goal_id, amount, note)
     VALUES (?, ?, ?)`,
    [goalId, appliedAmount, data.note || null]
  );

  await pool.execute(
    `UPDATE savings_goal
     SET current_amount = ?, is_achieved = ?
     WHERE id = ? AND user_id = ?`,
    [newAmount, achieved, goalId, userId]
  );

  return getGoalById(userId, goalId);
}

module.exports = {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  addContribution,
};
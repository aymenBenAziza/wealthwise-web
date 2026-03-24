const budgetService = require('../services/budgetService');

async function listBudgets(req, res, next) {
  try {
    const budgets = await budgetService.listBudgets(req.user.userId, req.query.monthYear);
    res.json({ budgets });
  } catch (error) {
    next(error);
  }
}

async function createBudget(req, res, next) {
  try {
    const budget = await budgetService.createBudget(req.user.userId, req.body);
    res.status(201).json({ budget });
  } catch (error) {
    next(error);
  }
}

async function updateBudget(req, res, next) {
  try {
    const budget = await budgetService.updateBudget(req.user.userId, Number(req.params.id), req.body);
    res.json({ budget });
  } catch (error) {
    next(error);
  }
}

async function deleteBudget(req, res, next) {
  try {
    await budgetService.deleteBudget(req.user.userId, Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { listBudgets, createBudget, updateBudget, deleteBudget };
const savingsService = require('../services/savingsService');

async function listGoals(req, res, next) {
  try {
    const goals = await savingsService.listGoals(req.user.userId);
    res.json({ goals });
  } catch (error) {
    next(error);
  }
}

async function createGoal(req, res, next) {
  try {
    const goal = await savingsService.createGoal(req.user.userId, req.body);
    res.status(201).json({ goal });
  } catch (error) {
    next(error);
  }
}

async function updateGoal(req, res, next) {
  try {
    const goal = await savingsService.updateGoal(req.user.userId, Number(req.params.id), req.body);
    res.json({ goal });
  } catch (error) {
    next(error);
  }
}

async function deleteGoal(req, res, next) {
  try {
    await savingsService.deleteGoal(req.user.userId, Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function addContribution(req, res, next) {
  try {
    const goal = await savingsService.addContribution(req.user.userId, Number(req.params.id), req.body);
    res.json({ goal });
  } catch (error) {
    next(error);
  }
}

module.exports = { listGoals, createGoal, updateGoal, deleteGoal, addContribution };
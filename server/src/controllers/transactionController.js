const transactionService = require('../services/transactionService');

async function listTransactions(req, res, next) {
  try {
    const transactions = await transactionService.listTransactions(req.user.userId, req.query);
    res.json({ transactions });
  } catch (error) {
    next(error);
  }
}

async function createTransaction(req, res, next) {
  try {
    const transaction = await transactionService.createTransaction(req.user.userId, req.body);
    res.status(201).json({ transaction });
  } catch (error) {
    next(error);
  }
}

async function updateTransaction(req, res, next) {
  try {
    const transaction = await transactionService.updateTransaction(
      req.user.userId,
      Number(req.params.id),
      req.body
    );
    res.json({ transaction });
  } catch (error) {
    next(error);
  }
}

async function deleteTransaction(req, res, next) {
  try {
    await transactionService.deleteTransaction(req.user.userId, Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
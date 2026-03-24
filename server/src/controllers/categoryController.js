const categoryService = require('../services/categoryService');

async function listCategories(req, res, next) {
  try {
    const categories = await categoryService.listCategories(req.user.userId);
    res.json({ categories });
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await categoryService.createCategory(req.user.userId, req.body);
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
}

module.exports = { listCategories, createCategory };
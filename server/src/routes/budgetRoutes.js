const express = require('express');
const controller = require('../controllers/budgetController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, controller.listBudgets);
router.post('/', authenticate, controller.createBudget);
router.put('/:id', authenticate, controller.updateBudget);
router.delete('/:id', authenticate, controller.deleteBudget);

module.exports = router;
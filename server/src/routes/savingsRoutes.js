const express = require('express');
const controller = require('../controllers/savingsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, controller.listGoals);
router.post('/', authenticate, controller.createGoal);
router.put('/:id', authenticate, controller.updateGoal);
router.delete('/:id', authenticate, controller.deleteGoal);
router.post('/:id/contributions', authenticate, controller.addContribution);

module.exports = router;
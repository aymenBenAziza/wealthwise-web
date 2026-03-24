const express = require('express');
const controller = require('../controllers/transactionController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, controller.listTransactions);
router.post('/', authenticate, controller.createTransaction);
router.put('/:id', authenticate, controller.updateTransaction);
router.delete('/:id', authenticate, controller.deleteTransaction);

module.exports = router;
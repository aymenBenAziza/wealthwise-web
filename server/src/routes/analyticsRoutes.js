const express = require('express');
const controller = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/monthly-report', authenticate, controller.getMonthlyReport);
router.post('/generate-report', authenticate, controller.generateReport);
router.post('/assistant', authenticate, controller.askAssistant);
router.post('/simulate', authenticate, controller.runSimulation);

module.exports = router;

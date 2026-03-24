const express = require('express');
const controller = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authenticate, controller.getMe);
router.put('/me', authenticate, controller.updateMe);

module.exports = router;

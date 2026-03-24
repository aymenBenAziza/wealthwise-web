const express = require('express');
const controller = require('../controllers/categoryController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, controller.listCategories);
router.post('/', authenticate, controller.createCategory);

module.exports = router;
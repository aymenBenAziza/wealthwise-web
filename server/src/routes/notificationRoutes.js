const express = require('express');
const controller = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, controller.listNotifications);
router.patch('/read-all', authenticate, controller.markAllAsRead);
router.patch('/:id/read', authenticate, controller.markAsRead);
router.get('/announcements', authenticate, controller.listAnnouncements);
router.post('/announcements', authenticate, controller.createAnnouncement);

module.exports = router;

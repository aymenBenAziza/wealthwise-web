const notificationService = require('../services/notificationService');

async function listNotifications(req, res, next) {
  try {
    const notifications = await notificationService.listNotifications(req.user.userId);
    const unreadCount = await notificationService.getUnreadCount(req.user.userId);
    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    await notificationService.markAsRead(req.user.userId, Number(req.params.id));
    const unreadCount = await notificationService.getUnreadCount(req.user.userId);
    res.json({ unreadCount });
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await notificationService.markAllAsRead(req.user.userId);
    res.json({ unreadCount: 0 });
  } catch (error) {
    next(error);
  }
}

async function listAnnouncements(req, res, next) {
  try {
    const announcements = await notificationService.listAnnouncements();
    res.json({ announcements });
  } catch (error) {
    next(error);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { title, content } = req.body || {};
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const announcementId = await notificationService.createAnnouncement(req.user.userId, String(title).trim(), String(content).trim());
    res.status(201).json({ announcementId, message: 'Announcement sent successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead,
  listAnnouncements,
  createAnnouncement,
};

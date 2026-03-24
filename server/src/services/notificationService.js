const pool = require('../config/db');

async function listNotifications(userId) {
  const [rows] = await pool.execute(
    `SELECT
       n.id,
       n.user_id AS userId,
       n.announcement_id AS announcementId,
       n.message,
       n.is_read AS isRead,
       n.created_at AS createdAt,
       a.title AS announcementTitle
     FROM notification n
     LEFT JOIN announcement a ON a.id = n.announcement_id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC, n.id DESC`,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    announcementId: row.announcementId,
    announcementTitle: row.announcementTitle,
    message: row.message,
    isRead: Boolean(row.isRead),
    createdAt: row.createdAt,
  }));
}

async function getUnreadCount(userId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM notification WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );
  return Number(rows[0]?.total || 0);
}

async function markAsRead(userId, notificationId) {
  await pool.execute(
    'UPDATE notification SET is_read = TRUE WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
}

async function markAllAsRead(userId) {
  await pool.execute(
    'UPDATE notification SET is_read = TRUE WHERE user_id = ?',
    [userId]
  );
}

async function listAnnouncements() {
  const [rows] = await pool.execute(
    `SELECT a.id, a.admin_id AS adminId, a.title, a.content, a.sent_at AS sentAt, u.name AS adminName
     FROM announcement a
     INNER JOIN user u ON u.id = a.admin_id
     ORDER BY a.sent_at DESC, a.id DESC`
  );

  return rows.map((row) => ({
    id: row.id,
    adminId: row.adminId,
    adminName: row.adminName,
    title: row.title,
    content: row.content,
    sentAt: row.sentAt,
  }));
}

async function createAnnouncement(adminId, title, content) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [announcementResult] = await connection.execute(
      'INSERT INTO announcement (admin_id, title, content) VALUES (?, ?, ?)',
      [adminId, title, content]
    );

    const [users] = await connection.execute(
      'SELECT id FROM user WHERE is_active = TRUE AND id <> ?',
      [adminId]
    );

    for (const user of users) {
      await connection.execute(
        'INSERT INTO notification (user_id, announcement_id, message, is_read, created_at) VALUES (?, ?, ?, FALSE, NOW())',
        [user.id, announcementResult.insertId, `${title}: ${content}`]
      );
    }

    await connection.commit();
    return announcementResult.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createSystemNotification(userId, message) {
  await pool.execute(
    'INSERT INTO notification (user_id, announcement_id, message, is_read, created_at) VALUES (?, NULL, ?, FALSE, NOW())',
    [userId, message]
  );
}

async function ensureNotification(userId, message) {
  const [rows] = await pool.execute(
    `SELECT id
     FROM notification
     WHERE user_id = ? AND announcement_id IS NULL AND message = ?
     LIMIT 1`,
    [userId, message]
  );

  if (rows.length === 0) {
    await createSystemNotification(userId, message);
  }
}

async function syncBudgetAlerts(userId, monthYear) {
  const [rows] = await pool.execute(
    `SELECT
       c.name AS categoryName,
       b.limit_amount AS limitAmount,
       COALESCE(SUM(CASE
         WHEN t.type = 'EXPENSE'
          AND DATE_FORMAT(t.transaction_date, '%Y-%m') = b.month_year
         THEN t.amount
         ELSE 0
       END), 0) AS spentAmount
     FROM budget b
     INNER JOIN category c ON c.id = b.category_id
     LEFT JOIN transaction t
       ON t.user_id = b.user_id
      AND t.category_id = b.category_id
     WHERE b.user_id = ? AND b.month_year = ?
     GROUP BY c.name, b.limit_amount`,
    [userId, monthYear]
  );

  for (const row of rows) {
    const limitAmount = Number(row.limitAmount || 0);
    const spentAmount = Number(row.spentAmount || 0);
    if (limitAmount <= 0) continue;

    const usagePercent = (spentAmount / limitAmount) * 100;
    if (usagePercent >= 80) {
      const message = `${row.categoryName} budget has reached ${usagePercent.toFixed(2)}% of its monthly limit for ${monthYear}.`;
      await ensureNotification(userId, message);
    }
  }
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  listAnnouncements,
  createAnnouncement,
  createSystemNotification,
  syncBudgetAlerts,
};

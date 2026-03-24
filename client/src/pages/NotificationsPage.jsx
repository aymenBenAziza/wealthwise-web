import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import http from '../api/http';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  async function loadData() {
    setError('');
    const [notificationsResponse, announcementsResponse] = await Promise.all([
      http.get('/notifications'),
      http.get('/notifications/announcements'),
    ]);

    setNotifications(notificationsResponse.data.notifications || []);
    setUnreadCount(notificationsResponse.data.unreadCount || 0);
    setAnnouncements(announcementsResponse.data.announcements || []);
  }

  async function handleMarkRead(id) {
    try {
      const response = await http.patch(`/notifications/${id}/read`);
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark notification as read');
    }
  }

  async function handleMarkAllRead() {
    try {
      await http.patch('/notifications/read-all');
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark all notifications as read');
    }
  }

  async function handleSendAnnouncement(event) {
    event.preventDefault();
    setSending(true);
    setError('');
    setMessage('');

    try {
      const response = await http.post('/notifications/announcements', announcementForm);
      setAnnouncementForm({ title: '', content: '' });
      setMessage(response.data.message || 'Announcement sent successfully');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send announcement');
    } finally {
      setSending(false);
    }
  }

  const aside = (
    <>
      <article className="metric-card card soft-card accent-card">
        <span className="metric-label">Unread</span>
        <strong className="metric-value">{unreadCount}</strong>
        <p>Notifications that still need attention.</p>
      </article>
      <article className="metric-card card soft-card">
        <span className="metric-label">Announcements</span>
        <strong className="metric-value">{announcements.length}</strong>
        <p>System-wide updates currently available.</p>
      </article>
    </>
  );

  return (
    <AppShell
      title="Notifications"
      subtitle="Track system alerts, budget warnings, savings achievements, and admin announcements."
      aside={aside}
    >
      {(message || error) && (
        <div className={`alert ${error ? 'error' : 'success'}`}>
          {error || message}
        </div>
      )}

      <section className="analytics-grid analytics-secondary-grid">
        <article className="card soft-card stack-gap">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Inbox</p>
              <h2>Notifications</h2>
            </div>
            <div className="inline-actions">
              <button type="button" className="secondary-button" onClick={handleMarkAllRead}>Mark all as read</button>
            </div>
          </div>

          {loading ? (
            <p>Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="muted">No notifications yet.</p>
          ) : (
            <div className="analytics-list">
              {notifications.map((notification) => (
                <article key={notification.id} className={`analytics-list-card notification-card ${notification.isRead ? 'notification-read' : 'notification-unread'}`}>
                  <div className="panel-heading">
                    <div>
                      <strong>{notification.announcementTitle || 'System notification'}</strong>
                      <p className="muted">{new Date(notification.createdAt).toLocaleString()}</p>
                    </div>
                    {!notification.isRead && (
                      <button type="button" className="secondary-button" onClick={() => handleMarkRead(notification.id)}>Mark read</button>
                    )}
                  </div>
                  <p>{notification.message}</p>
                </article>
              ))}
            </div>
          )}
        </article>

        <div className="analytics-side-stack">
          <article className="card soft-card stack-gap">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Broadcasts</p>
                <h2>Announcements</h2>
              </div>
            </div>
            {announcements.length === 0 ? (
              <p className="muted">No announcements sent yet.</p>
            ) : (
              <div className="analytics-list">
                {announcements.map((announcement) => (
                  <article key={announcement.id} className="analytics-list-card">
                    <strong>{announcement.title}</strong>
                    <p className="muted">Sent by {announcement.adminName} on {new Date(announcement.sentAt).toLocaleString()}</p>
                    <p>{announcement.content}</p>
                  </article>
                ))}
              </div>
            )}
          </article>

          {user?.role === 'ADMIN' && (
            <form className="card soft-card stack-gap" onSubmit={handleSendAnnouncement}>
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Admin</p>
                  <h2>Send announcement</h2>
                </div>
              </div>
              <label>
                <span>Title</span>
                <input value={announcementForm.title} onChange={(e) => setAnnouncementForm((current) => ({ ...current, title: e.target.value }))} required />
              </label>
              <label>
                <span>Content</span>
                <textarea className="app-textarea" rows="5" value={announcementForm.content} onChange={(e) => setAnnouncementForm((current) => ({ ...current, content: e.target.value }))} required />
              </label>
              <button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send announcement'}</button>
            </form>
          )}
        </div>
      </section>
    </AppShell>
  );
}

import { useEffect, useState } from 'react';
import {
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from '../services/api';

function formatTime(value) {
    if (!value) return '';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const loadNotifications = async ({ silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
        }
        setError('');
        try {
            const res = await getNotifications();
            setNotifications(res.data?.notifications || []);
            setUnreadCount(res.data?.unreadCount || 0);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load notifications.');
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        loadNotifications();
        const interval = setInterval(() => loadNotifications({ silent: true }), 30000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkAllRead = async () => {
        setBusy(true);
        try {
            await markAllNotificationsRead();
            setNotifications((current) => current.map((item) => ({ ...item, read: true })));
            setUnreadCount(0);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update notifications.');
        } finally {
            setBusy(false);
        }
    };

    const handleNotificationClick = async (notification) => {
        if (notification.read) return;
        try {
            await markNotificationRead(notification.id);
            setNotifications((current) => current.map((item) => (
                item.id === notification.id ? { ...item, read: true } : item
            )));
            setUnreadCount((current) => Math.max(0, current - 1));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update notifications.');
        }
    };

    return (
        <div className="notification-center">
            <button
                type="button"
                className="notification-toggle"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                aria-label="Open notifications"
            >
                <span className="notification-icon">🔔</span>
                <span className="notification-label">Notifications</span>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>

            {open && (
                <div className="notification-panel">
                    <div className="notification-panel-header">
                        <div>
                            <h4>Notifications</h4>
                            <p>{unreadCount} unread</p>
                        </div>
                        <div className="notification-panel-actions">
                            <button type="button" className="notification-link-btn" onClick={() => loadNotifications()} disabled={loading || busy}>
                                Refresh
                            </button>
                            <button type="button" className="notification-link-btn" onClick={handleMarkAllRead} disabled={busy || unreadCount === 0}>
                                Mark all read
                            </button>
                        </div>
                    </div>

                    {error && <div className="notification-error">{error}</div>}
                    {loading ? (
                        <div className="notification-empty">Loading notifications...</div>
                    ) : notifications.length === 0 ? (
                        <div className="notification-empty">No notifications yet.</div>
                    ) : (
                        <div className="notification-list">
                            {notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    type="button"
                                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-item-top">
                                        <strong>{notification.title}</strong>
                                        {!notification.read && <span className="notification-dot" />}
                                    </div>
                                    <div className="notification-message">{notification.message}</div>
                                    <div className="notification-meta">
                                        <span>{notification.caseNumber ? `Case ${notification.caseNumber}` : 'Account update'}</span>
                                        <span>{formatTime(notification.createdAt)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

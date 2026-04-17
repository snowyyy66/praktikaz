import { useState, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { api, getUserId } from '../api';
import './NotificationsPage.css';

const TYPE_ICON = {
  sale: '🛒',
  message: '💬',
  system: '📢',
};

/**
 * Компонент NotificationsPage (Уведомления)
 * Показывает список системных уведомлений пользователя (аукционы, ставки, продажи, отзывы).
 */
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getNotifications(getUserId())
      .then(setNotifications)
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id) => {
    await api.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  };

  const handleMarkAll = async () => {
    await api.markAllNotificationsRead(getUserId());
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="notifications-page animate-fade-in">
      <div className="notif-header">
        <h2>Уведомления {unread > 0 && <span className="unread-badge">{unread}</span>}</h2>
        {unread > 0 && (
          <button className="btn-mark-all" onClick={handleMarkAll}>
            <CheckCheck size={16} /> Прочитать все
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-state">Загрузка...</div>
      ) : notifications.length === 0 ? (
        <div className="empty-notif">
          <Bell size={40} />
          <span>Уведомлений нет</span>
        </div>
      ) : (
        <div className="notif-list">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`notif-item${n.is_read ? '' : ' unread'}`}
              onClick={() => !n.is_read && handleMarkRead(n.id)}
            >
              <div className="notif-icon">{TYPE_ICON[n.type] || '🔔'}</div>
              <div className="notif-body">
                <div className="notif-text">{n.text}</div>
                <div className="notif-time">{new Date(n.created_at).toLocaleString('ru-RU')}</div>
              </div>
              {!n.is_read && <div className="unread-dot" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { Bell } from 'lucide-react';
import './MockPages.css';

export default function NotificationsPage() {
  return (
    <div className="mock-page animate-fade-in">
      <div className="mock-container">
        <Bell size={48} className="mock-icon" />
        <h2>Уведомления</h2>
        <p>Новых уведомлений нет</p>
        <p className="mock-sub">Здесь будут отображаться ответы техподдержки и статусы объявлений.</p>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MessageSquare, Bell, User } from 'lucide-react';
import { api, getUserId } from '../api';
import './Header.css';

export default function Header() {
  const [query, setQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const load = () => {
      api.getNotifications(getUserId())
        .then(data => setUnreadCount(data.filter(n => !n.is_read).length))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/?search=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/');
    }
  };

  return (
    <header className="page-header">
      <div className="header-left">
        <form className="search-bar" onSubmit={handleSearch}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Поиск по объявлениям..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="header-right">
        <button className="icon-btn" title="Сообщения" onClick={() => navigate('/messages')}>
          <MessageSquare size={20} />
        </button>
        <button className="icon-btn notif-btn" title="Уведомления" onClick={() => { navigate('/notifications'); setUnreadCount(0); }}>
          <Bell size={20} />
          {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
        </button>

        <button className="btn-create" onClick={() => navigate('/create')}>
          <Plus size={16} />
          <span>Разместить</span>
        </button>

        <button className="user-avatar" onClick={() => navigate('/profile')}>
          <User size={20} />
        </button>
      </div>
    </header>
  );
}

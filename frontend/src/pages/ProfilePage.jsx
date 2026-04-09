import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { User, Star, MapPin, Phone, Mail, Package, Eye, Heart, TrendingUp, ShoppingCart, Calendar, Edit3, Camera } from 'lucide-react';
import { api, getUserId } from '../api';
import './ProfilePage.css';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    Promise.all([
      api.getUser(getUserId()),
      api.getUserStats(getUserId()),
      api.getUserProducts(getUserId()),
    ])
      .then(([userData, statsData, productsData]) => {
        setUser(userData);
        setEditForm({ username: userData.username, city: userData.city, phone: userData.phone });
        setStats(statsData);
        setProducts(productsData);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    if (editForm.phone && !/^(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/.test(editForm.phone)) {
      alert('Неверный формат телефона. Пример: +7 (999) 123-45-67');
      return;
    }
    if (editForm.username.trim().length < 2) {
      alert('Имя пользователя слишком короткое');
      return;
    }
    try {
      await api.updateUser(getUserId(), editForm);
      setUser(prev => ({ ...prev, ...editForm }));
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении профиля');
    }
  };

  if (loading) return <div className="loading-state">Загрузка профиля...</div>;
  if (!user) return <div className="empty-state">Не удалось загрузить профиль</div>;

  return (
    <div className="profile-page animate-fade-in">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          {user.avatar ? (
            <img src={`http://localhost:3000${user.avatar}`} alt={user.username} className="avatar-img" />
          ) : (
            <User size={48} />
          )}
          <label className="avatar-upload-btn" title="Сменить фото">
            <Camera size={14} />
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const res = await api.uploadAvatar(getUserId(), file);
              if (res.avatar) setUser(prev => ({ ...prev, avatar: res.avatar }));
            }} />
          </label>
        </div>
        
        {isEditing ? (
          <div className="profile-info profile-edit-mode">
            <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="edit-input title-input" />
            <div className="edit-row">
              <input type="text" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="edit-input" placeholder="Город" />
              <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="edit-input" placeholder="Телефон" />
            </div>
            <div className="edit-actions">
              <button className="btn-save" onClick={handleSaveProfile}>Сохранить</button>
              <button className="btn-cancel" onClick={() => setIsEditing(false)}>Отмена</button>
            </div>
          </div>
        ) : (
          <div className="profile-info">
            <div className="profile-title-row">
              <h1>{user.username}</h1>
              <button className="btn-edit" onClick={() => setIsEditing(true)}>
                <Edit3 size={16} /> Редактировать
              </button>
            </div>          <div className="profile-meta">
            <span className="profile-rating">
              <Star size={16} fill="#facc15" color="#facc15" />
              {user?.rating ? user.rating.toFixed(1) : '0.0'}
            </span>
            <span><MapPin size={14} /> {user.city || 'Не указан'}</span>
            <span><Calendar size={14} /> На площадке с {user.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'недавно'}</span>
          </div>
          <div className="profile-contacts">
            <span><Phone size={14} /> {user.phone || 'Нет телефона'}</span>
            <span><Mail size={14} /> {user.email}</span>
          </div>
        </div>
        )}
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><Package size={22} /></div>
            <div className="stat-data">
              <span className="stat-value">{stats.activeProducts}</span>
              <span className="stat-label">Активных объявлений</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><TrendingUp size={22} /></div>
            <div className="stat-data">
              <span className="stat-value">{stats.sales.count}</span>
              <span className="stat-label">Успешных продаж</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><ShoppingCart size={22} /></div>
            <div className="stat-data">
              <span className="stat-value">{stats.sales.revenue.toLocaleString('ru-RU')} ₽</span>
              <span className="stat-label">Выручка</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><Eye size={22} /></div>
            <div className="stat-data">
              <span className="stat-value">{stats.totalViews.toLocaleString()}</span>
              <span className="stat-label">Просмотров</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><Heart size={22} /></div>
            <div className="stat-data">
              <span className="stat-value">{stats.totalLikes}</span>
              <span className="stat-label">Лайков</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon teal"><ShoppingCart size={22} /></div>
            <div className="stat-data">
              <span className="stat-value">{stats.purchases.count}</span>
              <span className="stat-label">Покупок совершено</span>
            </div>
          </div>
        </div>
      )}

      {/* My Products */}
      <div className="profile-section">
        <div className="section-header">
          <h2>Мои объявления</h2>
          <NavLink to="/my-products" className="see-all">Показать все →</NavLink>
        </div>
        {products.length === 0 ? (
          <p className="empty-text">У вас пока нет объявлений</p>
        ) : (
          <div className="mini-products-grid">
            {products.slice(0, 4).map(p => (
              <NavLink to={`/product/${p.id}`} key={p.id} className="mini-card">
                <div className="mini-card-img">
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.title} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'8px'}} loading="lazy" />
                    : <div className="image-placeholder">{p.category_name?.substring(0, 2).toUpperCase()}</div>
                  }
                </div>
                <div className="mini-card-info">
                  <span className="mini-title">{p.title}</span>
                  <span className="mini-price">{p.price.toLocaleString('ru-RU')} ₽</span>
                  <span className="mini-stats"><Eye size={12} /> {p.views} · <Heart size={12} /> {p.likes}</span>
                </div>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

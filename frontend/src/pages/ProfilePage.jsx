import { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { User, Star, MapPin, Phone, Mail, Package, Eye, Heart, TrendingUp, ShoppingCart, Calendar, Edit3, Camera } from 'lucide-react';
import { api, getUserId } from '../api';
import './ProfilePage.css';

function getSalesLevel(salesCount = 0) {
  if (salesCount >= 50) return 6;
  if (salesCount >= 20) return 5;
  if (salesCount >= 10) return 4;
  if (salesCount >= 5) return 3;
  if (salesCount >= 2) return 2;
  if (salesCount >= 1) return 1;
  return 0;
}

function getSalesBadge(salesCount = 0) {
  const level = getSalesLevel(salesCount);
  if (level >= 6) return { title: 'Император продаж', hint: `Продаж: ${salesCount}`, tone: 'gold' };
  if (level >= 5) return { title: 'Гуру сделок', hint: `Продаж: ${salesCount}`, tone: 'purple' };
  if (level >= 4) return { title: 'Мастер торга', hint: `Продаж: ${salesCount}`, tone: 'blue' };
  if (level >= 3) return { title: 'Уверенный продавец', hint: `Продаж: ${salesCount}`, tone: 'green' };
  if (level >= 2) return { title: 'Первый опыт', hint: `Продаж: ${salesCount}`, tone: 'teal' };
  if (level >= 1) return { title: 'Новичок в продажах', hint: `Продаж: ${salesCount}`, tone: 'gray' };
  return { title: 'Без сделок', hint: 'Сделай первую продажу', tone: 'gray' };
}

function getAdsLevel(totalAds = 0) {
  if (totalAds >= 120) return 6;
  if (totalAds >= 70) return 5;
  if (totalAds >= 40) return 4;
  if (totalAds >= 20) return 3;
  if (totalAds >= 10) return 2;
  if (totalAds >= 3) return 1;
  return 0;
}

function getCatalogBadge(totalAds = 0) {
  const level = getAdsLevel(totalAds);
  if (level >= 6) return { title: 'Король витрины', hint: `Объявлений: ${totalAds}`, tone: 'gold' };
  if (level >= 5) return { title: 'Магнат каталога', hint: `Объявлений: ${totalAds}`, tone: 'purple' };
  if (level >= 4) return { title: 'Коллекционер лотов', hint: `Объявлений: ${totalAds}`, tone: 'blue' };
  if (level >= 3) return { title: 'Активный продавец', hint: `Объявлений: ${totalAds}`, tone: 'green' };
  if (level >= 2) return { title: 'Разгон витрины', hint: `Объявлений: ${totalAds}`, tone: 'teal' };
  if (level >= 1) return { title: 'Первые лоты', hint: `Объявлений: ${totalAds}`, tone: 'gray' };
  return { title: 'Пустая витрина', hint: 'Добавь первое объявление', tone: 'gray' };
}

/**
 * Компонент ProfilePage (Личный кабинет настройки)
 * Раздел, где пользователь может отредактировать свои личные данные: сменить имя, телефон, город и обновить аватарку.
 */
export default function ProfilePage() {
  const params = useParams();
  const ownUserId = getUserId();
  const profileUserId = params.id || ownUserId;
  const isOwnProfile = String(profileUserId) === String(ownUserId);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const imgUrl = (src) => (src?.startsWith('/uploads/') ? `http://localhost:3000${src}` : src);

  useEffect(() => {
    Promise.all([
      api.getUser(profileUserId),
      api.getUserStats(profileUserId),
      api.getUserProducts(profileUserId),
    ])
      .then(([userData, statsData, productsData]) => {
        setUser(userData);
        setEditForm({ username: userData.username, city: userData.city, phone: userData.phone });
        setStats(statsData);
        setProducts(productsData);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [profileUserId]);

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
      await api.updateUser(profileUserId, editForm);
      setUser(prev => ({ ...prev, ...editForm }));
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении профиля');
    }
  };

  if (loading) return <div className="loading-state">Загрузка профиля...</div>;
  if (!user) return <div className="empty-state">Не удалось загрузить профиль</div>;
  const salesCount = stats?.sales?.count || 0;
  const totalAds = stats?.totalProducts || 0;
  const salesBadge = getSalesBadge(salesCount);
  const catalogBadge = getCatalogBadge(totalAds);

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
          {isOwnProfile && <label className="avatar-upload-btn" title="Сменить фото">
            <Camera size={14} />
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const res = await api.uploadAvatar(profileUserId, file);
              if (res.avatar) setUser(prev => ({ ...prev, avatar: res.avatar }));
            }} />
          </label>}
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
              <span className={`role-badge ${user.is_admin ? 'admin' : 'user'}`}>
                {user.is_admin ? 'Админ' : 'Юзер'}
              </span>
              {isOwnProfile && <button className="btn-edit" onClick={() => setIsEditing(true)}>
                <Edit3 size={16} /> Редактировать
              </button>}
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
          <div className="achievement-row">
            <div className={`achievement-chip ${salesBadge.tone}`}>
              <span className="achievement-title">За продажи: {salesBadge.title}</span>
              <span className="achievement-hint">{salesBadge.hint}</span>
            </div>
            <div className={`achievement-chip ${catalogBadge.tone}`}>
              <span className="achievement-title">За каталог: {catalogBadge.title}</span>
              <span className="achievement-hint">{catalogBadge.hint}</span>
            </div>
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
              <span className="stat-value">{Number(stats.totalViews || 0).toLocaleString('ru-RU')}</span>
              <span className="stat-label">Просмотров (всего)</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><Heart size={22} /></div>
            <div className="stat-data">
              <span className="stat-value">{Number(stats.totalLikes || 0).toLocaleString('ru-RU')}</span>
              <span className="stat-label">Лайков (всего)</span>
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
          <h2>{isOwnProfile ? 'Мои объявления' : `Объявления продавца ${user?.username || ''}`}</h2>
          {isOwnProfile && <NavLink to="/my-products" className="see-all">Показать все →</NavLink>}
        </div>
        {products.length === 0 ? (
          <p className="empty-text">У вас пока нет объявлений</p>
        ) : (
          <div className="mini-products-grid">
            {products.slice(0, 4).map(p => (
              <NavLink to={`/product/${p.id}`} key={p.id} className="mini-card">
                <div className="mini-card-img">
                  {p.images?.[0]
                    ? <img src={imgUrl(p.images[0])} alt={p.title} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'8px'}} loading="lazy" />
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

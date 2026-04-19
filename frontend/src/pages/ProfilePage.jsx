import { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { User, Star, MapPin, Phone, Mail, Package, Eye, Heart, TrendingUp, ShoppingCart, Calendar, Edit3, Camera } from 'lucide-react';
import { api, getUserId } from '../api';
import './ProfilePage.css';

/**
 * Компонент ProfilePage (Личный кабинет и публичный профиль)
 * Показывает статистику, достижения (бейджы с бэкенда), объявления и отзывы.
 */

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
  const [reviews, setReviews] = useState([]);
  const [reviewsLeft, setReviewsLeft] = useState([]);
  const [showReviewsLeft, setShowReviewsLeft] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const imgUrl = (src) => (src?.startsWith('/uploads/') ? `http://localhost:3000${src}` : src);

  useEffect(() => {
    Promise.all([
      api.getUser(profileUserId),
      api.getUserStats(profileUserId),
      api.getUserProducts(profileUserId),
      api.getUserReviewsList(profileUserId),
      api.getReviewsByReviewer(profileUserId),
    ])
      .then(([userData, statsData, productsData, reviewsData, reviewsLeftData]) => {
        setUser(userData);
        setEditForm({ username: userData.username, city: userData.city, phone: userData.phone });
        setStats(statsData);
        setProducts(productsData);
        setReviews(reviewsData);
        setReviewsLeft(reviewsLeftData);
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
  
  const badges = stats?.badges || [];

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
            <input type="file" accept=".jpg,.jpeg,.png,.gif" style={{ display: 'none' }} onChange={async (e) => {
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
            {badges.map((b, i) => (
              <div key={i} className={`achievement-chip ${b.tone}`}>
                <span className="achievement-title">{b.title}</span>
                <span className="achievement-hint">{b.hint}</span>
              </div>
            ))}
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

      {/* Reviews Section */}
      <div className="profile-section reviews-section">
        <div className="section-header reviews-tabs">
          <button className={`tab-btn ${!showReviewsLeft ? 'active' : ''}`} onClick={() => setShowReviewsLeft(false)}>
            Отзывы о {isOwnProfile ? 'мне' : 'пользователе'} ({reviews.length})
          </button>
          <button className={`tab-btn ${showReviewsLeft ? 'active' : ''}`} onClick={() => setShowReviewsLeft(true)}>
            {isOwnProfile ? 'Мои отзывы' : 'Оставленные отзывы'} ({reviewsLeft.length})
          </button>
        </div>
        {!showReviewsLeft ? (
          reviews.length === 0 ? (
            <p className="empty-text">Отзывов пока нет.</p>
          ) : (
            <div className="profile-reviews-list">
              {reviews.map(r => (
                <ReviewCard key={r.id} r={r} />
              ))}
            </div>
          )
        ) : (
          reviewsLeft.length === 0 ? (
            <p className="empty-text">Отзывов пока не оставлено.</p>
          ) : (
            <div className="profile-reviews-list">
              {reviewsLeft.map(r => (
                <ReviewCard key={r.id} r={r} isLeftByMe={true} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ReviewCard({ r, isLeftByMe = false }) {
  const images = r.images || [];
  const productImages = r.product_images || (r.product_image ? [r.product_image] : []);
  
  return (
    <div className="profile-review-card animate-slide-up">
      <div className="review-main-content">
        <div className="review-header">
          <span className="reviewer-name">{isLeftByMe ? `Вы (для ${r.target_user_name || 'продавца'})` : r.reviewer_name}</span>
          <span className="review-date">{new Date(r.created_at).toLocaleDateString('ru-RU')}</span>
          <div className="review-rating">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill={i < r.rating ? "#facc15" : "none"} color={i < r.rating ? "#facc15" : "#d1d5db"} />
            ))}
          </div>
        </div>
        <p className="review-text">{r.text}</p>
        
        {images.length > 0 && (
          <div className="review-media-grid">
            {images.map((img, idx) => (
              <div key={idx} className="review-media-item">
                 {img.match(/\.(mp4|mov)$/i) 
                   ? <video src={`http://localhost:3000${img}`} controls muted style={{maxHeight:'100px', borderRadius:'4px'}} />
                   : <img src={`http://localhost:3000${img}`} alt="" style={{maxHeight:'100px', borderRadius:'4px'}} />
                 }
              </div>
            ))}
          </div>
        )}
      </div>

      <NavLink to={`/product/${r.product_id}`} className="review-product-link">
        <div className="linked-product-mini">
          {productImages[0] ? (
             <img src={productImages[0].startsWith('/uploads/') ? `http://localhost:3000${productImages[0]}` : productImages[0]} alt="" />
          ) : (
             <div className="linked-placeholder">{r.product_category_id?.substring(0,2).toUpperCase() || 'P'}</div>
          )}
          <div className="linked-info">
            <span className="linked-title">{r.product_title}</span>
            <span className="linked-cat">{r.product_price?.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
      </NavLink>
    </div>
  );
}

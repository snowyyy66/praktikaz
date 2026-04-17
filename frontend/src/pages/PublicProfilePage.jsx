import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, MapPin, Calendar, Star, Package, ShoppingBag, Eye, Heart } from 'lucide-react';
import { api } from '../api';
import './PublicProfilePage.css';

const imgUrl = (src) => src?.startsWith('http') ? src : `http://localhost:3000${src}`;

function PublicProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        // Запрашиваем информацию профиля из API
        
        const [userRes, productsRes, reviewsRes] = await Promise.all([
          api.getUser(id).catch(() => null),
          api.getUserProducts(id).catch(() => []),
          api.getUserReviews(id).catch(() => [])
        ]);

        if (userRes) {
          setProfileUser(userRes);
        } else {
            setProfileUser(null);
        }

        if (productsRes && Array.isArray(productsRes)) {
            setProducts(productsRes);
        }

        if (reviewsRes && Array.isArray(reviewsRes)) {
            setReviews(reviewsRes);
        }

      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [id]);

  if (loading) {
    return <div className="loading">Загрузка профиля...</div>;
  }

  if (!profileUser) {
    return <div className="error-message">Пользователь не найден</div>;
  }

  return (
    <div className="public-profile-page">
      <div className="profile-header-card">
        <div className="profile-avatar-container">
          {profileUser.avatar ? (
            <img src={imgUrl(profileUser.avatar)} alt={profileUser.username} className="profile-avatar" />
          ) : (
            <div className="profile-avatar-fallback">
              <User size={64} />
            </div>
          )}
        </div>
        
        <div className="profile-info">
          <h1 className="profile-username">{profileUser.username}</h1>
          <div className="profile-meta">
            <span className="meta-item"><MapPin size={16} /> {profileUser.city || 'Не указан'}</span>
            <span className="meta-item"><Calendar size={16} /> На сайте с {new Date(profileUser.created_at).getFullYear()} года</span>
          </div>
          <div className="profile-rating">
            <Star size={20} fill="#facc15" color="#facc15" />
            <span className="rating-value">{profileUser.rating?.toFixed(1) || '5.0'}</span>
            <span className="reviews-count">({reviews.length} отзывов)</span>
          </div>
        </div>
      </div>

      <div className="profile-stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><ShoppingBag size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{profileUser.total_sales || 0}</div>
            <div className="stat-label">Успешных продаж</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Package size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{products.length}</div>
            <div className="stat-label">Активных объявлений</div>
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-products-section">
          <h2>Объявления пользователя</h2>
          {products.length === 0 ? (
            <p className="no-data">У пользователя нет активных объявлений</p>
          ) : (
            <div className="products-grid">
              {products.map(product => {
                 let images = [];
                 try { images = JSON.parse(product.images) || []; } catch(e){}
                 const mainImg = images.length > 0 ? imgUrl(images[0]) : null;

                 return (
                    <div className="product-card" key={product.id} onClick={() => navigate(`/product/${product.id}`)}>
                      <div className="product-image-container">
                        {mainImg ? (
                            <img src={mainImg} alt={product.title} />
                        ) : (
                            <div className="no-image"><Package size={32} /></div>
                        )}
                        <div className="product-likes">
                            <Heart size={14} /> {product.likes || 0}
                        </div>
                      </div>
                      <div className="product-info">
                        <h3>{product.title}</h3>
                        <p className="price">{product.price.toLocaleString('ru-RU')} ₽</p>
                        <p className="city-date">{product.city}</p>
                      </div>
                    </div>
                 );
              })}
            </div>
          )}
        </div>

        <div className="profile-reviews-section">
          <h2>Отзывы о продавце</h2>
          {reviews.length === 0 ? (
            <p className="no-data">Пока нет отзывов</p>
          ) : (
            <div className="reviews-list">
              {reviews.map(review => (
                <div key={review.id} className="review-card">
                  <div className="review-header">
                     <div className="reviewer-info">
                        <strong>{review.reviewer_name}</strong>
                        <div className="review-stars">
                           {[...Array(5)].map((_, i) => (
                             <Star key={i} size={14} fill={i < review.rating ? "#facc15" : "none"} color={i < review.rating ? "#facc15" : "#555"} />
                           ))}
                        </div>
                     </div>
                     <span className="review-date">{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="review-text">{review.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PublicProfilePage;

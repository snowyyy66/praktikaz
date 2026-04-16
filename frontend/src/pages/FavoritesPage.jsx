// Показывает избранные пользователем объявления.
import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Heart, Eye } from 'lucide-react';
import { api, getUserId } from '../api';
import './HomePage.css';

function cardImgUrl(src) {
  if (!src) return null;
  return src.startsWith('http') ? src : `http://localhost:3000${src}`;
}

export default function FavoritesPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const uid = getUserId();

  useEffect(() => {
    if (!uid) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getUserFavorites(uid)
      .then(data => setProducts(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [uid]);

  const removeFavorite = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uid) return;
    try {
      await api.toggleFavorite(uid, productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      alert(err.message || 'Не удалось убрать из избранного');
    }
  };

  if (!uid) {
    return (
      <div className="home-page animate-fade-in">
        <div className="page-toolbar">
          <h2 className="page-title">Избранное</h2>
        </div>
        <div className="empty-state">Войдите в аккаунт, чтобы видеть избранные объявления</div>
      </div>
    );
  }

  return (
    <div className="home-page animate-fade-in">
      <div className="page-toolbar">
        <h2 className="page-title">Избранное</h2>
        <span className="results-count">{products.length} товаров</span>
      </div>

      {loading ? (
        <div className="loading-state">Загрузка...</div>
      ) : products.length === 0 ? (
        <div className="empty-state">Нажмите на сердце на карточке объявления — оно появится здесь</div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
            <NavLink to={`/product/${product.id}`} key={product.id} className="product-card">
              <div className="card-image">
                {product.images?.[0]
                  ? <img src={cardImgUrl(product.images[0])} alt={product.title} className="card-img" loading="lazy" />
                  : <div className="image-placeholder">{product.category_name?.substring(0, 2).toUpperCase()}</div>
                }
                <div className="card-badges">
                  <div className="badge"><Eye size={11} /> {product.views}</div>
                </div>
                <button
                  type="button"
                  className="like-btn-card active-like"
                  title="Убрать из избранного"
                  onClick={(e) => removeFavorite(e, product.id)}
                >
                  <Heart size={16} fill="currentColor" />
                </button>
              </div>
              <div className="card-content">
                <h3 className="card-title">{product.title}</h3>
                <p className="card-category">{product.category_name}</p>
                <div className="card-footer">
                  <span className="card-price">{product.price.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}


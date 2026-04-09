import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Heart, Eye, Trash2 } from 'lucide-react';
import { api, getUserId } from '../api';
import './HomePage.css';

export default function FavoritesPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUserFavorites(getUserId())
      .then(data => setProducts(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const removeFavorite = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    await api.toggleFavorite(getUserId(), productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  return (
    <div className="home-page animate-fade-in">
      <div className="page-toolbar">
        <h2 className="page-title">Избранное</h2>
        <span className="results-count">{products.length} товаров</span>
      </div>

      {loading ? (
        <div className="loading-state">Загрузка...</div>
      ) : products.length === 0 ? (
        <div className="empty-state">В избранном пока ничего нет</div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
            <NavLink to={`/product/${product.id}`} key={product.id} className="product-card">
              <div className="card-image">
                {product.images?.[0]
                  ? <img src={product.images[0]} alt={product.title} className="card-img" loading="lazy" />
                  : <div className="image-placeholder">{product.category_name?.substring(0, 2).toUpperCase()}</div>
                }
                <div className="card-badges">
                  <div className="badge"><Eye size={11} /> {product.views}</div>
                </div>
                <button className="like-btn-card active-like" onClick={(e) => removeFavorite(e, product.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="card-content">
                <h3 className="card-title">{product.title}</h3>
                <p className="card-category">{product.category_name}</p>
                <div className="card-footer">
                  <span className="card-price">{product.price.toLocaleString('ru-RU')} ₽</span>
                  <div className="card-stats">
                    <Heart size={13} className="icon-heart" /> {product.likes}
                  </div>
                </div>
              </div>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

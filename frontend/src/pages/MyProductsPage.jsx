import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Eye, Heart, Package } from 'lucide-react';
import { api, getUserId } from '../api';
import './HomePage.css';

export default function MyProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUserProducts(getUserId())
      .then(data => setProducts(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home-page animate-fade-in">
      <div className="page-toolbar">
        <h2 className="page-title">Мои объявления</h2>
        <span className="results-count">{products.length} активных</span>
      </div>

      {loading ? (
        <div className="loading-state">Загрузка...</div>
      ) : products.length === 0 ? (
        <div className="empty-state">У вас пока нет объявлений</div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
            <NavLink to={`/product/${product.id}`} key={product.id} className="product-card">
              <div className="card-image">
                <div className="image-placeholder">{product.category_name?.substring(0,2).toUpperCase()}</div>
                <div className="card-badges">
                  <div className="badge"><Eye size={11} /> {product.views}</div>
                  <div className="badge condition-badge">{product.condition}</div>
                </div>
              </div>
              <div className="card-content">
                <h3 className="card-title">{product.title}</h3>
                <p className="card-category">{product.category_name}</p>
                <p className="card-city">{product.city}</p>
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

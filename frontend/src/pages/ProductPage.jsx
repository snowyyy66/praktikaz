import { useState, useEffect } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { ArrowLeft, User, MessageCircle, Heart, Eye, MapPin, Phone, Star } from 'lucide-react';
import { api } from '../api';
import './ProductPage.css';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneRevealed, setPhoneRevealed] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getProduct(id)
      .then(data => setProduct(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    try {
      const res = await api.likeProduct(product.id);
      setProduct(prev => ({ ...prev, likes: res.likes }));
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="loading-state">Загрузка...</div>;
  if (!product) return <div className="empty-state">Товар не найден</div>;

  const isTransport = product.category_id === 'transport';
  const isRent = product.category_id === 'rent';

  return (
    <div className="product-page animate-fade-in">
      <button className="btn-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Вернуться назад
      </button>

      <div className="product-layout">
        <div className="product-left">
          <div className="product-image-large">
            <div className="image-placeholder">ФОТО</div>
            <button className="like-btn-large" onClick={handleLike}>
              <Heart size={20} />
              <span>{product.likes}</span>
            </button>
          </div>

          <div className="product-meta-row">
            <span className="meta-item"><Eye size={14} /> {product.views} просмотров</span>
            <span className="meta-item"><MapPin size={14} /> {product.city}</span>
            <span className="meta-item condition-tag">{product.condition}</span>
          </div>

          <div className="product-info-box">
            <h1 className="product-title">{product.title}</h1>
            <div className="price-tag">{product.price.toLocaleString('ru-RU')} ₽</div>
            {product.description && <p className="product-desc">{product.description}</p>}

            {product.details && Object.keys(product.details).length > 0 && (
              <div className="specs-section">
                <h3>Характеристики</h3>
                <div className="specs-grid">
                  {Object.entries(product.details).map(([key, val]) => (
                    <div className="spec-row" key={key}>
                      <span className="spec-key">{key}</span>
                      <span className="spec-dots"></span>
                      <span className="spec-val">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="product-right">
          <div className="seller-card">
            <div className="seller-header">
              <div className="seller-avatar-lg">
                <User size={28} />
              </div>
              <div className="seller-details">
                <div className="seller-name">{product.seller_name}</div>
                <div className="seller-rating">
                  <Star size={14} fill="#facc15" color="#facc15" />
                  <span>{product.seller_rating?.toFixed(1)}</span>
                </div>
                <div className="seller-city">{product.seller_city}</div>
              </div>
            </div>

            <div className="seller-actions">
              <button className="btn-primary" onClick={() => navigate('/messages')}>
                <MessageCircle size={16} />
                Написать продавцу
              </button>
              <button className="btn-secondary" onClick={() => setPhoneRevealed(true)}>
                <Phone size={16} />
                {phoneRevealed ? product.seller_phone : '+7 (***) ***-**-**'}
              </button>
            </div>

            {product.seller_total_sales > 0 && (
              <div className="seller-stat">
                Продаж: <strong>{product.seller_total_sales}</strong>
              </div>
            )}
          </div>

          {(isTransport || isRent) && product.details && (
            <div className="stats-panel">
              <h3>{isRent ? 'Условия аренды' : 'Технические характеристики'}</h3>
              <div className="condition-grid">
                {Object.entries(product.details).map(([k, v]) => (
                  <div className="condition-card" key={k}>
                    <span className="c-label">{k}</span>
                    <span className="c-value">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isTransport && !isRent && (
            <div className="stats-panel">
              <h3>Динамика цены</h3>
              <div className="graph-placeholder">
                <svg viewBox="0 0 400 120" className="mock-graph">
                  <path d="M0,100 Q40,95 80,70 T160,80 T240,40 T320,55 T400,30" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M0,100 Q40,95 80,70 T160,80 T240,40 T320,55 T400,30 L400,120 L0,120 Z" fill="url(#grad)" />
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25"/>
                      <stop offset="100%" stopColor="var(--bg-content)" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

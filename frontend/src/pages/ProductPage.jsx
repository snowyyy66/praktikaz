import { useState, useEffect } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { ArrowLeft, User, MessageCircle, Heart, Eye, MapPin, Phone, Star, ShoppingBag, CheckCircle } from 'lucide-react';
import { api, getUserId } from '../api';
import './ProductPage.css';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [buying, setBuying] = useState(false);
  const [bought, setBought] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getProduct(id), api.getProductReviews(id)])
      .then(([data, revs]) => { setProduct(data); setReviews(revs); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await api.createReview({ reviewer_id: getUserId(), product_id: product.id, ...reviewForm });
      const revs = await api.getProductReviews(product.id);
      setReviews(revs);
      setReviewSubmitted(true);
    } catch (err) {
      alert(err.message || 'Ошибка при отправке отзыва');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBuy = async () => {
    if (!confirm(`Купить "${product.title}" за ${product.price.toLocaleString('ru-RU')} ₽?`)) return;
    setBuying(true);
    try {
      await api.createOrder(getUserId(), product.id);
      setBought(true);
      setProduct(prev => ({ ...prev, is_active: 0 }));
    } catch (err) {
      alert('Ошибка при оформлении покупки');
    } finally {
      setBuying(false);
    }
  };

  const handleLike = async () => {
    try {
      const res = await api.likeProduct(product.id);
      setProduct(prev => ({ ...prev, likes: res.likes }));
    } catch (err) { console.error(err); }
  };

  const imgUrl = (src) => src?.startsWith('http') ? src : `http://localhost:3000${src}`;

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
            {product.images && product.images.length > 0 ? (
              <img src={imgUrl(product.images[activeImg])} alt={product.title} className="product-main-img" />
            ) : (
              <div className="image-placeholder">ФОТО</div>
            )}
            <button className="like-btn-large" onClick={handleLike}>
              <Heart size={20} />
              <span>{product.likes}</span>
            </button>
          </div>
          {product.images && product.images.length > 1 && (
            <div className="product-image-thumbs">
              {product.images.map((img, i) => (
                <img
                  key={i}
                  src={imgUrl(img)}
                  alt=""
                  className={`product-thumb${activeImg === i ? ' active' : ''}`}
                  onClick={() => setActiveImg(i)}
                />
              ))}
            </div>
          )}

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
                {product.seller_avatar
                  ? <img src={imgUrl(product.seller_avatar)} alt={product.seller_name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} />
                  : <User size={28} />
                }
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
              {bought || product.is_active === 0 ? (
                <div className="btn-bought">
                  <CheckCircle size={16} />
                  {bought ? 'Куплено! Перейти в Сделки' : 'Товар уже продан'}
                </div>
              ) : String(product.seller_id) !== String(getUserId()) ? (
                <button className="btn-buy" onClick={handleBuy} disabled={buying}>
                  <ShoppingBag size={16} />
                  {buying ? 'Оформление...' : `Купить за ${product.price.toLocaleString('ru-RU')} ₽`}
                </button>
              ) : null}
              {String(product.seller_id) !== String(getUserId()) && (
                <button className="btn-primary" onClick={async () => {
                  await api.createConversation(getUserId(), product.seller_id, product.id);
                  navigate('/messages');
                }}>
                  <MessageCircle size={16} />
                  Написать продавцу
                </button>
              )}
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

      {/* Reviews section */}
      <div className="reviews-section">
        <h2 className="reviews-title">Отзывы {reviews.length > 0 && <span className="reviews-count">({reviews.length})</span>}</h2>

        {reviews.length === 0 ? (
          <p className="reviews-empty">Отзывов пока нет</p>
        ) : (
          <div className="reviews-list">
            {reviews.map(r => (
              <div key={r.id} className="review-card">
                <div className="review-header">
                  <span className="review-author">{r.reviewer_name}</span>
                  <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  <span className="review-date">{new Date(r.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
                {r.text && <p className="review-text">{r.text}</p>}
              </div>
            ))}
          </div>
        )}

        {!reviewSubmitted && bought && (
          <form className="review-form" onSubmit={handleReviewSubmit}>
            <h3>Оставить отзыв</h3>
            <div className="star-picker">
              {[1,2,3,4,5].map(n => (
                <button type="button" key={n}
                  className={`star-btn${reviewForm.rating >= n ? ' active' : ''}`}
                  onClick={() => setReviewForm({ ...reviewForm, rating: n })}>★</button>
              ))}
            </div>
            <textarea
              value={reviewForm.text}
              onChange={e => setReviewForm({ ...reviewForm, text: e.target.value })}
              placeholder="Напишите ваш отзыв (необязательно)..."
              rows={3}
              className="review-textarea"
            />
            <button type="submit" className="btn-submit-review" disabled={submittingReview}>
              {submittingReview ? 'Отправка...' : 'Отправить отзыв'}
            </button>
          </form>
        )}
        {reviewSubmitted && <p className="review-thanks">Спасибо за ваш отзыв!</p>}
      </div>
    </div>
  );
}

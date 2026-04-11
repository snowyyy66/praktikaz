import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, MessageCircle, Heart, Eye, MapPin, Phone, Star, ShoppingBag, CheckCircle, Gavel, Clock } from 'lucide-react';
import { api, getUserId } from '../api';
import './ProductPage.css';

function formatAuctionEnds(iso) {
  if (!iso) return '';
  const s = String(iso).includes('T') ? String(iso) : String(iso).replace(' ', 'T');
  return new Date(s).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

function msLeft(endsAt) {
  if (!endsAt) return 0;
  const s = String(endsAt).includes('T') ? String(endsAt) : String(endsAt).replace(' ', 'T');
  return Math.max(0, new Date(s).getTime() - Date.now());
}

function formatCountdown(ms) {
  if (ms <= 0) return '0:00:00';
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

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
  const [bidRows, setBidRows] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState('');
  const [, setTick] = useState(0);
  const [rentHours, setRentHours] = useState(1);

  const refreshProduct = useCallback(() => {
    return api.getProduct(id).then(data => { setProduct(data); return data; }).catch(err => console.error(err));
  }, [id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getProduct(id), api.getProductReviews(id)])
      .then(([data, revs]) => { setProduct(data); setReviews(revs); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!product || product.sale_type !== 'auction') { setBidRows([]); return; }
    api.getProductBids(id).then(setBidRows).catch(() => setBidRows([]));
  }, [id, product?.sale_type, product?.auction_bids_count, product?.auction_high_bid]);

  useEffect(() => {
    if (!product?.auction_live) return;
    const iv = setInterval(() => { refreshProduct(); api.getProductBids(id).then(setBidRows).catch(() => {}); }, 4000);
    return () => clearInterval(iv);
  }, [product?.auction_live, id, refreshProduct]);

  useEffect(() => {
    if (!product?.auction_live) return;
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, [product?.auction_live]);

  useEffect(() => {
    if (product?.sale_type === 'auction' && product.auction_min_next_bid != null) {
      setBidAmount(String(product.auction_min_next_bid));
    } else {
      setBidAmount('');
    }
  }, [product?.id, product?.sale_type, product?.auction_min_next_bid]);

  useEffect(() => {
    if (!product || product.category_id !== 'rent') return;
    const d = product.details || {};
    const minH = Math.max(1, parseInt(d.min_hours, 10) || 1);
    setRentHours(minH);
  }, [product?.id, product?.category_id, product?.details]);

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
    const isAuctionProd = product.sale_type === 'auction';
    const isRentProd = product.category_id === 'rent';
    const d = product.details || {};
    const minH = Math.max(1, parseInt(d.min_hours, 10) || 1);
    const maxH = Math.max(minH, parseInt(d.max_hours, 10) || 168);

    let pay = product.price;
    if (isAuctionProd && product.auction_high_bid) pay = product.auction_high_bid;
    if (isRentProd) {
      pay = product.price * rentHours;
      if (rentHours < minH || rentHours > maxH) {
        alert(`Выберите срок от ${minH} до ${maxH} часов`);
        return;
      }
      if (!confirm(`Аренда «${product.title}» на ${rentHours} ч.\nИтого: ${pay.toLocaleString('ru-RU')} ₽?`)) return;
    } else if (!confirm(`Купить "${product.title}" за ${pay.toLocaleString('ru-RU')} ₽?`)) {
      return;
    }

    setBuying(true);
    try {
      await api.createOrder(getUserId(), product.id, isRentProd ? { rent_hours: rentHours } : {});
      setBought(true);
      if (!isRentProd) setProduct(prev => ({ ...prev, is_active: 0 }));
    } catch (err) {
      alert(err.message || 'Ошибка при оформлении покупки');
    } finally {
      setBuying(false);
    }
  };

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    setBidError('');
    const uid = getUserId();
    const amt = parseInt(bidAmount, 10);
    if (!uid) { setBidError('Войдите в аккаунт'); return; }
    if (!amt || amt < 1) { setBidError('Введите сумму ставки'); return; }
    setBidLoading(true);
    try {
      const res = await api.placeBid(product.id, parseInt(uid, 10), amt);
      setBidAmount(String(res.auction_min_next_bid || ''));
      await refreshProduct();
      const rows = await api.getProductBids(product.id);
      setBidRows(rows);
    } catch (err) {
      setBidError(err.message || 'Не удалось сделать ставку');
    } finally {
      setBidLoading(false);
    }
  };

  const handleFavorite = async () => {
    const uid = getUserId();
    if (!uid) {
      alert('Войдите в аккаунт, чтобы добавить в избранное');
      return;
    }
    try {
      const res = await api.toggleFavorite(uid, product.id);
      setProduct(prev => ({ ...prev, is_favorite: res.favorited }));
    } catch (err) {
      alert(err.message || 'Не удалось обновить избранное');
    }
  };

  const imgUrl = (src) => src?.startsWith('http') ? src : `http://localhost:3000${src}`;

  if (loading) return <div className="loading-state">Загрузка...</div>;
  if (!product) return <div className="empty-state">Товар не найден</div>;

  const isTransport = product.category_id === 'transport';
  const isRent = product.category_id === 'rent';
  const isRealEstate = product.category_id === 'realestate';
  const isClothing = product.category_id === 'clothing';
  const isItems = product.category_id === 'items';
  const isServices = product.category_id === 'services';

  const uid = getUserId();
  const isSeller = String(product.seller_id) === String(uid);
  const isAuction = product.sale_type === 'auction';
  const live = !!product.auction_live;
  const ended = !!product.auction_ended;
  const highBid = product.auction_high_bid;
  const winnerCanBuy = ended && highBid && String(product.auction_leader_id) === String(uid) && product.is_active === 1;

  const rentMinH = isRent ? Math.max(1, parseInt(product.details?.min_hours, 10) || 1) : 1;
  const rentMaxH = isRent ? Math.max(rentMinH, parseInt(product.details?.max_hours, 10) || 168) : 1;
  const rentTotal = isRent ? product.price * rentHours : 0;

  const specEntries = (product.details && Object.keys(product.details).length > 0)
    ? Object.entries(product.details).filter(([k]) => !isRent || (k !== 'min_hours' && k !== 'max_hours'))
    : [];

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
            <button
              type="button"
              className={`like-btn-large${product.is_favorite ? ' favorite-on' : ''}`}
              title={product.is_favorite ? 'Убрать из избранного' : 'В избранное'}
              onClick={handleFavorite}
            >
              <Heart size={20} fill={product.is_favorite ? 'currentColor' : 'none'} />
              <span>{product.is_favorite ? 'В избранном' : 'В избранное'}</span>
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
            {isAuction ? (
              <div className="price-tag auction-price-block">
                <span className="auction-label"><Gavel size={16} /> Аукцион</span>
                {highBid ? (
                  <span className="auction-current">Текущая ставка: <strong>{highBid.toLocaleString('ru-RU')} ₽</strong></span>
                ) : (
                  <span className="auction-current">Старт от <strong>{product.price.toLocaleString('ru-RU')} ₽</strong></span>
                )}
                <span className="auction-meta">Шаг {Number(product.auction_step || 500).toLocaleString('ru-RU')} ₽ · до {formatAuctionEnds(product.auction_ends_at)}</span>
              </div>
            ) : isRent ? (
              <div className="price-tag rent-price-tag">
                <strong>{product.price.toLocaleString('ru-RU')} ₽</strong>
                <span className="rent-per">за 1 час</span>
                <span className="rent-range-hint">доступно {rentMinH}—{rentMaxH} ч.</span>
              </div>
            ) : (
              <div className="price-tag">{product.price.toLocaleString('ru-RU')} ₽</div>
            )}
            {product.description && <p className="product-desc">{product.description}</p>}

            {specEntries && specEntries.length > 0 && (
              <div className="specs-section">
                <h3>Характеристики</h3>
                <div className="specs-grid">
                  {specEntries.map(([key, val]) => (
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
              {bought ? (
                <div className="btn-bought">
                  <CheckCircle size={16} />
                  {isRent ? `Аренда на ${rentHours} ч. оформлена. Детали — в «Истории сделок»` : 'Куплено! Перейти в Сделки'}
                </div>
              ) : product.is_active === 0 ? (
                <div className="btn-bought">
                  <CheckCircle size={16} />
                  Товар уже продан
                </div>
              ) : isAuction && live && (
                <div className="auction-live-banner">
                  <Clock size={16} />
                  <span>До конца: <strong>{formatCountdown(msLeft(product.auction_ends_at))}</strong></span>
                </div>
              )}
              {isAuction && live && isSeller && (
                <p className="auction-seller-hint">Идут торги. Следующая мин. ставка: <strong>{(product.auction_min_next_bid ?? product.price).toLocaleString('ru-RU')} ₽</strong></p>
              )}
              {isAuction && live && !isSeller && uid && (
                <form className="bid-form" onSubmit={handlePlaceBid}>
                  <label className="bid-label">Ваша ставка (мин. {(product.auction_min_next_bid ?? product.price).toLocaleString('ru-RU')} ₽)</label>
                  <div className="bid-row">
                    <input
                      type="number"
                      className="bid-input"
                      value={bidAmount}
                      onChange={e => { setBidAmount(e.target.value); setBidError(''); }}
                      placeholder={(product.auction_min_next_bid ?? product.price).toString()}
                      min={product.auction_min_next_bid ?? product.price}
                    />
                    <button type="submit" className="btn-bid" disabled={bidLoading}>
                      <Gavel size={16} />
                      {bidLoading ? '…' : 'Ставка'}
                    </button>
                  </div>
                  {bidError && <p className="bid-error">{bidError}</p>}
                </form>
              )}
              {isAuction && live && !uid && (
                <p className="auction-seller-hint">Войдите, чтобы сделать ставку</p>
              )}
              {isAuction && ended && highBid && (
                <p className="auction-ended-msg">
                  Торги окончены. Лидер: <strong>{product.auction_leader_name || '—'}</strong> ({highBid.toLocaleString('ru-RU')} ₽)
                </p>
              )}
              {isAuction && ended && !highBid && (
                <p className="auction-ended-msg">Торги окончены, ставок не было.</p>
              )}
              {winnerCanBuy && (
                <button className="btn-buy" onClick={handleBuy} disabled={buying}>
                  <ShoppingBag size={16} />
                  {buying ? 'Оформление...' : `Оформить победу — ${highBid.toLocaleString('ru-RU')} ₽`}
                </button>
              )}
              {isRent && !isAuction && !isSeller && product.is_active === 1 && (
                <div className="rent-booking">
                  <label className="rent-booking-label">Срок аренды: <strong>{rentHours}</strong> ч. ({rentMinH}—{rentMaxH})</label>
                  <input
                    type="range"
                    className="rent-range"
                    min={rentMinH}
                    max={rentMaxH}
                    value={Math.min(rentMaxH, Math.max(rentMinH, rentHours))}
                    onChange={e => setRentHours(parseInt(e.target.value, 10))}
                  />
                  <div className="rent-total-line">
                    Итого: <strong>{rentTotal.toLocaleString('ru-RU')} ₽</strong>
                    <span className="rent-formula">({product.price.toLocaleString('ru-RU')} ₽ × {rentHours} ч.)</span>
                  </div>
                  <button type="button" className="btn-buy" onClick={handleBuy} disabled={buying}>
                    <ShoppingBag size={16} />
                    {buying ? 'Оформление...' : `Арендовать на ${rentHours} ч.`}
                  </button>
                </div>
              )}
              {!isAuction && !isRent && !isSeller && product.is_active === 1 && (
                <button className="btn-buy" onClick={handleBuy} disabled={buying}>
                  <ShoppingBag size={16} />
                  {buying ? 'Оформление...' : `Купить за ${product.price.toLocaleString('ru-RU')} ₽`}
                </button>
              )}
              {!isSeller && (
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

            {isAuction && bidRows.length > 0 && (
              <div className="bid-history">
                <h4>Последние ставки</h4>
                <ul>
                  {bidRows.slice(0, 8).map(b => (
                    <li key={b.id}>
                      <span className="bid-name">{b.bidder_name}</span>
                      <span className="bid-sum">{Number(b.amount).toLocaleString('ru-RU')} ₽</span>
                      <span className="bid-when">{new Date(b.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                {(isRent ? specEntries : Object.entries(product.details || {})).map(([k, v]) => (
                  <div className="condition-card" key={k}>
                    <span className="c-label">{k}</span>
                    <span className="c-value">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isTransport && !isRent && (
            <div className="stats-panel extra-visual-panel">
              {isRealEstate && (
                <>
                  <h3>Примерная планировка</h3>
                  <p className="visual-disclaimer">Набросок «как у дяди Васи», не для БТИ и не для суда</p>
                  <div className="floor-plan-wrap">
                    <svg viewBox="0 0 400 168" className="floor-plan-svg" aria-hidden>
                      <rect x="6" y="6" width="388" height="156" fill="none" stroke="var(--accent)" strokeWidth="2.2" rx="6" />
                      <rect x="18" y="18" width="118" height="72" fill="rgba(43,118,251,0.12)" stroke="var(--border)" rx="2" />
                      <text x="44" y="58" fill="var(--text-secondary)" fontSize="12" fontFamily="inherit">кухня</text>
                      <rect x="148" y="18" width="110" height="72" fill="rgba(43,118,251,0.06)" stroke="var(--border)" rx="2" />
                      <text x="168" y="52" fill="var(--text-secondary)" fontSize="12" fontFamily="inherit">гостиная</text>
                      <text x="168" y="68" fill="var(--text-secondary)" fontSize="10" fontFamily="inherit">(тут был диван)</text>
                      <rect x="270" y="18" width="112" height="72" fill="rgba(43,118,251,0.08)" stroke="var(--border)" rx="2" />
                      <text x="295" y="58" fill="var(--text-secondary)" fontSize="12" fontFamily="inherit">спальня</text>
                      <rect x="18" y="100" width="88" height="50" fill="rgba(250,204,21,0.08)" stroke="var(--border)" rx="2" />
                      <text x="36" y="130" fill="var(--text-secondary)" fontSize="11" fontFamily="inherit">с/у</text>
                      <rect x="118" y="100" width="160" height="50" fill="rgba(43,118,251,0.04)" stroke="var(--border)" strokeDasharray="4 3" rx="2" />
                      <text x="150" y="128" fill="var(--text-secondary)" fontSize="11" fontFamily="inherit">коридор???</text>
                      <rect x="290" y="100" width="92" height="50" fill="rgba(239,68,68,0.1)" stroke="var(--border)" rx="2" />
                      <text x="308" y="130" fill="var(--text-secondary)" fontSize="10" fontFamily="inherit">ниша</text>
                      <text x="302" y="142" fill="var(--text-secondary)" fontSize="9" fontFamily="inherit">(духи бабушки)</text>
                    </svg>
                  </div>
                </>
              )}
              {isClothing && (
                <>
                  <h3>Индекс drip (на глаз)</h3>
                  <p className="visual-disclaimer">Научный метод: крутизна × удача в очереди за кроссами</p>
                  <svg viewBox="0 0 400 100" className="vibe-svg" aria-hidden>
                    <rect x="20" y="60" width="280" height="14" rx="7" fill="var(--bg-sidebar)" stroke="var(--border)" />
                    <rect x="20" y="60" width="210" height="14" rx="7" fill="var(--accent)" opacity="0.85" />
                    <text x="24" y="48" fill="var(--text-secondary)" fontSize="12" fontFamily="inherit">стайл</text>
                    <text x="300" y="72" fill="var(--accent)" fontSize="13" fontWeight="600" fontFamily="inherit">~75%</text>
                    <path d="M340 20 L360 45 L380 25" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeDasharray="3 2" />
                    <text x="330" y="18" fill="var(--text-secondary)" fontSize="10" fontFamily="inherit">рост цены</text>
                  </svg>
                </>
              )}
              {isItems && (
                <>
                  <h3>Что внутри коробки</h3>
                  <p className="visual-disclaimer">Реконструкция по шуршанию пупырки</p>
                  <svg viewBox="0 0 400 120" className="loot-svg" aria-hidden>
                    <rect x="120" y="20" width="160" height="90" rx="10" fill="var(--bg-sidebar)" stroke="var(--accent)" strokeWidth="2" />
                    <text x="200" y="58" textAnchor="middle" fill="var(--text-secondary)" fontSize="13" fontFamily="inherit">???</text>
                    <text x="200" y="78" textAnchor="middle" fill="var(--text-secondary)" fontSize="11" fontFamily="inherit">точно не кот</text>
                    <circle cx="90" cy="65" r="6" fill="var(--accent)" opacity="0.5" />
                    <circle cx="310" cy="65" r="6" fill="var(--accent)" opacity="0.5" />
                  </svg>
                </>
              )}
              {isServices && (
                <>
                  <h3>Маршрут мастера</h3>
                  <p className="visual-disclaimer">С учётом пробок и «сейчас отъеду на 5 минут»</p>
                  <svg viewBox="0 0 400 100" className="route-svg" aria-hidden>
                    <circle cx="40" cy="50" r="8" fill="var(--accent)" />
                    <text x="28" y="75" fill="var(--text-secondary)" fontSize="10" fontFamily="inherit">вы</text>
                    <path d="M52 50 Q120 20 200 55 T360 40" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="360" cy="40" r="8" fill="#22c55e" />
                    <text x="332" y="68" fill="var(--text-secondary)" fontSize="10" fontFamily="inherit">мастер</text>
                    <text x="160" y="22" fill="var(--text-secondary)" fontSize="10" fontFamily="inherit">объезд ЖК «Вечный ремонт»</text>
                  </svg>
                </>
              )}
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

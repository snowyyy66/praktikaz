import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, MessageCircle, Heart, Eye, MapPin, Phone, Star, ShoppingBag, CheckCircle, Gavel, Clock, ShieldCheck, Zap, Package, Info, Gauge, Ruler, RefreshCw, Sparkles, X, Camera, Edit3 } from 'lucide-react';
import { api, getUserId } from '../api';
import './ProductPage.css';

// Удалены константы VARIATIONS и функции mocking (pick, getSeed), так как логика перенесена на бэкенд.

const FloorPlanA = () => (
  <svg viewBox="0 0 400 240" className="floor-plan-svg" aria-hidden>
    <defs>
      <linearGradient id="g-room" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgba(43,118,251,0.1)" />
        <stop offset="100%" stopColor="rgba(43,118,251,0.02)" />
      </linearGradient>
    </defs>
    {/* Exterior Walls */}
    <rect x="20" y="20" width="360" height="200" fill="none" stroke="var(--text-secondary)" strokeWidth="3" rx="4" />
    {/* Kitchen + Living */}
    <rect x="20" y="20" width="220" height="120" fill="url(#g-room)" stroke="var(--border)" strokeWidth="1" />
    <text x="130" y="80" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="600">Кухня-гостиная</text>
    <text x="130" y="100" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">24.5 м²</text>
    {/* Bedroom */}
    <rect x="240" y="20" width="140" height="120" fill="rgba(250,204,21,0.04)" stroke="var(--border)" strokeWidth="1" />
    <text x="310" y="70" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="600">Спальня</text>
    <path d="M280 40 H340 V90 H280 Z" fill="rgba(255,255,255,0.05)" stroke="var(--border)" /> {/* Bed */}
    {/* Bathroom */}
    <rect x="20" y="140" width="100" height="80" fill="rgba(34,197,94,0.04)" stroke="var(--border)" strokeWidth="1" />
    <text x="70" y="185" textAnchor="middle" fill="var(--text-primary)" fontSize="12">Ванная</text>
    <circle cx="45" cy="165" r="12" fill="none" stroke="var(--border)" /> {/* Sink */}
    {/* Corridor */}
    <rect x="120" y="140" width="260" height="80" fill="none" stroke="var(--border)" strokeDasharray="4 2" />
    <text x="250" y="185" textAnchor="middle" fill="var(--text-secondary)" fontSize="12">Прихожая/Гардероб</text>
  </svg>
);

const FloorPlanB = () => (
  <svg viewBox="0 0 400 240" className="floor-plan-svg" aria-hidden>
    {/* Studio Layout */}
    <rect x="40" y="20" width="320" height="200" fill="none" stroke="var(--text-secondary)" strokeWidth="4" rx="10" />
    <rect x="40" y="20" width="320" height="150" fill="rgba(43,118,251,0.05)" stroke="var(--border)" />
    <text x="200" y="90" textAnchor="middle" fill="var(--text-primary)" fontSize="16" fontWeight="700">Open Space Studio</text>
    <text x="200" y="115" textAnchor="middle" fill="var(--text-secondary)" fontSize="12">32.8 м²</text>
    {/* Furniture icons */}
    <rect x="60" y="40" width="60" height="80" fill="rgba(255,255,255,0.03)" stroke="var(--border)" rx="2" /> {/* Library */}
    <rect x="300" y="40" width="40" height="40" fill="rgba(255,255,255,0.03)" stroke="var(--border)" rx="20" /> {/* Table */}
    {/* Entrance + Bath */}
    <rect x="40" y="170" width="120" height="50" fill="rgba(239,68,68,0.04)" stroke="var(--border)" />
    <text x="100" y="200" textAnchor="middle" fill="var(--text-secondary)" fontSize="12">Санузел</text>
    <path d="M260 170 V220 M260 195 H360" stroke="var(--border)" strokeWidth="1" />
    <text x="310" y="200" textAnchor="middle" fill="var(--text-secondary)" fontSize="12">Вход</text>
  </svg>
);

const FloorPlanC = () => (
  <svg viewBox="0 0 400 240" className="floor-plan-svg" aria-hidden>
    {/* Corner Apartment */}
    <path d="M40 40 H360 V180 H200 V220 H40 Z" fill="none" stroke="var(--text-secondary)" strokeWidth="3" />
    <rect x="40" y="40" width="160" height="140" fill="rgba(168,85,247,0.05)" stroke="var(--border)" />
    <text x="120" y="110" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="600">Мастер-спальня</text>
    <rect x="200" y="40" width="160" height="80" fill="rgba(43,118,251,0.05)" stroke="var(--border)" />
    <text x="280" y="85" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="600">Детская</text>
    <rect x="200" y="120" width="160" height="60" fill="rgba(234,179,8,0.05)" stroke="var(--border)" />
    <text x="280" y="155" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="600">Кухня</text>
    <path d="M40 180 H200 V220 H40 Z" fill="rgba(34,197,94,0.05)" stroke="var(--border)" />
    <text x="120" y="205" textAnchor="middle" fill="var(--text-primary)" fontSize="12">Лоджия панорамная</text>
  </svg>
);

const formatAuctionEnds = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('ru-RU', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

const msLeft = (dateStr) => {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, diff);
};

const formatCountdown = (ms) => {
  if (ms <= 0) return 'Окончен';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
};

/**
 * Компонент ProductPage (Страница объявления)
 * Отображает полную информацию о товаре, аукцион в реальном времени, возможность аренды, покупки или связи с продавцом.
 * Включает галерею фотографий и блок отзывов.
 */
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
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '', images: [] });
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [bidRows, setBidRows] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState('');
  const [, setTick] = useState(0);
  const [rentHours, setRentHours] = useState(1);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyForm, setBuyForm] = useState({
    street: '', house: '', houseType: 'apartment', entrance: '', floor: '', apartment: '',
    date: new Date().toISOString().split('T')[0], time: ''
  });
  const [buyStep, setBuyStep] = useState(1);
  const [buyError, setBuyError] = useState('');
  const [fullSlots, setFullSlots] = useState([]);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const reviewFormRef = useRef(null);

  const uid = getUserId();

  const refreshProduct = useCallback(() => {
    return api.getProduct(id).then(data => { setProduct(data); return data; }).catch(err => console.error(err));
  }, [id]);

  const viewIncremented = useRef(false);

  useEffect(() => {
    if (!id) return;
    // Защита от двойного инкремента просмотров в режиме React Strict Mode (для разработки)
    if (!viewIncremented.current) {
      api.incrementProductViews(id).catch(err => console.error('Failed to increment views:', err));
      viewIncremented.current = true;
    }

    setLoading(true);
    Promise.all([api.getProduct(id), api.getProductReviews(id)])
      .then(([data, revs]) => {
        setProduct(data);
        setReviews(revs);
        if (data.user_review) {
          setReviewForm({
            rating: data.user_review.rating,
            text: data.user_review.text,
            images: data.user_review.images || []
          });
          setIsEditingReview(true);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!product || product.sale_type !== 'auction') { setBidRows([]); return; }
    api.getProductBids(id).then(setBidRows).catch(() => setBidRows([]));
  }, [id, product?.sale_type, product?.auction_bids_count, product?.auction_high_bid]);

  useEffect(() => {
    if (!product?.auction_live) return;
    const iv = setInterval(() => { refreshProduct(); api.getProductBids(id).then(setBidRows).catch(() => { }); }, 4000);
    return () => clearInterval(iv);
  }, [product?.auction_live, id, refreshProduct]);

  useEffect(() => {
    if (!showBuyModal || !product) return;
    setCheckingSlots(true);
    api.getProductAvailability(product.id, buyForm.date)
      .then(res => setFullSlots(res.full_slots || []))
      .catch(() => setFullSlots([]))
      .finally(() => setCheckingSlots(false));
  }, [showBuyModal, product, buyForm.date]);

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

  const REVIEW_MAX_FILES = 10;
  const REVIEW_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const [reviewPhotoError, setReviewPhotoError] = useState('');

  const handleReviewPhotos = (e) => {
    const files = Array.from(e.target.files);
    const valid = [];
    const errors = [];
    for (const f of files) {
      const isVideo = f.type?.startsWith('video/mp4') || f.type?.startsWith('video/quicktime');
      const isImg = f.type === 'image/jpeg' || f.type === 'image/png' || f.type === 'image/gif';
      if (!isImg && !isVideo) { errors.push(`${f.name}: формат не поддерживается (jpg, png, gif, mp4, mov)`); continue; }
      if (f.size > REVIEW_MAX_FILE_SIZE) { errors.push(`${f.name}: больше 50MB`); continue; }
      valid.push({ file: f, url: URL.createObjectURL(f), isVideo });
    }
    const totalExisting = (reviewForm.images?.length || 0) + reviewPhotos.length;
    const remaining = REVIEW_MAX_FILES - totalExisting;
    if (valid.length > remaining) {
      errors.push(`Максимум ${REVIEW_MAX_FILES} файлов (${totalExisting} уже добавлено)`);
    }
    if (errors.length) setReviewPhotoError(errors.slice(0, 2).join('; '));
    else setReviewPhotoError('');
    setReviewPhotos(prev => [...prev, ...valid].slice(0, Math.max(0, remaining)));
    e.target.value = '';
  };

  const removeReviewPhoto = (idx) => {
    setReviewPhotos(p => p.filter((_, i) => i !== idx));
    setReviewPhotoError('');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      let finalImages = [...(reviewForm.images || [])];

      if (reviewPhotos.length > 0) {
        const uploadRes = await api.uploadReviewMedia(reviewPhotos.map(p => p.file));
        if (uploadRes.images) finalImages = [...finalImages, ...uploadRes.images];
      }

      const payload = {
        reviewer_id: getUserId(),
        product_id: product.id,
        rating: reviewForm.rating,
        text: reviewForm.text,
        images: finalImages
      };

      if (isEditingReview && product.user_review) {
        await api.updateReview(product.user_review.id, payload);
      } else {
        await api.createReview(payload);
      }

      await refreshProduct();
      const revs = await api.getProductReviews(product.id);
      setReviews(revs);
      setReviewSubmitted(true);
    } catch (err) {
      alert(err.message || 'Ошибка при отправке отзыва');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBuyClick = () => {
    if (!getUserId()) { setBuyError('Пожалуйста, войдите в аккаунт'); return; }
    setBuyStep(1);
    setBuyError('');
    setShowBuyModal(true);
  };

  const handleModalNext = () => {
    const isService = product.category_id === 'services';
    const hasDelivery = ['services', 'items', 'clothing'].includes(product.category_id);
    setBuyError('');

    if (buyStep === 1) {
      if (hasDelivery) setBuyStep(2);
      else handleConfirmPurchase();
    } else if (buyStep === 2) {
      if (!buyForm.street || !buyForm.house) {
        setBuyError('Пожалуйста, укажите улицу и дом');
        return;
      }
      if (isService) setBuyStep(3);
      else handleConfirmPurchase();
    } else if (buyStep === 3) {
      if (!buyForm.time) {
        setBuyError('Пожалуйста, выберите время');
        return;
      }
      handleConfirmPurchase();
    }
  };

  const handleModalBack = () => {
    if (buyStep > 1) setBuyStep(p => p - 1);
  };

  const handleConfirmPurchase = async () => {
    const isService = product.category_id === 'services';
    const isRentProd = product.category_id === 'rent';
    const isDeliveryNeeded = ['services', 'items', 'clothing'].includes(product.category_id);
    setBuyError('');

    if (isDeliveryNeeded && (!buyForm.street || !buyForm.house)) {
      setBuyError('Укажите адрес для ' + (isService ? 'выезда мастера' : 'доставки'));
      return;
    }
    if (isService && !buyForm.time) {
      setBuyError('Пожалуйста, выберите время');
      return;
    }

    setBuying(true);
    try {
      const total = isRentProd ? product.price * rentHours : product.price;
      const payload = {
        total,
        rent_hours: isRentProd ? rentHours : undefined,
        appointment_date: isService ? buyForm.date : undefined,
        appointment_time: isService ? buyForm.time : undefined,
        address_street: buyForm.street,
        address_house: buyForm.house,
        house_type: buyForm.houseType,
        address_entrance: buyForm.entrance,
        address_floor: buyForm.floor,
        address_apartment: buyForm.apartment
      };

      await api.createOrder(getUserId(), product.id, payload);
      setBought(true);
      // После покупки даем пользователю возможность сразу оставить отзыв
      setTimeout(() => {
        reviewFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    } catch (err) {
      setBuyError(err.message || 'Ошибка при оформлении заказа');
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
              typeof product.images[activeImg] === 'string' && product.images[activeImg].match(/\.(mp4|mov)$/i)
                ? <video src={imgUrl(product.images[activeImg])} className="product-main-img" controls autoPlay loop muted playsInline />
                : <img src={imgUrl(product.images[activeImg])} alt={product.title} className="product-main-img" />
            ) : (
              <div className="image-placeholder">ФОТО</div>
            )}
            {!isSeller && (
              <button
                type="button"
                className={`like-btn-large${product.is_favorite ? ' favorite-on' : ''}`}
                title={product.is_favorite ? 'Убрать из избранного' : 'В избранное'}
                onClick={handleFavorite}
              >
                <Heart size={20} fill={product.is_favorite ? 'currentColor' : 'none'} />
                <span>{product.is_favorite ? 'В избранном' : 'В избранное'}</span>
              </button>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="product-image-thumbs">
              {product.images.map((img, i) => {
                const isVideo = typeof img === 'string' && img.match(/\.(mp4|mov)$/i);
                return isVideo ? (
                  <video
                    key={i}
                    src={imgUrl(img)}
                    className={`product-thumb${activeImg === i ? ' active' : ''}`}
                    onClick={() => setActiveImg(i)}
                    autoPlay loop muted playsInline
                  />
                ) : (
                  <img
                    key={i}
                    src={imgUrl(img)}
                    alt=""
                    className={`product-thumb${activeImg === i ? ' active' : ''}`}
                    onClick={() => setActiveImg(i)}
                  />
                );
              })}
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
                  ? <img src={imgUrl(product.seller_avatar)} alt={product.seller_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
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
              <button className="btn-secondary" onClick={() => navigate(`/profile/${product.seller_id}`)}>
                <User size={16} />
                Профиль продавца
              </button>
              {bought ? (
                <div className="btn-bought">
                  <CheckCircle size={16} />
                  {isRent ? `Аренда на ${rentHours} ч. оформлена. Детали — в «Истории сделок»` : (isServices ? 'Услуга оформлена' : 'Куплено! Перейти в Сделки')}
                </div>
              ) : product.is_sold ? (
                <div className="btn-sold-badge">
                  <X size={16} />
                  ПРОДАНО
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
              {winnerCanBuy && !product.is_sold && (
                <button className="btn-buy" onClick={handleBuyClick} disabled={buying}>
                  <ShoppingBag size={16} />
                  {buying ? 'Оформление...' : `Оформить победу — ${highBid.toLocaleString('ru-RU')} ₽`}
                </button>
              )}
              {isRent && !isAuction && !isSeller && !product.is_sold && (
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
                  <button type="button" className="btn-buy" onClick={handleBuyClick} disabled={buying}>
                    <ShoppingBag size={16} />
                    {buying ? 'Оформление...' : `Арендовать на ${rentHours} ч.`}
                  </button>
                </div>
              )}
              {!isAuction && !isRent && !isSeller && !product.is_sold && (
                bought ? (
                  <div className="btn-bought"><CheckCircle size={18} /> Оформлено</div>
                ) : (
                  <button className="btn-buy" onClick={handleBuyClick} disabled={buying}>
                    <ShoppingBag size={18} />
                    {buying ? 'Оформление...' : `Купить за ${product.price.toLocaleString('ru-RU')} ₽`}
                  </button>
                )
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

          {/* Улучшенная панель характеристик и визуализации */}
          <div className="product-details-extra">
            {(() => {
              if (isRealEstate) {
                const Plan = [FloorPlanA, FloorPlanB, FloorPlanC][product.floor_plan_id ?? 0];
                return (
                  <div className="stats-panel extra-visual-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0 }}>Архитектурный план</h3>
                      <span className="badge-premium"><Sparkles size={12} /> High Fidelity</span>
                    </div>
                    <p className="visual-disclaimer">Профессиональная визуализация пространства и зонирования</p>
                    <div className="floor-plan-wrap">
                      <Plan />
                    </div>
                    <div className="plan-stats-row">
                      <div className="plan-stat"><Ruler size={14} /> <span>Потолки <strong>2.9м</strong></span></div>
                      <div className="plan-stat"><ShieldCheck size={14} /> <span>Стены <strong>Кирпич</strong></span></div>
                    </div>
                  </div>
                );
              }

              // Render specs panel using product.details (provided by backend with mocks)
              if (specEntries.length > 0) {
                return (
                  <div className="stats-panel">
                    <h3>Параметры и характеристики</h3>
                    <div className="condition-grid">
                      {specEntries.map(([k, v]) => (
                        <div className="condition-card" key={k}>
                          <span className="c-label">{k}</span>
                          <span className="c-value">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      {product.show_reviews_on_page && (
        <div className="reviews-section">
          <h2 className="reviews-title">Отзывы {reviews.length > 0 && <span className="reviews-count">({reviews.length})</span>}</h2>

          {reviews.length === 0 ? (
            <p className="reviews-empty">Отзывов пока нет</p>
          ) : (
            <div className="reviews-list">
              {reviews.map(r => (
                <div key={r.id} className="review-card">
                  <div className="review-header">
                    <div className="review-author-row">
                      <span className="review-author">{r.reviewer_name}</span>
                      {String(r.reviewer_id) === String(uid) && (
                        <button className="btn-edit-inline" onClick={() => {
                          setIsEditingReview(true);
                          setReviewSubmitted(false);
                          reviewFormRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }}>
                          <Edit3 size={12} /> Изменить
                        </button>
                      )}
                    </div>
                    <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span className="review-date">{new Date(r.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  {r.text && <p className="review-text">{r.text}</p>}
                  {r.images && r.images.length > 0 && (
                    <div className="review-media-preview">
                      {r.images.map((img, i) => (
                        <div key={i} className="rev-media-box">
                          {img.match(/\.(mp4|mov)$/i)
                            ? <video src={`http://localhost:3000${img}`} controls />
                            : <img src={`http://localhost:3000${img}`} alt="" />
                          }
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Persistent/Editable Review Form */}
      {((product.can_review && !product.user_review && !isEditingReview) || isEditingReview) && !reviewSubmitted && (
        <div className="review-form-container" ref={reviewFormRef}>
          <form className="review-form" onSubmit={handleReviewSubmit}>
            <h3>{isEditingReview ? 'Редактировать отзыв' : 'Оставить отзыв'}</h3>
            <div className="star-picker">
              {[1, 2, 3, 4, 5].map(n => (
                <button type="button" key={n}
                  className={`star-btn${reviewForm.rating >= n ? ' active' : ''}`}
                  onClick={() => setReviewForm({ ...reviewForm, rating: n })}>★</button>
              ))}
            </div>
            <textarea
              value={reviewForm.text}
              onChange={e => setReviewForm({ ...reviewForm, text: e.target.value })}
              placeholder="Расскажите о вашем опыте..."
              rows={4}
              className="review-textarea"
            />

            <div className="review-photo-upload">
              <label className="rev-upload-label">
                <Camera size={20} />
                <span>Добавить фото/видео</span>
                <input type="file" multiple accept=".jpg,.jpeg,.png,.gif,.mp4,.mov" onChange={handleReviewPhotos} hidden />
              </label>
              <span className="rev-upload-hint">
                {(reviewForm.images?.length || 0) + reviewPhotos.length}/{REVIEW_MAX_FILES} · jpg, png, gif, mp4, mov · до 50MB
              </span>
              {reviewPhotoError && <p className="rev-upload-error">{reviewPhotoError}</p>}

              <div className="rev-photo-previews">
                {/* Existing photos (from edit) */}
                {reviewForm.images?.map((img, idx) => (
                  <div key={`old-${idx}`} className="rev-preview-box">
                    {img.match(/\.(mp4|mov)$/i)
                      ? <video src={`http://localhost:3000${img}`} />
                      : <img src={`http://localhost:3000${img}`} alt="" />
                    }
                    <button type="button" className="rev-remove" onClick={() => { setReviewForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) })); setReviewPhotoError(''); }}><X size={12} /></button>
                  </div>
                ))}
                {/* New local photos */}
                {reviewPhotos.map((p, idx) => (
                  <div key={`new-${idx}`} className="rev-preview-box">
                    {p.isVideo ? <video src={p.url} /> : <img src={p.url} alt="" />}
                    <button type="button" className="rev-remove" onClick={() => removeReviewPhoto(idx)}><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="review-form-actions">
              <button type="submit" className="btn-submit-review" disabled={submittingReview}>
                {submittingReview ? 'Сохранение...' : (isEditingReview ? 'Сохранить изменения' : 'Опубликовать отзыв')}
              </button>
              {isEditingReview && (
                <button type="button" className="btn-cancel-review" onClick={() => setIsEditingReview(false)}>
                  Отмена
                </button>
              )}
            </div>
            {isEditingReview && (
              <p className="edit-hint">Вы уже оставляли отзыв, его можно отредактировать.</p>
            )}
          </form>
        </div>
      )}
      {reviewSubmitted && <p className="review-thanks">Отзыв успешно {isEditingReview ? 'обновлен' : 'добавлен'}!</p>}

      {/* Buy Modal */}
      {showBuyModal && (
        <div className="modal-overlay" onClick={() => setShowBuyModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-info">
                <h2>Оформление заказа</h2>
                <div className="step-indicator">Шаг {buyStep} из {
                  product.category_id === 'services' ? 3 : (['items', 'clothing'].includes(product.category_id) ? 2 : 1)
                }</div>
              </div>
              <button className="btn-close-modal" onClick={() => setShowBuyModal(false)}><X size={20} /></button>
            </div>

            <div className="modal-body">
              {bought ? (
                <div className="modal-success-state step-fade-in">
                  <div className="success-icon-bg">
                    <CheckCircle size={64} color="#16a34a" />
                  </div>
                  <h3>Заказ успешно оформлен!</h3>
                  <p>Информацию о заказе вы можете найти в личном кабинете. Продавец свяжется с вами в ближайшее время.</p>
                  <button className="btn-confirm-buy" onClick={() => setShowBuyModal(false)}>Отлично</button>
                </div>
              ) : (
                <>
                  {buyError && (
                    <div className="modal-error-box step-fade-in">
                      <Zap size={16} />
                      {buyError}
                    </div>
                  )}

                  {buyStep === 1 && (
                    <div className="modal-section step-fade-in">
                      <p className="confirm-msg">
                        Вы подтверждаете покупку объявления <strong>«{product.title}»</strong>?
                      </p>
                      <p className="confirm-hint">
                        {['services', 'items', 'clothing'].includes(product.category_id)
                          ? 'На следующем шаге вам нужно будет указать адрес.'
                          : 'После подтверждения продавец получит уведомление.'}
                      </p>
                    </div>
                  )}

                  {buyStep === 2 && (
                    <div className="modal-section step-fade-in">
                      <h3>Адрес {product.category_id === 'services' ? 'выезда специалиста' : 'доставки'}</h3>
                      <div className="house-type-toggle">
                        <button
                          className={`house-toggle-btn ${buyForm.houseType === 'apartment' ? 'active' : ''}`}
                          onClick={() => setBuyForm(p => ({ ...p, houseType: 'apartment' }))}
                        >Квартира</button>
                        <button
                          className={`house-toggle-btn ${buyForm.houseType === 'private' ? 'active' : ''}`}
                          onClick={() => setBuyForm(p => ({ ...p, houseType: 'private' }))}
                        >Частный дом</button>
                      </div>

                      <div className="form-grid">
                        <div className="form-field full">
                          <label className="form-label">Улица</label>
                          <input className="form-input" placeholder="Название улицы" value={buyForm.street} onChange={e => setBuyForm(p => ({ ...p, street: e.target.value }))} />
                        </div>
                        <div className="form-field">
                          <label className="form-label">Дом</label>
                          <input className="form-input" placeholder="№" value={buyForm.house} onChange={e => setBuyForm(p => ({ ...p, house: e.target.value }))} />
                        </div>

                        {buyForm.houseType === 'apartment' && (
                          <>
                            <div className="form-field">
                              <label className="form-label">Подъезд</label>
                              <input className="form-input" placeholder="№" value={buyForm.entrance} onChange={e => setBuyForm(p => ({ ...p, entrance: e.target.value }))} />
                            </div>
                            <div className="form-field">
                              <label className="form-label">Этаж</label>
                              <input className="form-input" placeholder="№" value={buyForm.floor} onChange={e => setBuyForm(p => ({ ...p, floor: e.target.value }))} />
                            </div>
                            <div className="form-field">
                              <label className="form-label">Квартира</label>
                              <input className="form-input" placeholder="№" value={buyForm.apartment} onChange={e => setBuyForm(p => ({ ...p, apartment: e.target.value }))} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {buyStep === 3 && (
                    <div className="modal-section step-fade-in">
                      <h3>Дата и время (12:00 - 20:00)</h3>
                      <input
                        type="date"
                        className="form-input date-selector"
                        min={new Date().toISOString().split('T')[0]}
                        value={buyForm.date}
                        onChange={e => setBuyForm(p => ({ ...p, date: e.target.value, time: '' }))}
                      />
                      <div className="time-slots">
                        {['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map(t => (
                          <button
                            key={t}
                            className={`time-slot-btn ${buyForm.time === t ? 'selected' : ''}`}
                            disabled={fullSlots.includes(t) || checkingSlots}
                            onClick={() => setBuyForm(p => ({ ...p, time: t }))}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      {checkingSlots && <p className="auction-meta" style={{ marginTop: 8 }}>Проверка доступности...</p>}
                    </div>
                  )}
                </>
              )}
            </div>

            {!bought && (
              <div className="modal-footer">
                <div className="price-summary">
                  <span className="price-summary-label">К оплате:</span>
                  <span className="price-summary-val">
                    {product.category_id === 'rent'
                      ? (product.price * rentHours).toLocaleString('ru-RU')
                      : (product.sale_type === 'auction' && product.auction_high_bid ? product.auction_high_bid : product.price).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="modal-actions">
                  {buyStep > 1 && (
                    <button className="btn-modal-back" onClick={handleModalBack}>Назад</button>
                  )}
                  <button className="btn-confirm-buy" onClick={handleModalNext} disabled={buying}>
                    {buying ? 'Оформление...' : (
                      (buyStep === 1 && ['services', 'items', 'clothing'].includes(product.category_id)) ? 'Продолжить' :
                        (buyStep === 2 && product.category_id === 'services') ? 'Продолжить' : 'Подтвердить заказ'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { Eye, Heart, Gavel } from 'lucide-react';
import { api, getUserId } from '../api';
import './HomePage.css';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Сначала новые' },
  { value: 'price_asc', label: 'Дешевле' },
  { value: 'price_desc', label: 'Дороже' },
  { value: 'popular', label: 'Популярные' },
];

/**
 * Компонент HomePage (Главная страница)
 * Отображает ленту объявлений (карточки) с возможностью сортировки, фильтрации и бесконечного скролла.
 * Использует IntersectionObserver для подгрузки новых страниц (пагинация) по мере прокрутки.
 */
export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [cityInput, setCityInput] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const loadMoreRef = useRef(null);
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const auctionOnly = searchParams.get('auction') === '1';

  const fetchProducts = useCallback(async (targetPage, append) => {
    const params = { sort, page: targetPage, limit: 100 };
    if (category) params.category = category;
    if (search) params.search = search;
    if (auctionOnly) params.auction = '1';
    if (cityFilter.trim()) params.city = cityFilter.trim();
    const uid = getUserId();
    if (uid) params.user_id = uid;
    const data = await api.getProducts(params);
    const items = data?.items || [];
    setProducts(prev => (append ? [...prev, ...items] : items));
    setHasMore(!!data?.has_more);
    setPage(targetPage);
  }, [category, sort, search, auctionOnly, cityFilter]);

  useEffect(() => {
    setLoading(true);
    setHasMore(true);
    setPage(1);
    fetchProducts(1, false)
      .catch(err => console.error('Failed to load products:', err))
      .finally(() => setLoading(false));
  }, [fetchProducts]);

  useEffect(() => {
    if (loading || loadingMore || !hasMore || !loadMoreRef.current) return;
    const el = loadMoreRef.current;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      setLoadingMore(true);
      fetchProducts(page + 1, true)
        .catch(err => console.error('Failed to load more products:', err))
        .finally(() => setLoadingMore(false));
    }, { rootMargin: '180px' });
    io.observe(el);
    return () => io.disconnect();
  }, [loading, loadingMore, hasMore, page, fetchProducts]);

  const applyCityFilter = () => {
    setCityFilter(cityInput.trim());
  };

  const handleFavorite = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    const uid = getUserId();
    if (!uid) {
      alert('Войдите в аккаунт, чтобы добавить объявление в избранное');
      return;
    }
    try {
      const res = await api.toggleFavorite(uid, productId);
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_favorite: res.favorited } : p));
    } catch (err) {
      alert(err.message || 'Не удалось обновить избранное');
    }
  };

  const getCategoryTitle = () => {
    if (search) return `Поиск: "${search}"`;
    if (auctionOnly) return 'Аукционы';
    const names = {
      transport: 'Транспорт', realestate: 'Недвижимость', items: 'Предметы',
      clothing: 'Одежда и аксессуары', services: 'Услуги и прочее', rent: 'Аренда транспорта'
    };
    return category ? names[category] || 'Объявления' : 'Все объявления';
  };

  const imgUrl = (src) => {
    if (!src) return '';
    return src.startsWith('http') ? src : `http://localhost:3000${src}`;
  };

  return (
    <div className="home-page animate-fade-in">
      <div className="page-toolbar">
        <h2 className="page-title">{getCategoryTitle()}</h2>
        <div className="sort-bar">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`sort-btn ${sort === opt.value ? 'active' : ''}`}
              onClick={() => setSort(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="city-filter-bar">
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyCityFilter(); }}
            placeholder="Введите город"
            className="city-filter-input"
          />
          <button className="sort-btn" onClick={applyCityFilter}>По городу</button>
          {cityFilter && (
            <button className="sort-btn" onClick={() => { setCityInput(''); setCityFilter(''); }}>
              Сброс
            </button>
          )}
        </div>
        <span className="results-count">{products.length} объявлений</span>
      </div>

      {loading ? (
        <div className="loading-state">Загрузка...</div>
      ) : products.length === 0 ? (
        <div className="empty-state">Нет объявлений в этой категории</div>
      ) : (
        <>
        <div className="products-grid">
          {products.map(product => (
            <NavLink to={`/product/${product.id}`} key={product.id} className="product-card"
              onMouseEnter={e => {
                const v = e.currentTarget.querySelector('video'); if (v) v.play();
                const gif = e.currentTarget.querySelector('img[data-gif]'); if (gif) gif.src = gif.dataset.gif;
              }}
              onMouseLeave={e => {
                const v = e.currentTarget.querySelector('video'); if (v) { v.pause(); v.currentTime = 0; }
                const gif = e.currentTarget.querySelector('img[data-gif]'); if (gif && gif.dataset.frozen) gif.src = gif.dataset.frozen;
              }}
            >
              <div className="card-image">
                {product.images?.[0] ? (
                  typeof product.images[0] === 'string' && product.images[0].match(/\.(mp4|mov)$/i)
                    ? <video src={imgUrl(product.images[0])} className="card-img" loop muted playsInline preload="metadata" style={{ pointerEvents: 'none' }} />
                    : <img src={imgUrl(product.images[0])} alt={product.title} className="card-img" loading="lazy"
                        onLoad={e => {
                          const img = e.target;
                          if (product.images[0].match(/\.gif$/i) && !img.dataset.frozen) {
                            fetch(img.src).then(r => r.blob()).then(blob => {
                              const url = URL.createObjectURL(blob);
                              const tmp = new Image();
                              tmp.onload = () => {
                                const c = document.createElement('canvas');
                                c.width = tmp.width; c.height = tmp.height;
                                c.getContext('2d').drawImage(tmp, 0, 0);
                                img.dataset.gif = img.src;
                                img.dataset.frozen = c.toDataURL();
                                img.src = img.dataset.frozen;
                              };
                              tmp.src = url;
                            }).catch(() => {});
                          }
                        }}
                      />
                ) : (
                  <div className="image-placeholder">{product.category_name?.substring(0, 2).toUpperCase() || 'ФТ'}</div>
                )}
                <div className="card-badges">
                  {product.sale_type === 'auction' && (
                    <div className="badge auction-badge"><Gavel size={11} /> Аукцион</div>
                  )}
                  <div className="badge"><Eye size={11} /> {product.views}</div>
                  <div className="badge condition-badge">{product.condition}</div>
                </div>
                {String(product.seller_id) !== String(getUserId()) && (
                <button
                  type="button"
                  className={`like-btn-card${product.is_favorite ? ' active-like' : ''}`}
                  title={product.is_favorite ? 'Убрать из избранного' : 'В избранное'}
                  onClick={(e) => handleFavorite(e, product.id)}
                >
                  <Heart size={16} fill={product.is_favorite ? 'currentColor' : 'none'} />
                </button>
                )}
              </div>

              <div className="card-content">
                <h3 className="card-title">{product.title}</h3>
                <p className="card-category">{product.category_name}</p>
                <p className="card-city">{product.city}</p>

                <div className="card-footer">
                  <span className="card-price">
                    {product.category_id === 'rent'
                      ? `${product.price.toLocaleString('ru-RU')} ₽/час`
                      : product.sale_type === 'auction'
                        ? (Number(product.auction_high_bid) > 0
                          ? `${Number(product.auction_high_bid).toLocaleString('ru-RU')} ₽`
                          : `от ${product.price.toLocaleString('ru-RU')} ₽`)
                        : `${product.price.toLocaleString('ru-RU')} ₽`}
                  </span>
                </div>
              </div>
            </NavLink>
          ))}
        </div>
        <div ref={loadMoreRef} style={{ height: 1 }} />
        {loadingMore && <div className="loading-state" style={{ minHeight: 80 }}>Загружаем ещё...</div>}
        {!hasMore && products.length > 0 && <div className="results-count" style={{ textAlign: 'center', width: '100%', marginTop: 10 }}>Больше объявлений нет</div>}
        </>
      )}
    </div>
  );
}

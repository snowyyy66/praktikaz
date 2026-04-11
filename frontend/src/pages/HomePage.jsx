import { useState, useEffect } from 'react';
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

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const auctionOnly = searchParams.get('auction') === '1';

  useEffect(() => {
    setLoading(true);
    const params = { sort };
    if (category) params.category = category;
    if (search) params.search = search;
    if (auctionOnly) params.auction = '1';
    const uid = getUserId();
    if (uid) params.user_id = uid;

    api.getProducts(params)
      .then(data => setProducts(data))
      .catch(err => console.error('Failed to load products:', err))
      .finally(() => setLoading(false));
  }, [category, sort, search, auctionOnly]);

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
        <span className="results-count">{products.length} объявлений</span>
      </div>

      {loading ? (
        <div className="loading-state">Загрузка...</div>
      ) : products.length === 0 ? (
        <div className="empty-state">Нет объявлений в этой категории</div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
            <NavLink to={`/product/${product.id}`} key={product.id} className="product-card">
              <div className="card-image">
                {product.images?.[0]
                  ? <img src={product.images[0]} alt={product.title} className="card-img" loading="lazy" />
                  : <div className="image-placeholder">{product.category_name?.substring(0, 2).toUpperCase() || 'ФТ'}</div>
                }
                <div className="card-badges">
                  {product.sale_type === 'auction' && (
                    <div className="badge auction-badge"><Gavel size={11} /> Аукцион</div>
                  )}
                  <div className="badge"><Eye size={11} /> {product.views}</div>
                  <div className="badge condition-badge">{product.condition}</div>
                </div>
                <button
                  type="button"
                  className={`like-btn-card${product.is_favorite ? ' active-like' : ''}`}
                  title={product.is_favorite ? 'Убрать из избранного' : 'В избранное'}
                  onClick={(e) => handleFavorite(e, product.id)}
                >
                  <Heart size={16} fill={product.is_favorite ? 'currentColor' : 'none'} />
                </button>
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
      )}
    </div>
  );
}

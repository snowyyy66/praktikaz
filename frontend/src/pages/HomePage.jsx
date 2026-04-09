import { useState, useEffect } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { Eye, Clock, Heart } from 'lucide-react';
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

  useEffect(() => {
    setLoading(true);
    const params = { sort };
    if (category) params.category = category;
    if (search) params.search = search;

    api.getProducts(params)
      .then(data => setProducts(data))
      .catch(err => console.error('Failed to load products:', err))
      .finally(() => setLoading(false));
  }, [category, sort, search]);

  const handleLike = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.likeProduct(productId);
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, likes: res.likes } : p));
    } catch (err) {
      console.error(err);
    }
  };

  const getCategoryTitle = () => {
    if (search) return `Поиск: "${search}"`;
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
                <div className="image-placeholder">{product.category_name?.substring(0, 2).toUpperCase() || 'ФТ'}</div>
                <div className="card-badges">
                  <div className="badge"><Eye size={11} /> {product.views}</div>
                  <div className="badge condition-badge">{product.condition}</div>
                </div>
                <button className="like-btn-card" onClick={(e) => handleLike(e, product.id)}>
                  <Heart size={16} />
                </button>
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

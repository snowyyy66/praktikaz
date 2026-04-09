import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Eye, Heart, Pencil, Trash2, X, Check } from 'lucide-react';
import { api, getUserId } from '../api';
import './HomePage.css';
import './MyProductsPage.css';

export default function MyProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  function loadProducts() {
    api.getUserProducts(getUserId())
      .then(data => setProducts(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }

  function openEdit(product, e) {
    e.preventDefault();
    setEditForm({
      title: product.title,
      category_id: product.category_id,
      price: product.price,
      city: product.city,
      condition: product.condition,
      description: product.description,
    });
    setEditingProduct(product);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProduct(editingProduct.id, { ...editForm, price: parseInt(editForm.price) || 0 });
      setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...editForm, price: parseInt(editForm.price) || 0 } : p));
      setEditingProduct(null);
    } catch (err) {
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product, e) {
    e.preventDefault();
    if (!confirm(`Снять с публикации "${product.title}"?`)) return;
    try {
      await api.deleteProduct(product.id);
      setProducts(products.filter(p => p.id !== product.id));
    } catch (err) {
      alert('Ошибка при удалении');
    }
  }

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
            <div key={product.id} className="product-card-wrapper">
              <NavLink to={`/product/${product.id}`} className="product-card">
                <div className="card-image">
                  {product.images?.[0]
                    ? <img src={product.images[0]} alt={product.title} className="card-img" loading="lazy" />
                    : <div className="image-placeholder">{product.category_name?.substring(0, 2).toUpperCase()}</div>
                  }
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
              <div className="product-actions">
                <button className="btn-edit" onClick={(e) => openEdit(product, e)} title="Редактировать">
                  <Pencil size={14} /> Редактировать
                </button>
                <button className="btn-delete" onClick={(e) => handleDelete(product, e)} title="Снять с публикации">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Редактировать объявление</h3>
              <button className="modal-close" onClick={() => setEditingProduct(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="edit-form">
              <div className="form-group">
                <label>Название</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Категория</label>
                  <select value={editForm.category_id} onChange={e => setEditForm({ ...editForm, category_id: e.target.value })}>
                    <option value="transport">Транспорт</option>
                    <option value="realestate">Недвижимость</option>
                    <option value="items">Предметы</option>
                    <option value="clothing">Одежда и аксессуары</option>
                    <option value="services">Услуги</option>
                    <option value="rent">Аренда</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Состояние</label>
                  <select value={editForm.condition} onChange={e => setEditForm({ ...editForm, condition: e.target.value })}>
                    <option value="Новое">Новое</option>
                    <option value="Б/У">Б/У</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Цена (₽)</label>
                  <input type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} required min="0" />
                </div>
                <div className="form-group">
                  <label>Город</label>
                  <input type="text" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Описание</label>
                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={4} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setEditingProduct(null)}>Отмена</button>
                <button type="submit" className="btn-save" disabled={saving}>
                  <Check size={14} /> {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

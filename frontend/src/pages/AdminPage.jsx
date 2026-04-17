import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Eye, Pencil, Trash2, X, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { api, getUserId, isAdmin } from '../api';
import './HomePage.css';
import './MyProductsPage.css';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Компонент AdminPage (Панель администратора)
 * Привилегированный доступ ко всем объявлениям платформы для их модерации и удаления.
 */
export default function AdminPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editPhotos, setEditPhotos] = useState([]);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    if (!isAdmin()) {
      setLoading(false);
      return;
    }
    api.getAdminProducts(getUserId())
      .then(setProducts)
      .catch((err) => alert(err.message || 'Ошибка загрузки админки'))
      .finally(() => setLoading(false));
  }, []);

  function openEdit(product, e) {
    e.preventDefault();
    setEditForm({
      title: product.title,
      category_id: product.category_id,
      price: product.price,
      city: product.city,
      condition: product.condition,
      description: product.description,
      seller_id: product.seller_id,
    });
    setEditingProduct(product);
    setEditPhotos([]);
    setPhotoError('');
  }

  function handleEditPhotos(e) {
    const files = Array.from(e.target.files || []);
    const valid = [];
    const errors = [];
    for (const f of files) {
      if (!f.type?.startsWith('image/')) { errors.push(`${f.name}: не изображение`); continue; }
      if (f.size > MAX_FILE_SIZE) { errors.push(`${f.name}: больше 5MB`); continue; }
      valid.push(f);
      if (valid.length >= MAX_FILES) break;
    }
    if (errors.length) setPhotoError(errors.slice(0, 2).join('; '));
    else setPhotoError('');
    setEditPhotos(valid);
  }

  async function handleDeleteImage(imageUrl) {
    if (!editingProduct) return;
    if (!confirm('Удалить эту фотографию?')) return;
    try {
      const res = await api.deleteProductImage(editingProduct.id, imageUrl, editForm.seller_id, getUserId());
      setEditingProduct(prev => ({ ...prev, images: res.images || [] }));
      setProducts(prev => prev.map(p => (p.id === editingProduct.id ? { ...p, images: res.images || [] } : p)));
    } catch (err) {
      alert(err.message || 'Не удалось удалить фото');
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProduct(
        editingProduct.id,
        { ...editForm, price: parseInt(editForm.price, 10) || 0 },
        getUserId()
      );
      if (editPhotos.length) {
        await api.uploadProductImages(editingProduct.id, editForm.seller_id, editPhotos, getUserId());
      }
      setProducts(prev => prev.map(p => (p.id === editingProduct.id ? { ...p, ...editForm } : p)));
      setEditingProduct(null);
      setEditPhotos([]);
    } catch (err) {
      alert(err.message || 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product, e) {
    e.preventDefault();
    if (!confirm(`Удалить объявление "${product.title}" навсегда?\nБудут удалены фото и связанные данные.`)) return;
    try {
      await api.deleteProduct(product.id, product.seller_id, getUserId());
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (err) {
      alert(err.message || 'Ошибка при удалении');
    }
  }

  if (!isAdmin()) {
    return <div className="empty-state">Доступ только для администратора</div>;
  }

  return (
    <div className="home-page animate-fade-in">
      <div className="page-toolbar">
        <h2 className="page-title">Админка: все объявления</h2>
        <span className="results-count">{products.length} шт.</span>
      </div>

      {loading ? (
        <div className="loading-state">Загрузка...</div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
            <div key={product.id} className="product-card-wrapper">
              <NavLink to={`/product/${product.id}`} className="product-card">
                <div className="card-image">
                  {product.images?.[0]
                    ? <img src={product.images[0].startsWith('/uploads/') ? `http://localhost:3000${product.images[0]}` : product.images[0]} alt={product.title} className="card-img" loading="lazy" />
                    : <div className="image-placeholder">{product.category_name?.substring(0, 2).toUpperCase()}</div>}
                  <div className="card-badges">
                    <div className="badge"><Eye size={11} /> {product.views}</div>
                    <div className="badge condition-badge">{product.condition}</div>
                  </div>
                </div>
                <div className="card-content">
                  <h3 className="card-title">{product.title}</h3>
                  <p className="card-category">{product.category_name}</p>
                  <p className="card-city">{product.city} · продавец: {product.seller_name}</p>
                  <div className="card-footer">
                    <span className="card-price">{Number(product.price || 0).toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
              </NavLink>
              <div className="product-actions">
                <button className="btn-edit" onClick={(e) => openEdit(product, e)} title="Редактировать">
                  <Pencil size={14} /> Редактировать
                </button>
                <button className="btn-delete" onClick={(e) => handleDelete(product, e)} title="Удалить навсегда">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingProduct && typeof document !== 'undefined' && createPortal((
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Админ: редактировать объявление</h3>
              <button className="modal-close" onClick={() => setEditingProduct(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="edit-form">
              <div className="form-group">
                <label>Название</label>
                <input type="text" value={editForm.title || ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Категория</label>
                  <input type="text" value={editForm.category_id || ''} onChange={e => setEditForm({ ...editForm, category_id: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Состояние</label>
                  <input type="text" value={editForm.condition || ''} onChange={e => setEditForm({ ...editForm, condition: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Цена (₽)</label>
                  <input type="number" value={editForm.price || ''} onChange={e => setEditForm({ ...editForm, price: e.target.value })} required min="1" />
                </div>
                <div className="form-group">
                  <label>Город</label>
                  <input type="text" value={editForm.city || ''} onChange={e => setEditForm({ ...editForm, city: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Описание</label>
                <textarea value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={4} />
              </div>
              <div className="form-group">
                <label>Добавить фото с устройства</label>
                <input type="file" accept="image/*" multiple onChange={handleEditPhotos} />
                {editPhotos.length > 0 && <small>Выбрано файлов: {editPhotos.length}</small>}
                {photoError && <small style={{ color: '#ef4444' }}>{photoError}</small>}
              </div>
              <div className="form-group">
                <label>Текущие фото объявления</label>
                <div className="edit-photo-grid">
                  {(editingProduct.images || []).map((img) => (
                    <div key={img} className="edit-photo-item">
                      <img src={img.startsWith('/uploads/') ? `http://localhost:3000${img}` : img} alt="" />
                      <button type="button" className="edit-photo-remove" onClick={() => handleDeleteImage(img)}>Удалить</button>
                    </div>
                  ))}
                </div>
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
      ), document.body)}
    </div>
  );
}

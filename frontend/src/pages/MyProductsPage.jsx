import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Eye, Heart, Pencil, Trash2, X, Check, Upload } from 'lucide-react';
import { createPortal } from 'react-dom';
import { api, getUserId } from '../api';
import './HomePage.css';
import './MyProductsPage.css';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Компонент MyProductsPage (Мои объявления)
 * Раздел селлера, где он управляет своими активными карточками: редактирует описание, загружает фото и снимает с публикации.
 */
export default function MyProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editPhotos, setEditPhotos] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const cardImgUrl = (src) => (src?.startsWith('/uploads/') ? `http://localhost:3000${src}` : src);

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
    setEditPhotos([]);
    setPhotoError('');
  }

  function handleEditPhotos(e) {
    const files = Array.from(e.target.files || []);
    const valid = [];
    const errors = [];
    for (const f of files) {
      const isVideo = f.type?.startsWith('video/mp4') || f.type?.startsWith('video/quicktime');
      const isImg = f.type === 'image/jpeg' || f.type === 'image/png' || f.type === 'image/gif';
      if (!isImg && !isVideo) { errors.push(`${f.name}: формат не поддерживается`); continue; }
      if (f.size > MAX_FILE_SIZE) { errors.push(`${f.name}: больше 50MB`); continue; }
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
      const res = await api.deleteProductImage(editingProduct.id, imageUrl, getUserId(), getUserId());
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
      await api.updateProduct(editingProduct.id, { ...editForm, price: parseInt(editForm.price) || 0 });
      if (editPhotos.length) {
        await api.uploadProductImages(editingProduct.id, getUserId(), editPhotos, getUserId());
      }
      setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...editForm, price: parseInt(editForm.price) || 0 } : p));
      setEditingProduct(null);
      setEditPhotos([]);
    } catch (err) {
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product, e) {
    e.preventDefault();
    if (!confirm(`Удалить объявление "${product.title}" навсегда?\nБудут удалены фото и связанные данные.`)) return;
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
              <NavLink to={`/product/${product.id}`} className="product-card"
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
                    ? <video src={cardImgUrl(product.images[0])} className="card-img" loop muted playsInline preload="metadata" style={{ pointerEvents: 'none' }} />
                    : <img src={cardImgUrl(product.images[0])} alt={product.title} className="card-img" loading="lazy"
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
            <div className="form-group">
                <label>Добавить фото с устройства</label>
                <div className="file-input-wrapper">
                  <label className="file-upload-trigger" htmlFor="edit-photos-upload">
                    <Upload size={18} />
                    {editPhotos.length > 0 ? `Выбрано файлов: ${editPhotos.length}` : 'Выберите фотографии'}
                  </label>
                  <input 
                    id="edit-photos-upload"
                    type="file" 
                    accept=".jpg,.jpeg,.png,.gif,.mp4,.mov" 
                    multiple 
                    onChange={handleEditPhotos} 
                  />
                </div>
                {photoError && <small style={{ color: 'var(--danger)', marginTop: '8px', display: 'block' }}>{photoError}</small>}
              </div>
              <div className="form-group">
                <label>Текущие фото объявления</label>
                <div className="edit-photo-grid">
                  {(editingProduct.images || []).map((img) => {
                    const src = img.startsWith('/uploads/') ? `http://localhost:3000${img}` : img;
                    const isVid = typeof img === 'string' && img.match(/\.(mp4|mov)$/i);
                    return (
                    <div key={img} className="edit-photo-item">
                      {isVid
                        ? <video src={src} autoPlay loop muted playsInline style={{width:'100%',height:'100%',objectFit:'cover'}} />
                        : <img src={src} alt="" />
                      }
                      <button type="button" className="edit-photo-remove" onClick={() => handleDeleteImage(img)}>Удалить</button>
                    </div>
                  )})}
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

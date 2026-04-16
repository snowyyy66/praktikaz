// Страница создания объявления с параметрами и фото.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { api, getUserId } from '../api';
import './CreateProductPage.css';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const CATEGORY_CONDITIONS = {
  transport: ['Б/У', 'Новое'],
  realestate: ['Вторичка', 'Новостройка'],
  rent: ['Аренда/сутки'],
  items: ['Новое', 'Б/У'],
  clothing: ['Новое', 'Б/У'],
  services: ['Услуга'],
};

const CATEGORY_FIELDS = {
  transport: [
    { name: 'Марка и модель', key: 'brand' },
    { name: 'Год выпуска', key: 'year' },
    { name: 'Пробег (км)', key: 'mileage' },
    { name: 'КПП', key: 'transmission', options: ['Автомат', 'Механика', 'Робот', 'Вариатор'] },
    { name: 'Привод', key: 'drive', options: ['Передний', 'Задний', 'Полный'] },
  ],
  realestate: [
    { name: 'Площадь (кв.м)', key: 'area' },
    { name: 'Количество комнат', key: 'rooms', options: ['Студия', '1', '2', '3', '4+'] },
    { name: 'Этаж', key: 'floor' },
    { name: 'Ремонт', key: 'renovation', options: ['Черновая', 'Чистовая', 'Евро', 'Дизайнерский'] },
  ],
  rent: [
    { name: 'Мин. срок (часов)', key: 'min_hours', number: true, min: 1, placeholder: '4' },
    { name: 'Макс. срок (часов)', key: 'max_hours', number: true, min: 1, placeholder: '72' },
    { name: 'Залог / условия', key: 'deposit' },
    { name: 'Мин. стаж вождения', key: 'min_experience' },
  ],
  clothing: [
    { name: 'Бренд', key: 'brand' },
    { name: 'Размер', key: 'size' },
  ],
};

export default function CreateProductPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    category_id: 'items',
    price: '',
    city: 'Москва',
    condition: 'Б/У',
    description: ''
  });
  const [saleMode, setSaleMode] = useState('fixed');
  const [auctionEnds, setAuctionEnds] = useState('');
  const [auctionStep, setAuctionStep] = useState('500');
  const [details, setDetails] = useState({});
  const [photoError, setPhotoError] = useState('');

  const handleChange = (e) => {
    const updated = { ...formData, [e.target.name]: e.target.value };
    if (e.target.name === 'category_id') {
      const conditions = CATEGORY_CONDITIONS[e.target.value];
      updated.condition = conditions ? conditions[0] : 'Б/У';
      setDetails({});
      if (e.target.value === 'rent') setSaleMode('fixed');
    }
    setFormData(updated);
  };

  const handleDetailChange = (key, value) => {
    setDetails({ ...details, [key]: value });
  };

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files);
    const valid = [];
    const errors = [];
    for (const f of files) {
      if (!f.type?.startsWith('image/')) { errors.push(`${f.name}: не изображение`); continue; }
      if (f.size > MAX_FILE_SIZE) { errors.push(`${f.name}: больше 5MB`); continue; }
      valid.push({ file: f, url: URL.createObjectURL(f) });
      if (valid.length >= MAX_FILES) break;
    }
    if (errors.length) setPhotoError(errors.slice(0, 2).join('; '));
    else setPhotoError('');
    setPhotos(prev => [...prev, ...valid].slice(0, MAX_FILES));
  };

  const removePhoto = (idx) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const price = parseInt(formData.price);
    if (!price || price <= 0) { alert('Укажите корректную цену'); return; }
    if (formData.description.trim().length < 10) { alert('Описание должно быть не менее 10 символов'); return; }
    if (saleMode === 'auction' && !auctionEnds.trim()) { alert('Укажите дату и время окончания торгов'); return; }
    if (formData.category_id === 'rent') {
      const minH = parseInt(details.min_hours, 10);
      const maxH = parseInt(details.max_hours, 10);
      if (!Number.isFinite(minH) || minH < 1) { alert('Укажите минимум часов аренды (от 1)'); return; }
      if (!Number.isFinite(maxH) || maxH < minH) { alert('Максимум часов должен быть не меньше минимума'); return; }
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        price,
        seller_id: getUserId(),
        details,
        sale_type: formData.category_id === 'rent' ? 'fixed' : (saleMode === 'auction' ? 'auction' : 'fixed'),
        auction_ends_at: formData.category_id === 'rent' ? null : (saleMode === 'auction' ? auctionEnds : null),
        auction_step: formData.category_id === 'rent' ? undefined : (saleMode === 'auction' ? parseInt(auctionStep, 10) || 500 : undefined),
      };
      const data = await api.createProduct(payload);

      if (photos.length > 0 && data.id) {
        await api.uploadProductImages(data.id, getUserId(), photos.map(p => p.file));
      }

      navigate('/my-products');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Ошибка при публикации объявления');
    } finally {
      setLoading(false);
    }
  };

  const conditions = CATEGORY_CONDITIONS[formData.category_id] || ['Новое', 'Б/У'];
  const extraFields = CATEGORY_FIELDS[formData.category_id] || [];

  return (
    <div className="create-page animate-fade-in">
      <button className="btn-back" onClick={() => navigate(-1)} type="button">
        <ArrowLeft size={16} /> Назад
      </button>

      <div className="create-container">
        <h2>Новое объявление</h2>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-row">
            <div className="form-group">
              <label>Название товара</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="iPhone 13 128Gb..." />
            </div>
            <div className="form-group">
              <label>Категория</label>
              <select name="category_id" value={formData.category_id} onChange={handleChange}>
                <option value="transport">Транспорт</option>
                <option value="realestate">Недвижимость</option>
                <option value="items">Предметы</option>
                <option value="clothing">Одежда и аксессуары</option>
                <option value="services">Услуги</option>
                <option value="rent">Аренда</option>
              </select>
            </div>
          </div>

          {formData.category_id !== 'rent' && (
          <div className="form-group sale-mode-row">
            <label>Тип продажи</label>
            <div className="sale-mode-toggle">
              <label className={saleMode === 'fixed' ? 'active' : ''}>
                <input type="radio" name="saleMode" checked={saleMode === 'fixed'} onChange={() => setSaleMode('fixed')} />
                Фиксированная цена
              </label>
              <label className={saleMode === 'auction' ? 'active' : ''}>
                <input type="radio" name="saleMode" checked={saleMode === 'auction'} onChange={() => setSaleMode('auction')} />
                Аукцион (торги)
              </label>
            </div>
          </div>
          )}

          {formData.category_id !== 'rent' && saleMode === 'auction' && (
            <div className="form-row">
              <div className="form-group">
                <label>Окончание торгов</label>
                <input type="datetime-local" value={auctionEnds} onChange={e => setAuctionEnds(e.target.value)} required={saleMode === 'auction'} />
              </div>
              <div className="form-group">
                <label>Шаг ставки (₽)</label>
                <input type="number" value={auctionStep} onChange={e => setAuctionStep(e.target.value)} min="1" placeholder="500" />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>
                {formData.category_id === 'rent'
                  ? 'Цена за 1 час (₽)'
                  : (saleMode === 'auction' ? 'Стартовая ставка (₽)' : 'Цена (₽)')}
              </label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} required placeholder={formData.category_id === 'rent' ? '1500' : '50000'} min="1" />
            </div>
            <div className="form-group">
              <label>Состояние</label>
              <select name="condition" value={formData.condition} onChange={handleChange}>
                {conditions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Город</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} required />
            </div>
          </div>

          {extraFields.length > 0 && (
            <div className="extra-fields">
              <h3 className="extra-fields-title">Характеристики</h3>
              <div className="form-row">
                {extraFields.map(field => (
                  <div className="form-group" key={field.key}>
                    <label>{field.name}</label>
                    {field.options ? (
                      <select value={details[field.key] || ''} onChange={e => handleDetailChange(field.key, e.target.value)}>
                        <option value="">— выберите —</option>
                        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : field.number ? (
                      <input
                        type="number"
                        min={field.min ?? 1}
                        value={details[field.key] || ''}
                        onChange={e => handleDetailChange(field.key, e.target.value)}
                        placeholder={field.placeholder || ''}
                      />
                    ) : (
                      <input type="text" value={details[field.key] || ''} onChange={e => handleDetailChange(field.key, e.target.value)} placeholder={field.name} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Описание</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required placeholder="Расскажите подробнее о товаре..." rows={6} minLength={10}></textarea>
          </div>

          <div className="photo-upload-section">
            <label className="photo-upload-label">
              <Upload size={20} />
              <span>Добавить фотографии</span>
              <input type="file" accept="image/*" multiple onChange={handlePhotos} style={{ display: 'none' }} />
            </label>
            {photos.length > 0 && (
              <div className="photo-previews">
                {photos.map((p, idx) => (
                  <div className="photo-preview" key={idx}>
                    <img src={p.url} alt="" />
                    <button type="button" className="photo-remove" onClick={() => removePhoto(idx)}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            {photoError && <div style={{ marginTop: '8px', color: '#ef4444', fontSize: '12px' }}>{photoError}</div>}
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Публикация...' : 'Опубликовать'}
          </button>
        </form>
      </div>
    </div>
  );
}


import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { api, getUserId } from '../api';
import './CreateProductPage.css';

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
    { name: 'Залог', key: 'deposit' },
    { name: 'Минимальный стаж (лет)', key: 'min_experience' },
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
  const [details, setDetails] = useState({});

  const handleChange = (e) => {
    const updated = { ...formData, [e.target.name]: e.target.value };
    if (e.target.name === 'category_id') {
      const conditions = CATEGORY_CONDITIONS[e.target.value];
      updated.condition = conditions ? conditions[0] : 'Б/У';
      setDetails({});
    }
    setFormData(updated);
  };

  const handleDetailChange = (key, value) => {
    setDetails({ ...details, [key]: value });
  };

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files);
    const previews = files.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setPhotos(prev => [...prev, ...previews].slice(0, 10));
  };

  const removePhoto = (idx) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const price = parseInt(formData.price);
    if (!price || price <= 0) { alert('Укажите корректную цену'); return; }
    if (formData.description.trim().length < 10) { alert('Описание должно быть не менее 10 символов'); return; }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, price, seller_id: getUserId(), details }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (photos.length > 0 && data.id) {
        const fd = new FormData();
        photos.forEach(p => fd.append('images', p.file));
        await fetch(`http://localhost:3000/api/products/${data.id}/images`, { method: 'POST', body: fd });
      }

      navigate('/my-products');
    } catch (err) {
      console.error(err);
      alert('Ошибка при публикации объявления');
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

          <div className="form-row">
            <div className="form-group">
              <label>Цена (₽)</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} required placeholder="50000" min="1" />
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
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Публикация...' : 'Опубликовать'}
          </button>
        </form>
      </div>
    </div>
  );
}

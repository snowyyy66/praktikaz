import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { api, getUserId } from '../api';
import './CreateProductPage.css';

export default function CreateProductPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category_id: 'items',
    price: '',
    city: 'Москва',
    condition: 'Б/У',
    description: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dbPrice = parseInt(formData.price) || 0;
      await api.createProduct({
        ...formData,
        price: dbPrice,
        seller_id: getUserId()
      });
      navigate('/my-products');
    } catch (err) {
      console.error(err);
      alert('Ошибка при публикации объявления');
    } finally {
      setLoading(false);
    }
  };

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
              <input type="number" name="price" value={formData.price} onChange={handleChange} required placeholder="50000" min="0" />
            </div>
            <div className="form-group">
              <label>Состояние</label>
              <select name="condition" value={formData.condition} onChange={handleChange}>
                <option value="Новое">Новое</option>
                <option value="Б/У">Б/У</option>
              </select>
            </div>
            <div className="form-group">
              <label>Город</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label>Описание</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required placeholder="Расскажите подробнее о товаре..." rows={6}></textarea>
          </div>

          <div className="photo-upload-mock">
            <ImageIcon size={32} />
            <span>Добавление фото пока недоступно</span>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Публикация...' : 'Опубликовать'}
          </button>
        </form>
      </div>
    </div>
  );
}

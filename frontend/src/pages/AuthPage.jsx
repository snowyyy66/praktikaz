import { useState } from 'react';
import { Mail, Lock, User as UserIcon } from 'lucide-react';
import { api } from '../api';
import './AuthPage.css';

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await api.login({ email: formData.email, password: formData.password });
      } else {
        await api.register(formData);
      }
      onLogin(); // App.jsx will now pass us through because we have token
    } catch (err) {
      console.error(err);
      setError(isLogin ? 'Неверная почта или пароль' : 'Ошибка регистрации (возможно, такой пользователь уже существует)');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="auth-page animate-fade-in">
      <div className="auth-container">
        <div className="auth-logo">
          <h2>WIWANG</h2>
          <span>MARKETPLACE</span>
        </div>

        <div className="auth-header">
          <h2>{isLogin ? 'Вход в аккаунт' : 'Регистрация'}</h2>
          <p>{isLogin ? 'С возвращением! Войдите, чтобы продолжить' : 'Создайте аккаунт, чтобы покупать и продавать'}</p>
        </div>

        {error && <div className="auth-error" style={{ color: '#dc2f02', marginBottom: '16px', textAlign: 'center', fontSize: '14px' }}>{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="input-group">
              <UserIcon size={18} className="input-icon" />
              <input type="text" name="username" placeholder="Имя пользователя" required value={formData.username} onChange={handleChange} />
            </div>
          )}
          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input type="email" name="email" placeholder="Электронная почта" required value={formData.email} onChange={handleChange} />
          </div>
          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input type="password" name="password" placeholder="Пароль" required value={formData.password} onChange={handleChange} />
          </div>

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>

        <div className="auth-footer">
          {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
          <button type="button" className="btn-link" onClick={() => setIsLogin(!isLogin)}>
             {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  );
}

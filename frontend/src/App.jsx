// Корневой компонент: не залогинен — только AuthPage; иначе сетка с сайдбаром, шапкой и <Routes>.
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import ProfilePage from './pages/ProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import MyProductsPage from './pages/MyProductsPage';
import OrdersPage from './pages/OrdersPage';
import AuthPage from './pages/AuthPage';
import CreateProductPage from './pages/CreateProductPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminPage from './pages/AdminPage';
import { isAdmin as checkIsAdmin } from './api';

function App() {
  // isAuthenticated: есть userId в localStorage; isAdmin: роль из ответа логина
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // При открытии приложения подхватываем сессию, если пользователь уже логинился
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      setIsAuthenticated(true);
      setIsAdmin(checkIsAdmin());
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setIsAdmin(checkIsAdmin());
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
    setIsAuthenticated(false);
    setIsAdmin(false);
  };

  if (!isAuthenticated) {
    return <AuthPage onLogin={handleLogin} />; // логин/регистрация — отдельный экран без лейаута
  }

  return (
    <div className="app-container">
      <Sidebar onOpenAuth={handleLogout} isAdminUser={isAdmin} />
      <main className="main-content">
        <Header />
        <div className="page-content">
          <Routes>
            {/* Каталог: query ?category= & ?search= & ?auction=1 обрабатываются в HomePage */}
            <Route path="/" element={<HomePage />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/my-products" element={<MyProductsPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/create" element={<CreateProductPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/admin" element={isAdmin ? <AdminPage /> : <Navigate to="/" replace />} /> {/* не-админ с /admin уходит на главную */}
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;


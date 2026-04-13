import { NavLink, Link, useSearchParams } from 'react-router-dom';
import { LayoutGrid, Gavel, Car, Home, Box, Shirt, Briefcase, KeyRound, Heart, Package, Clock, User, LogOut, Shield } from 'lucide-react';
import { isAdmin } from '../api';
import './Sidebar.css';

const categories = [
  { id: 'transport', name: 'Транспорт', icon: <Car size={18} /> },
  { id: 'realestate', name: 'Недвижимость', icon: <Home size={18} /> },
  { id: 'items', name: 'Предметы', icon: <Box size={18} /> },
  { id: 'clothing', name: 'Одежда и аксессуары', icon: <Shirt size={18} /> },
  { id: 'services', name: 'Услуги и прочее', icon: <Briefcase size={18} /> },
  { id: 'rent', name: 'Аренда транспорта', icon: <KeyRound size={18} /> }
];

export default function Sidebar({ onOpenAuth }) {
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || '';
  const auctionNav = searchParams.get('auction') === '1';

  return (
    <aside className="sidebar">
      <NavLink to="/" className="logo-container">
        <h2>WIWANG</h2>
        <span>MARKETPLACE</span>
      </NavLink>

      <nav className="nav-menu">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive && !activeCategory && !auctionNav ? 'active' : ''}`}>
          <LayoutGrid size={18} />
          <span>Все объявления</span>
        </NavLink>

        <Link
          to="/?auction=1"
          className={`nav-item ${auctionNav && !activeCategory ? 'active' : ''}`}
        >
          <Gavel size={18} />
          <span>Аукционы</span>
        </Link>

        <div className="nav-divider"></div>

        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/?category=${cat.id}`}
            className={`nav-item ${activeCategory === cat.id ? 'active' : ''}`}
          >
            {cat.icon}
            <span>{cat.name}</span>
          </Link>
        ))}

        <div className="nav-divider"></div>

        <NavLink to="/favorites" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Heart size={18} />
          <span>Избранное</span>
        </NavLink>
        <NavLink to="/my-products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Package size={18} />
          <span>Мои объявления</span>
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Clock size={18} />
          <span>История покупок</span>
        </NavLink>
        {isAdmin() && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Shield size={18} />
            <span>Админка</span>
          </NavLink>
        )}

        <div className="spacer"></div>

        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <User size={18} />
          <span>Профиль</span>
        </NavLink>
        <button className="nav-item logout" onClick={onOpenAuth}>
          <LogOut size={18} />
          <span>Сменить аккаунт</span>
        </button>
      </nav>
    </aside>
  );
}

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Scale, Settings, LogOut, User } from 'lucide-react';
import './Header.css';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, isLoading } = useAuth();

  // Не рендерим header пока идет загрузка
  if (isLoading) {
    return null;
  }

  const navItems = [
    { path: '/chat', label: 'Консультация' },
    { path: '/documents', label: 'Документы' }
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    // Очищаем все данные чата и сессий для обеспечения приватности
    localStorage.removeItem('chat_sessions');
    localStorage.removeItem('ai_lawyer_messages');
    
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <Scale size={32} />
            <span>Windex-Юрист</span>
          </Link>

          <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            {user && (
              <div className="user-menu">
                <button className="user-button" onClick={toggleUserMenu}>
                  <User size={20} />
                  <span>{user.name}</span>
                </button>
                {isUserMenuOpen && (
                  <div className="user-dropdown">
                    <div className="user-info">
                      <p>{user.name}</p>
                      <p className="user-email">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User size={16} />
                      Профиль
                    </Link>
                    {isAdmin() && (
                      <Link
                        to="/admin"
                        className="dropdown-item"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Settings size={16} />
                        Админ панель
                      </Link>
                    )}
                    <button className="dropdown-item logout" onClick={handleLogout}>
                      <LogOut size={16} />
                      Выйти
                    </button>
                  </div>
                )}
              </div>
            )}

          <button className="menu-toggle" onClick={toggleMenu}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 
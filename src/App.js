import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { initializeDemoUsers } from './services/userService';
import Header from './components/Header';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Lawyer from './pages/Lawyer';
import WebSocketChat from './pages/WebSocketChat';

import Documents from './pages/Documents';
import About from './pages/About';
import TestPDF from './pages/TestPDF';
import Login from './components/Login';
import Registration from './components/Registration';
import AdminPanel from './components/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import MyDocuments from './pages/MyDocuments';
import Profile from './pages/Profile';
import FillDocuments from './pages/FillDocuments';
import './App.css';

export const LanguageContext = createContext({ lang: 'ru', setLang: () => {} });

const LANGUAGES = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺', country: 'Россия' },
  { code: 'kk', label: 'Қазақша', flag: '🇰🇿', country: 'Казахстан' },
  { code: 'be', label: 'Беларуская', flag: '🇧🇾', country: 'Беларусь' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦', country: 'Украина' },
  { code: 'uz', label: "O'zbekcha", flag: '🇺🇿', country: 'Узбекистан' },
  { code: 'ky', label: 'Кыргызча', flag: '🇰🇬', country: 'Киргизия' },
  { code: 'az', label: 'Azərbaycan dili', flag: '🇦🇿', country: 'Азербайджан' },
  { code: 'hy', label: 'Հայերեն', flag: '🇦🇲', country: 'Армения' },
  { code: 'mo', label: 'Română', flag: '🇲🇩', country: 'Молдова' },
  { code: 'tg', label: 'Тоҷикӣ', flag: '🇹🇯', country: 'Таджикистан' },
  { code: 'tk', label: 'Türkmençe', flag: '🇹🇲', country: 'Туркменистан' },
  { code: 'ka', label: 'ქართული', flag: '🇬🇪', country: 'Грузия' },
  { code: 'zh', label: '简体中文', flag: '🇨🇳', country: 'Китай' },
];

// Внутренний компонент для работы с авторизацией
const AppContent = () => {
  const { user, isLoading } = useAuth();
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'ru');
  const [showWelcome, setShowWelcome] = useState(() => {
    // Показывать приветствие только если пользователь НЕ авторизован и язык не выбран
    return !user && !localStorage.getItem('lang');
  });

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  // Обновляем состояние приветствия при изменении пользователя
  useEffect(() => {
    if (user) {
      setShowWelcome(false);
    }
  }, [user]);

  const handleSelectLang = (code) => {
    setLang(code);
    setShowWelcome(false);
    localStorage.setItem('lang', code);
  };

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="App">
          {showWelcome && !user && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}>
              <h1 style={{ fontSize: 36, marginBottom: 24 }}>Добро пожаловать! Welcome! Қош келдіңіз!</h1>
              <p style={{ fontSize: 20, marginBottom: 32 }}>Выберите язык/Select your language:</p>
              <div className="language-selection" style={{ display: 'flex', gap: 32 }}>
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => handleSelectLang(l.code)}
                    style={{
                      fontSize: 48,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      outline: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      color: 'white',
                    }}
                  >
                    <span>{l.flag}</span>
                    <span style={{ fontSize: 18, marginTop: 8 }}>{l.label}</span>
                    <span style={{ fontSize: 14 }}>{l.country}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
            <Routes>
              {/* Публичные маршруты */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Registration />} />
              
              {/* Защищенные маршруты */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Header />
                  <main className="main-content">
                    <Home />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="/chat" element={
                <ProtectedRoute>
                  <Header />
                  <main className="main-content">
                    <Chat />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="/lawyer" element={
                <ProtectedRoute>
                  <Header />
                  <main className="main-content">
                    <Lawyer />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="/live-chat" element={
                <ProtectedRoute>
                  <WebSocketChat />
                </ProtectedRoute>
              } />

              <Route path="/documents" element={
                <ProtectedRoute>
                  <Header />
                  <main className="main-content">
                    <Documents />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="/fill-documents" element={
                <ProtectedRoute>
                  <Header />
                  <main className="main-content">
                    <FillDocuments />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="/about" element={
                <ProtectedRoute>
                  <Header />
                  <main className="main-content">
                    <About />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="/test-pdf" element={
                <ProtectedRoute>
                  <Header />
                  <main className="main-content">
                    <TestPDF />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="/my-documents" element={
                <ProtectedRoute>
                  <Header />
                  <main className="main-content">
                    <MyDocuments />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Header />
                  <main className="main-content">
                    <Profile />
                  </main>
                </ProtectedRoute>
              } />
              
              {/* Админские маршруты */}
              <Route path="/admin" element={
                <ProtectedRoute adminOnly={true}>
                  <AdminPanel />
                </ProtectedRoute>
              } />
            </Routes>
        </div>
      </Router>
    </LanguageContext.Provider>
  );
};

function App() {
  // Инициализация демо пользователей при первом запуске
  useEffect(() => {
    initializeDemoUsers();
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App; 
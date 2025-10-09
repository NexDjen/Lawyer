import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { initializeDemoUsers } from './services/userService';
import Header from './components/Header';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Lawyer from './pages/Lawyer';
import WebSocketChat from './pages/WebSocketChat';
import Consultation from './pages/Consultation';
import DocumentsMain from './pages/DocumentsMain';
import DocumentsFunctional from './pages/DocumentsFunctional';
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


// Внутренний компонент для работы с авторизацией
const AppContent = () => {
  const { isLoading } = useAuth();
  const location = useLocation();
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'ru');

  // Логирование навигации
  useEffect(() => {
    console.log('Route changed to:', location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);


  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="App">
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
              <Route path="/consultation" element={
                <ProtectedRoute>
                  <Header />
                  <main className="main-content">
                    <Consultation />
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
                    <DocumentsMain />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="/documents-manage" element={
                <ProtectedRoute>
                  <Header />
                  <main className="main-content">
                    <DocumentsFunctional />
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
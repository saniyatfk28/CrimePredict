
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import PublicAuthChoice from './components/PublicAuthChoice';
import SignUpPage from './components/SignUpPage';
import Navbar from './components/Navbar';
import AdminDashboard from './components/AdminDashboard';
import LawDashboard from './components/LawDashboard';
import PublicDashboard from './components/PublicDashboard';
import DataUpload from './components/DataUpload';
import CrimeAnalytics from './components/CrimeAnalytics';
import PreventionTipsPage from './components/PreventionTipsPage';
import LawCrimePhotos from './components/LawCrimePhotos';
import AdminMail from './components/AdminMail';
import { UserRole, AuthState, User } from './types';

import { seedDatasetIfEmpty } from './utils/seedDataset';

const USER_DB_KEY = 'crimepredict_local_users_db';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('crimepredict_auth');
    return saved ? JSON.parse(saved) : { isAuthenticated: false, user: null };
  });

  // Seed default demo users if they don't exist
  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem(USER_DB_KEY) || '[]');
    const demoUsers = [
      { username: 'admin', password: 'admin123', fullName: 'System Administrator', role: UserRole.ADMIN, email: 'admin@crimepredict.com' },
      { username: 'law', password: 'law123', fullName: 'Officer Field Portal', role: UserRole.LAW_ENFORCEMENT, email: 'officer@crimepredict.com' },
      { username: 'user', password: 'user123', fullName: 'Demo Citizen', role: UserRole.PUBLIC, email: 'user@citizen.com' }
    ];

    let updated = false;
    demoUsers.forEach(demo => {
      if (!storedUsers.find((u: any) => u.username === demo.username)) {
        storedUsers.push(demo);
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(USER_DB_KEY, JSON.stringify(storedUsers));
    }
  }, []);

  // Seed a small sample dataset in localStorage for development when empty
  useEffect(() => {
    try {
      seedDatasetIfEmpty();
    } catch (err) {
      // ignore
    }
  }, []);

  const login = (role: UserRole, username: string, fullName: string) => {
    const newState = { 
      isAuthenticated: true, 
      user: { id: Date.now().toString(), username, role, fullName } 
    };
    setAuth(newState);
    localStorage.setItem('crimepredict_auth', JSON.stringify(newState));
  };

  const logout = () => {
    setAuth({ isAuthenticated: false, user: null });
    localStorage.removeItem('crimepredict_auth');
    // Clear common auth keys that may persist in localStorage
    localStorage.removeItem('role');
    localStorage.removeItem('token');
    // Navigate to landing page to ensure UI refresh
    window.location.href = window.location.origin + window.location.pathname + '#/';
  };

  return (
    <HashRouter>
      <div className="min-h-screen">
        {auth.isAuthenticated && <Navbar user={auth.user!} onLogout={logout} />}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login/admin" element={<LoginPage role={UserRole.ADMIN} onLogin={login} />} />
          <Route path="/login/law" element={<LoginPage role={UserRole.LAW_ENFORCEMENT} onLogin={login} />} />
          
          {/* Public User Flow */}
          <Route path="/public/auth-choice" element={<PublicAuthChoice />} />
          <Route path="/public/login" element={<LoginPage role={UserRole.PUBLIC} onLogin={login} />} />
          <Route path="/public/signup" element={<SignUpPage onSignUp={(user) => login(UserRole.PUBLIC, user.username, user.fullName)} />} />
          
          {/* Dashboards with Role Protection */}
          <Route 
            path="/dashboard/admin" 
            element={auth.isAuthenticated && auth.user?.role === UserRole.ADMIN ? <AdminDashboard /> : <Navigate to="/" />} 
          />
          <Route 
            path="/dashboard/admin/data" 
            element={auth.isAuthenticated && auth.user?.role === UserRole.ADMIN ? <DataUpload /> : <Navigate to="/" />} 
          />
          <Route 
            path="/dashboard/admin/analytics" 
            element={auth.isAuthenticated && auth.user?.role === UserRole.ADMIN ? <CrimeAnalytics /> : <Navigate to="/" />} 
          />
          <Route
            path="/dashboard/admin/mail"
            element={auth.isAuthenticated && auth.user?.role === UserRole.ADMIN ? <AdminMail /> : <Navigate to="/" />}
          />

          <Route 
            path="/dashboard/law" 
            element={auth.isAuthenticated && auth.user?.role === UserRole.LAW_ENFORCEMENT ? <LawDashboard /> : <Navigate to="/" />} 
          />
          <Route 
            path="/dashboard/law/analytics" 
            element={auth.isAuthenticated && auth.user?.role === UserRole.LAW_ENFORCEMENT ? <CrimeAnalytics /> : <Navigate to="/" />} 
          />
          <Route
            path="/dashboard/law/prevention"
            element={
              auth.isAuthenticated && auth.user?.role === UserRole.LAW_ENFORCEMENT
                ? <PreventionTipsPage role="law" />
                : <Navigate to="/" />
            }
          />
          <Route
            path="/dashboard/law/photos"
            element={
              auth.isAuthenticated && auth.user?.role === UserRole.LAW_ENFORCEMENT
                ? <LawCrimePhotos />
                : <Navigate to="/" />
            }
          />
          <Route 
            path="/dashboard/public" 
            element={auth.isAuthenticated && auth.user?.role === UserRole.PUBLIC ? <PublicDashboard /> : <Navigate to="/" />} 
          />
          <Route
            path="/dashboard/public/prevention"
            element={
              auth.isAuthenticated && auth.user?.role === UserRole.PUBLIC
                ? <PreventionTipsPage role="public" />
                : <Navigate to="/" />
            }
          />
          {/* report-photo route removed; photo upload is integrated into the Report modal */}
          <Route 
            path="/dashboard/public/analytics" 
            element={auth.isAuthenticated && auth.user?.role === UserRole.PUBLIC ? <CrimeAnalytics /> : <Navigate to="/" />} 
          />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;

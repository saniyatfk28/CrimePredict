import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';

const LOGIN_URL = 'http://127.0.0.1:8000/api/auth/login/';

interface LoginPageProps {
  role: UserRole;
  onLogin: (role: UserRole, username: string, fullName: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ role, onLogin }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const config = {
    [UserRole.ADMIN]: {
      title: 'Administrator Access',
      subtitle: 'System Backend Login',
      colorClass: 'text-danger',
      btnClass: 'btn-danger',
      icon: 'fa-user-lock',
      redirect: '/dashboard/admin',
      backRedirect: '/'
    },
    [UserRole.LAW_ENFORCEMENT]: {
      title: 'Law Enforcement Login',
      subtitle: 'Official Officer Portal',
      colorClass: 'text-primary',
      btnClass: 'btn-primary',
      icon: 'fa-id-badge',
      redirect: '/dashboard/law',
      backRedirect: '/'
    },
    [UserRole.PUBLIC]: {
      title: 'Public Portal',
      subtitle: 'Citizen Safety Dashboard',
      colorClass: 'text-success',
      btnClass: 'btn-success',
      icon: 'fa-user-circle',
      redirect: '/dashboard/public',
      backRedirect: '/public/auth-choice'
    }
  }[role];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        return;
      }

      // backend response:
      // { username, role, email }

      if (!data.role) {
        setError('Invalid server response');
        return;
      }

      // ROLE ENFORCEMENT (IMPORTANT FOR YOUR PORTALS)
      if (data.role !== role) {
        setError(`Unauthorized: This account does not have ${role} access`);
        return;
      }

      onLogin(data.role, data.username, data.username);
      navigate(config.redirect);

    } catch (err) {
      setError('Server unreachable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container bg-light">
      <div className="card shadow-lg border-0" style={{ maxWidth: '400px', width: '100%', borderRadius: '20px' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <i className={`fas ${config.icon} fa-3x ${config.colorClass} mb-3`}></i>
            <h2 className={`fw-bold ${config.colorClass}`}>{config.title}</h2>
            <p className="text-muted">{config.subtitle}</p>
          </div>

          {error && <div className="alert alert-danger py-2 small text-center">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-bold small">Username or Email</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-bold small">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              className={`btn ${config.btnClass} w-100 py-2 fw-bold`}
              disabled={loading}
            >
              {loading ? 'Validating...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-3 text-center">
            <button
              className="btn btn-link text-muted btn-sm"
              onClick={() => navigate(config.backRedirect)}
              disabled={loading}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
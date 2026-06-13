
import React from 'react';
import { Link } from 'react-router-dom';
import { UserRole, User as UserType } from '../types';

interface NavbarProps {
  user: UserType;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const badgeClass = {
    [UserRole.ADMIN]: 'bg-danger-subtle text-danger border-danger',
    [UserRole.LAW_ENFORCEMENT]: 'bg-primary-subtle text-primary border-primary',
    [UserRole.PUBLIC]: 'bg-success-subtle text-success border-success',
  }[user.role];

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm sticky-top">
      <div className="container">
        <a
          className="navbar-brand fw-bold text-primary"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            const role = user.role;
            if (role === UserRole.ADMIN) window.location.hash = '#/dashboard/admin';
            else if (role === UserRole.LAW_ENFORCEMENT) window.location.hash = '#/dashboard/law';
            else window.location.hash = '#/dashboard/public';
          }}
        >
          <i className="fas fa-shield-halved me-2"></i> CrimePredict
        </a>

        <div className="ms-3 d-none d-md-flex align-items-center gap-3">
          {user.role === UserRole.PUBLIC && (
            <Link className="nav-link" to="/dashboard/public/prevention">Prevention</Link>
          )}

          {user.role === UserRole.LAW_ENFORCEMENT && (
            <>
              <Link className="nav-link" to="/dashboard/law/prevention">Prevention</Link>
              <Link className="nav-link" to="/dashboard/law/photos">Photos</Link>
            </>
          )}
        </div>
        
        <div className="d-flex align-items-center">
          <span className={`badge border me-3 d-none d-md-inline-block px-3 py-2 ${badgeClass}`}>
            <i className={`fas me-2 ${user.role === UserRole.ADMIN ? 'fa-user-shield' : user.role === UserRole.LAW_ENFORCEMENT ? 'fa-id-badge' : 'fa-user'}`}></i>
            {user.role.replace('_', ' ')}
          </span>
          
          <div className="dropdown">
            <button className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2 border-0" type="button" data-bs-toggle="dropdown">
              <div className="avatar bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                {user.username[0].toUpperCase()}
              </div>
              <span className="fw-bold">{user.username}</span>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
              <li><button className="dropdown-item py-2" onClick={onLogout}><i className="fas fa-sign-out-alt me-2"></i> Logout</button></li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

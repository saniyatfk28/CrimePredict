
import React from 'react';
import { useNavigate } from 'react-router-dom';

const PublicAuthChoice: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="login-container bg-light">
      <div className="card shadow-lg border-0" style={{ maxWidth: '450px', width: '100%', borderRadius: '20px' }}>
        <div className="card-body p-5 text-center">
          <div className="mb-4">
            <i className="fas fa-users fa-3x text-success mb-3"></i>
            <h2 className="fw-bold text-success">Public Portal Access</h2>
            <p className="text-muted">Join our community to help monitor and predict crime patterns in Bangladesh.</p>
          </div>

          <div className="d-grid gap-3 mb-4">
            <button 
              className="btn btn-success py-3 fw-bold shadow-sm rounded-3 d-flex align-items-center justify-content-center gap-2"
              onClick={() => navigate('/public/login')}
            >
              <i className="fas fa-sign-in-alt"></i> Sign In
            </button>
            <button 
              className="btn btn-outline-success py-3 fw-bold shadow-sm rounded-3 d-flex align-items-center justify-content-center gap-2"
              onClick={() => navigate('/public/signup')}
            >
              <i className="fas fa-user-plus"></i> Create New Account
            </button>
          </div>

          <div className="text-center">
            <button 
              className="btn btn-link text-decoration-none text-muted btn-sm"
              onClick={() => navigate('/')}
            >
              <i className="fas fa-arrow-left me-1"></i> Back to Role Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicAuthChoice;

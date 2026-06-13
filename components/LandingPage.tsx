
import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container py-5">
      <div className="text-center mb-5 mt-4">
        <h1 className="display-4 fw-bold text-dark">Crime<span className="text-primary">Predict</span></h1>
        <h4 className="fw-semibold text-secondary">Predicting Crime Patterns for Safer Communities in Bangladesh</h4>
        <p className="text-muted">A data-driven approach to public safety and strategic law enforcement.</p>
      </div>

      <div className="row g-4 justify-content-center">
        {/* Admin Card */}
        <div className="col-md-4">
          <div className="card h-100 landing-card shadow-sm p-4 text-center border-top border-5 border-danger" onClick={() => navigate('/login/admin')}>
            <div className="card-body">
              <div className="mb-4">
                <i className="fas fa-user-shield fa-4xl text-danger"></i>
              </div>
              <h3 className="card-title fw-bold">Login as Admin</h3>
              <p className="card-text text-muted">Manage system users, view global logs, and configure security parameters.</p>
              <button className="btn btn-danger w-100 mt-3 fw-bold shadow-sm">Go to Admin Portal</button>
            </div>
          </div>
        </div>

        {/* Law Enforcement Card */}
        <div className="col-md-4">
          <div className="card h-100 landing-card shadow-sm p-4 text-center border-top border-5 border-primary" onClick={() => navigate('/login/law')}>
            <div className="card-body">
              <div className="mb-4">
                <i className="fas fa-building-shield fa-4xl text-primary"></i>
              </div>
              <h3 className="card-title fw-bold">Law Enforcement</h3>
              <p className="card-text text-muted">Access crime maps, AI forecasting, and resource allocation suggestions.</p>
              <button className="btn btn-primary w-100 mt-3 fw-bold shadow-sm">Go to Law Portal</button>
            </div>
          </div>
        </div>

        {/* Public User Card */}
        <div className="col-md-4">
          <div className="card h-100 landing-card shadow-sm p-4 text-center border-top border-5 border-success" onClick={() => navigate('/public/auth-choice')}>
            <div className="card-body">
              <div className="mb-4">
                <i className="fas fa-users fa-4xl text-success"></i>
              </div>
              <h3 className="card-title fw-bold">Public User</h3>
              <p className="card-text text-muted">Submit tips, view neighborhood safety profiles, and check safety alerts.</p>
              <button className="btn btn-success w-100 mt-3 fw-bold shadow-sm">Go to Public Portal</button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-5 text-center text-muted border-top">
        <p className="mb-0">&copy; 2024 CrimePredict Security Systems. Empowering Bangladesh with Data Intelligence.</p>
      </div>
    </div>
  );
};

export default LandingPage;

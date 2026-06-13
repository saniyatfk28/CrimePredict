import React from 'react';
import { useNavigate } from 'react-router-dom';
import CrimeStatsOverview from './CrimeStatsOverview';

const CrimeStatisticsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-danger">
            <i className="fas fa-chart-line me-2"></i>Crime Statistics Overview
          </h2>
          <p className="text-muted">Comprehensive crime data analysis and trends</p>
        </div>
        <button 
          className="btn btn-outline-secondary" 
          onClick={() => navigate('/dashboard/admin')}
        >
          <i className="fas fa-arrow-left me-2"></i>Back to Dashboard
        </button>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">
          <CrimeStatsOverview />
        </div>
      </div>
    </div>
  );
};

export default CrimeStatisticsPage;

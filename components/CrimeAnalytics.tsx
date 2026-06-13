import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserRole } from '../types';
import CrimeStatsOverview from './CrimeStatsOverview';
import FilteredCrimeStats from './FilteredCrimeStats';
import UserDistrictSelector, { getUserDistrict } from './UserDistrictSelector';

const CrimeAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDistrict, setSelectedDistrict] = useState<string>(getUserDistrict() || '');

  // Determine user role from auth state
  const authData = JSON.parse(localStorage.getItem('crimepredict_auth') || '{}');
  const userRole = authData.user?.role;
  const isPublicUser = userRole === UserRole.PUBLIC;
  const isLawEnforcement = userRole === UserRole.LAW_ENFORCEMENT;

  const getBackUrl = () => {
    if (userRole === UserRole.ADMIN) return '/dashboard/admin';
    if (userRole === UserRole.LAW_ENFORCEMENT) return '/dashboard/law';
    if (userRole === UserRole.PUBLIC) return '/dashboard/public';
    return '/';
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-danger">
            <i className="fas fa-chart-line me-2"></i>Crime Analytics & Statistics
          </h2>
          <p className="text-muted">
            {isPublicUser 
              ? 'Safety insights for your area' 
              : isLawEnforcement
              ? 'Operational crime analytics'
              : 'Comprehensive crime data analysis and insights'}
          </p>
        </div>
        <button 
          className="btn btn-outline-secondary" 
          onClick={() => navigate(getBackUrl())}
        >
          <i className="fas fa-arrow-left me-2"></i>Back
        </button>
      </div>

      {/* District Selector (available to all users) */}
      <div className="card border-0 shadow-sm p-4 mb-4 rounded-4 bg-light">
        <div className="row align-items-center">
          <div className="col-md-6">
            <label className="form-label fw-bold mb-2">
              <i className="fas fa-location-dot me-2 text-info"></i>
              {isPublicUser ? 'Select Your District' : 'Filter by District (optional)'}
            </label>
            <UserDistrictSelector onDistrictSelect={setSelectedDistrict} />
            <small className="text-muted d-block mt-2">
              {isPublicUser ? 'Crime statistics will be filtered based on your district selection' : 'Optionally filter analytics by a specific district'}
            </small>
          </div>
          {selectedDistrict && (
            <div className="col-md-6">
              <div className="alert alert-info mb-0 rounded-3">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Viewing:</strong> Crime data for <strong>{selectedDistrict}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">
          {/* Show FilteredCrimeStats (graphs, trends, heatmap) for all roles.
              Public users receive a district filter; Admin/Law see the full dataset. */}
          <FilteredCrimeStats districtFilter={selectedDistrict || undefined} />
        </div>
      </div>
    </div>
  );
};

export default CrimeAnalytics;


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WidgetConfig, CitizenReport, ReportStatus, UserRole } from '../types';
import CitizenIntelligenceFeed from './CitizenIntelligenceFeed';
import CrimeStatsOverview from './CrimeStatsOverview';

const REPORTS_DB_KEY = 'crimepredict_citizen_reports';
const USER_DB_KEY = 'crimepredict_local_users_db';
const DATASET_DB_KEY = 'crimepredict_dataset';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    { id: 'crime-stats', title: 'Total Crimes Overview', isVisible: true },
    { id: 'public-users', title: 'Registered Public Users', isVisible: true },
    { id: 'citizen-reports', title: 'Citizen Intelligence Feed', isVisible: true },
    { id: 'system-logs', title: 'Audit & System Logs', isVisible: true },
    { id: 'map-control', title: 'Global Incident Map', isVisible: true },
  ]);

  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [lawEnforcementUsers, setLawEnforcementUsers] = useState<any[]>([]);
  const [crimeCount, setCrimeCount] = useState<number>(0);

  useEffect(() => {
    loadAllData();
    // Simulate live updates by polling localStorage every 5 seconds
    const interval = setInterval(loadAllData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = () => {
    // Load reports
    const savedReports = JSON.parse(localStorage.getItem(REPORTS_DB_KEY) || '[]');
    setCitizenReports(savedReports);

    // Load users
    const allUsers = JSON.parse(localStorage.getItem(USER_DB_KEY) || '[]');
    const publicUsers = allUsers.filter((u: any) => u.role === UserRole.PUBLIC);
    const lawUsers = allUsers.filter((u: any) => u.role === UserRole.LAW_ENFORCEMENT);
    setRegisteredUsers(publicUsers);
    setLawEnforcementUsers(lawUsers);

    // Load dataset
    const dataset = JSON.parse(localStorage.getItem(DATASET_DB_KEY) || '[]');
    setCrimeCount(dataset.length);
  };

  const updateReportStatus = (reportId: string, newStatus: ReportStatus) => {
    const allReports: CitizenReport[] = JSON.parse(localStorage.getItem(REPORTS_DB_KEY) || '[]');
    const updatedReports = allReports.map(report => 
      report.reportId === reportId ? { ...report, status: newStatus } : report
    );
    localStorage.setItem(REPORTS_DB_KEY, JSON.stringify(updatedReports));
    setCitizenReports(updatedReports);
  };

  const toggleWidget = (id: string) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, isVisible: !w.isVisible } : w));
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-danger">Administrator Dashboard</h2>
          <p className="text-muted">Master control and oversight system</p>
        </div>
        
        <div className="d-flex gap-2">
          <button 
            className="btn btn-danger shadow-sm fw-bold"
            onClick={() => navigate('/dashboard/admin/data')}
          >
            <i className="fas fa-database me-2"></i>Data
          </button>
          <button 
            className="btn btn-info shadow-sm fw-bold"
            onClick={() => navigate('/dashboard/admin/analytics')}
          >
            <i className="fas fa-chart-line me-2"></i>Analytics
          </button>
          <button
            className="btn btn-success shadow-sm fw-bold"
            onClick={() => navigate('/dashboard/admin/mail')}
          >
            <i className="fas fa-envelope me-2"></i>Mail
          </button>
          <div className="dropdown">
            <button className="btn btn-outline-danger dropdown-toggle shadow-sm fw-bold" type="button" data-bs-toggle="dropdown">
              <i className="fas fa-cog me-2"></i> Configure Widgets
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow border-0 p-3" style={{ minWidth: '250px' }}>
              <h6 className="dropdown-header px-0 fw-bold text-dark">Toggle Display</h6>
              {widgets.map(w => (
                <li key={w.id} className="mb-2">
                  <div className="form-check form-switch">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      checked={w.isVisible} 
                      onChange={() => toggleWidget(w.id)}
                      id={w.id}
                    />
                    <label className="form-check-label small fw-bold" htmlFor={w.id}>{w.title}</label>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Stat Cards */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-danger text-white p-3 rounded-4">
            <div className="d-flex justify-content-between">
              <div>
                <p className="mb-1 fw-bold opacity-75">Total Crimes</p>
                <h3 className="fw-bold mb-0">{crimeCount.toLocaleString()}</h3>
              </div>
              <i className="fas fa-exclamation-triangle fa-2x opacity-25"></i>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-dark text-white p-3 rounded-4">
            <div className="d-flex justify-content-between">
              <div>
                <p className="mb-1 fw-bold opacity-75">Citizen Reports</p>
                <h3 className="fw-bold mb-0">{citizenReports.length}</h3>
              </div>
              <i className="fas fa-file-alt fa-2x opacity-25"></i>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-primary text-white p-3 rounded-4">
            <div className="d-flex justify-content-between">
              <div>
                <p className="mb-1 fw-bold opacity-75">Public Users</p>
                <h3 className="fw-bold mb-0">{registeredUsers.length}</h3>
              </div>
              <i className="fas fa-users fa-2x opacity-25"></i>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-white text-dark p-3 rounded-4 border">
            <div className="d-flex justify-content-between">
              <div>
                <p className="mb-1 fw-bold text-muted">Active Officers</p>
                <h3 className="fw-bold mb-0">{lawEnforcementUsers.length}</h3>
              </div>
              <i className="fas fa-shield-alt fa-2x text-danger opacity-25"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Registered Public Users Section */}
        {widgets.find(w => w.id === 'public-users')?.isVisible && (
          <div className="col-12">
            <div className="card dashboard-card border-0 shadow-sm">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold"><i className="fas fa-id-card me-2 text-primary"></i> Registered Public Users</h5>
                <span className="badge bg-primary-subtle text-primary border border-primary px-3">
                  {registeredUsers.length} Users Enrolled
                </span>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '80px' }}>Sr. No.</th>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Signup Time</th>
                        <th>District / Location</th>
                        <th style={{ width: '110px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registeredUsers.length > 0 ? registeredUsers.map((u, index) => (
                        <tr key={u.username + index}>
                          <td className="fw-bold text-muted">{index + 1}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                                {u.fullName ? u.fullName[0].toUpperCase() : 'U'}
                              </div>
                              <span className="fw-bold">{u.fullName}</span>
                            </div>
                          </td>
                          <td className="text-muted">{u.email}</td>
                          <td className="small">{formatDateTime(u.signupAt)}</td>
                          <td>
                            <span className="badge bg-light text-dark border px-2 py-1">{u.location || 'N/A'}</span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => {
                                if (!window.confirm(`Delete user: ${u.fullName || u.username}?`)) return;
                                const allUsers = JSON.parse(localStorage.getItem(USER_DB_KEY) || '[]');
                                const updated = allUsers.filter((x: any) => x.username !== u.username);
                                localStorage.setItem(USER_DB_KEY, JSON.stringify(updated));

                                const publicUsers = updated.filter((x: any) => x.role === UserRole.PUBLIC);
                                const lawUsers = updated.filter((x: any) => x.role === UserRole.LAW_ENFORCEMENT);
                                setRegisteredUsers(publicUsers);
                                setLawEnforcementUsers(lawUsers);
                              }}
                              title="Delete user"
                            >
                              <i className="fas fa-trash me-1" />Delete
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="text-center py-5 text-muted">
                            <i className="fas fa-users-slash fa-2x d-block mb-3 opacity-25"></i>
                            No public users have signed up yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Widgets */}
        {widgets.find(w => w.id === 'citizen-reports')?.isVisible && (
          <div className="col-12">
            <CitizenIntelligenceFeed 
              reports={citizenReports} 
              onUpdateStatus={updateReportStatus} 
              showManagement={false}
            />
          </div>
        )}

        {/* Crime Statistics moved to separate Analytics page */}
        {false && (
          <div className="col-lg-12">
            <div className="card dashboard-card border-0 shadow-sm">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold"><i className="fas fa-chart-line me-2 text-danger"></i> Crime Statistics Overview</h5>
                <span className="badge bg-danger">LIVE</span>
              </div>
              <div className="card-body">
                <CrimeStatsOverview />
              </div>
            </div>
          </div>
        )}

        {widgets.find(w => w.id === 'map-control')?.isVisible && (
          <div className="col-12">
            <div className="card dashboard-card">
              <div className="card-header bg-white py-3">
                 <h5 className="mb-0 fw-bold"><i className="fas fa-globe-americas me-2 text-info"></i> Global Incident Map Control</h5>
              </div>
              <div className="card-body p-0">
                <div className="w-100">
                  <h4 className="fw-bold">Global Incident Map (External Visualization)</h4>

                  <iframe
                    src="https://globalthreatmap.up.railway.app/"
                    width="100%"
                    height="400px"
                    style={{ border: "none", borderRadius: "8px" }}
                    title="Global Threat Map"
                  />

                  <p className="text-muted mt-2">
                    Data visualization provided by external GIS service.
                  </p>

                  <div className="mt-3 small text-muted">
                    <div>
                      Credit: <a href="https://github.com/unicodeveloper/globalthreatmap" target="_blank" rel="noreferrer">github.com/unicodeveloper/globalthreatmap</a>
                    </div>
                    <div>
                      Website: <a href="https://globalthreatmap.up.railway.app/" target="_blank" rel="noreferrer">https://globalthreatmap.up.railway.app/</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

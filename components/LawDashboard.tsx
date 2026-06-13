
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WidgetConfig, CitizenReport, ReportStatus } from '../types';
import CitizenIntelligenceFeed from './CitizenIntelligenceFeed';
import LawAuthorityInbox from './LawAuthorityInbox';


const REPORTS_DB_KEY = 'crimepredict_citizen_reports';

const LawDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    { id: 'crime-map', title: 'Interactive Crime Map', isVisible: true },
    { id: 'citizen-intel', title: 'Citizen Intelligence Feed', isVisible: true },
    { id: 'recent-reports', title: 'Case Reports', isVisible: true },
    { id: 'authorities-inbox', title: 'Authorities Inbox', isVisible: true },
  ]);


  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = () => {
    const savedReports = JSON.parse(localStorage.getItem(REPORTS_DB_KEY) || '[]');
    setCitizenReports(savedReports);
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

  // Filter active cases for the side panel
  const activeCases = citizenReports.filter(r => r.status === 'In Progress');

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-primary">Officer Command Center</h2>
          <p className="text-muted">Operational oversight and incident response</p>
        </div>
        
        <div className="d-flex gap-2">
          <button 
            className="btn btn-info shadow-sm fw-bold"
            onClick={() => navigate('/dashboard/law/analytics')}
          >
            <i className="fas fa-chart-line me-2"></i>Analytics
          </button>
          <div className="btn-group shadow-sm">
            <button className="btn btn-primary fw-bold px-4">
               <i className="fas fa-plus me-2"></i> New Incident
            </button>
            <button className="btn btn-outline-primary dropdown-toggle" type="button" data-bs-toggle="dropdown">
              <i className="fas fa-sliders me-1"></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow border-0 p-3">
               <h6 className="dropdown-header px-0 fw-bold">Toggle Dashboard View</h6>
             {widgets.map(w => (
                <li key={w.id} className="mb-2">
                  <div className="form-check form-switch">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      checked={w.isVisible} 
                      onChange={() => toggleWidget(w.id)}
                    />
                    <label className="form-check-label small fw-bold">{w.title}</label>
                  </div>
                </li>
             ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {widgets.find(w => w.id === 'crime-map')?.isVisible && (
          <div className="col-lg-8">
            <div className="card dashboard-card h-100">
              <div className="card-header bg-primary text-white py-3">
                <h5 className="mb-0 fw-bold"><i className="fas fa-map-pin me-2"></i> Real-time Incident Heatmap</h5>
              </div>
              <div className="card-body p-0 h-100">
                <div className="bg-light h-100" style={{ minHeight: '450px', position: 'relative', overflow: 'hidden' }}>
                  <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000" className="w-100 h-100 object-fit-cover opacity-50" alt="map" />
                  <div className="position-absolute top-50 start-50 translate-middle text-center">
                    <div className="spinner-grow text-primary" role="status"></div>
                    <p className="fw-bold mt-2 text-primary">Detecting Field Units...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="col-lg-4">
          {widgets.find(w => w.id === 'recent-reports')?.isVisible && (
            <div className="card dashboard-card border-0 shadow-sm">
              <div className="card-header bg-white py-3">
                 <h5 className="mb-0 fw-bold text-dark"><i className="fas fa-file-invoice me-2 text-muted"></i> Active Case Files</h5>
              </div>
              <div className="card-body p-0">
                 <div className="list-group list-group-flush">
                    {activeCases.length > 0 ? activeCases.map((item, i) => (
                      <div key={item.reportId} className="list-group-item py-3">
                         <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold">{i + 1}. {item.reportId}</span>
                            <span className="badge bg-primary-subtle text-primary">In Progress</span>
                         </div>
                         <p className="small text-muted mb-0">{item.crimeType} in {item.location}</p>
                      </div>
                    )) : (
                      <div className="p-4 text-center text-muted small">
                        <i className="fas fa-folder-open d-block mb-2 opacity-25 fa-2x"></i>
                        No active case files at this time.
                      </div>
                    )}
                 </div>
              </div>
            </div>
          )}
        </div>

        {widgets.find(w => w.id === 'citizen-intel')?.isVisible && (
          <div className="col-12">
            <CitizenIntelligenceFeed 
              reports={citizenReports} 
              onUpdateStatus={updateReportStatus} 
            />
          </div>
        )}

        {widgets.find(w => w.id === 'authorities-inbox')?.isVisible && (
          <div className="col-12">
            <LawAuthorityInbox />
          </div>
        )}
      </div>
    </div>
  );
};


export default LawDashboard;


import React from 'react';
import { CitizenReport, ReportStatus } from '../types';

interface CitizenIntelligenceFeedProps {
  reports: CitizenReport[];
  onUpdateStatus: (reportId: string, newStatus: ReportStatus) => void;
  showManagement?: boolean;
}

const CitizenIntelligenceFeed: React.FC<CitizenIntelligenceFeedProps> = ({ 
  reports, 
  onUpdateStatus,
  showManagement = true
}) => {
  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'In Progress': return 'bg-warning text-dark';
      case 'Completed': return 'bg-success text-white';
      default: return 'bg-info text-white';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  };

  return (
    <div className="card dashboard-card">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 className="mb-0 fw-bold">
          <i className="fas fa-users-viewfinder me-2 text-danger"></i> 
          Citizen Intelligence Feed
        </h5>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive" style={{ minHeight: '500px' }}>
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Report ID</th>
                <th>Reporter</th>
                <th>Type</th>
                <th>Location</th>
                <th>Photo</th>
                <th>Urgency</th>
                <th>Status</th>
                <th>Submitted At</th>
                {showManagement && <th>Manage Status</th>}
              </tr>
            </thead>
            <tbody>
              {reports.length > 0 ? reports.map(r => (
                <tr key={r.reportId}>
                  <td className="fw-bold">{r.reportId}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="avatar bg-danger text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                        {r.reporterName[0]}
                      </div>
                      <span className="small fw-bold">{r.reporterName}</span>
                    </div>
                  </td>
                  <td><span className="badge bg-secondary">{r.crimeType}</span></td>
                  <td>{r.location}</td>
                  <td>
                    {r.photo ? (
                      <img src={r.photo.startsWith('data:') ? r.photo : (r.photo.startsWith('http') ? r.photo : (window.location.origin + r.photo))} alt="evidence" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      <span className="text-muted small">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${r.urgency === 'High' ? 'bg-danger' : r.urgency === 'Medium' ? 'bg-warning text-dark' : 'bg-info'}`}>
                      {r.urgency}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="small text-muted">{formatDateTime(r.createdAt)}</td>
                  {showManagement && (
                    <td>
                      <div className="dropdown">
                        <button className="btn btn-sm btn-outline-dark dropdown-toggle" type="button" data-bs-toggle="dropdown">
                          Action
                        </button>
                        <ul className="dropdown-menu shadow border-0">
                          <li><button className="dropdown-item py-2" onClick={() => onUpdateStatus(r.reportId, 'In Progress')}><i className="fas fa-spinner me-2 text-warning"></i> In Progress</button></li>
                          <li><button className="dropdown-item py-2" onClick={() => onUpdateStatus(r.reportId, 'Completed')}><i className="fas fa-check-circle me-2 text-success"></i> Completed</button></li>
                          <li><hr className="dropdown-divider" /></li>
                          <li><button className="dropdown-item py-2" onClick={() => onUpdateStatus(r.reportId, 'Submitted')}><i className="fas fa-undo me-2 text-secondary"></i> Reset to Submitted</button></li>
                        </ul>
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={showManagement ? 8 : 7} className="text-center py-4 text-muted italic">No community reports available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CitizenIntelligenceFeed;

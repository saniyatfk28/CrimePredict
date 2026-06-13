
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WidgetConfig, CitizenReport, UrgencyLevel, User, ReportStatus } from '../types';
import CrimeRelatedNews from './CrimeRelatedNews';
import LawUserChat from '../src/components/LawUserChat';
import LawAuthorityInbox from './LawAuthorityInbox';





const DISTRICTS = [
  "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogura", "Brahmanbaria", "Chandpur", 
  "Chapainawabganj", "Chattogram", "Chuadanga", "Cox's Bazar", "Cumilla", "Dhaka", "Dinajpur", 
  "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore", 
  "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram", 
  "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", 
  "Moulvibazar", "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi", 
  "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", 
  "Rajbari", "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", 
  "Sunamganj", "Sylhet", "Tangail", "Thakurgaon"
];

const REPORTS_DB_KEY = 'crimepredict_citizen_reports';
const USER_DB_KEY = 'crimepredict_local_users_db';

const PublicDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    { id: 'safety-trends', title: 'Neighborhood Safety Trends', isVisible: true },
    { id: 'my-reports', title: 'My Submitted Reports', isVisible: true },
    { id: 'safety-tips', title: 'Daily Safety Tips', isVisible: true },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [userEmail, setUserEmail] = useState('');


  const [showAIChat, setShowAIChat] = useState(false);
  const [botMessages, setBotMessages] = useState<any[]>([]);
  const [botInput, setBotInput] = useState('');

  const [showAuthorityChat, setShowAuthorityChat] = useState(false);
  const [authorityChatMessages, setAuthorityChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  
  // Get current user from auth state
  const authData = JSON.parse(localStorage.getItem('crimepredict_auth') || '{}');
  const currentUser: User | null = authData.user || null;

  const [formData, setFormData] = useState({
    location: '',
    crimeType: 'Theft',
    incidentDateTime: '',
    description: '',
    photoFile: null as File | null,
    urgency: 'Medium' as UrgencyLevel
  });

  useEffect(() => {
    // Load existing reports
    loadReports();
    
    // Find user email from local user DB
    if (currentUser) {
      const storedUsers = JSON.parse(localStorage.getItem(USER_DB_KEY) || '[]');
      const userRecord = storedUsers.find((u: any) => u.username === currentUser.username);
      if (userRecord) setUserEmail(userRecord.email);
    }
  }, []);

  const loadReports = () => {
    const savedReports = JSON.parse(localStorage.getItem(REPORTS_DB_KEY) || '[]');
    if (currentUser) {
      const myReports = savedReports.filter((r: CitizenReport) => r.reporterUsername === currentUser.username);
      setReports(myReports);
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'In Progress': return 'bg-warning text-dark border-warning';
      case 'Completed': return 'bg-success text-white border-success';
      default: return 'bg-info text-white border-info';
    }
  };

  const toggleWidget = (id: string) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, isVisible: !w.isVisible } : w));
  };

  // Simple AI assistant (client-side rules)
  const sendBotMessage = () => {
    const message = botInput.trim();
    if (!message) return;

    const lower = message.toLowerCase();
    let reply = '';

    if (lower.includes('safe')) {
      reply = 'Avoid isolated areas and share your location with trusted contacts.';
    } else if (lower.includes('cyber')) {
      reply = 'Report cybercrime immediately and avoid sharing passwords. Preserve evidence (screenshots).';
    } else if (lower.includes('emergency')) {
      reply = 'Bangladesh Emergency Number: 999';
    } else {
      reply = 'Please stay alert and contact local authorities if needed. For how to report, select Report a Crime.';
    }

    setBotMessages(prev => [
      ...prev,
      { from: 'user', text: message },
      { from: 'bot', text: reply }
    ]);

    setBotInput('');
  };

  const sendMessage = async () => {
    const message = chatInput.trim();
    if (!message) return;

    try {
      const payload = {
        message,
        recipient_role: 'LAW',
        sender_name: currentUser?.fullName || currentUser?.username || 'Anonymous',
      };

      await fetch('/send-chat-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setAuthorityChatMessages([
        {
          sender_name: payload.sender_name,
          message,
          created_at: new Date().toISOString(),
          recipient_role: 'LAW',
        },
        ...authorityChatMessages,
      ]);
      setChatInput('');
    } catch (e) {
      console.error('Failed to send message', e);
    }
  };

  const shareLiveLocation = async () => {
    const statusEl = document.getElementById('locationStatus');
    if (statusEl) statusEl.innerHTML = 'Checking location permission...';


    if (!navigator.geolocation) {
      if (statusEl) statusEl.innerHTML = 'Geolocation not supported';
      return;
    }

    try {
      if ((navigator as any).permissions && (navigator as any).permissions.query) {
        const perm = await (navigator as any).permissions.query({ name: 'geolocation' });
        if (perm.state === 'denied') {
          if (statusEl) statusEl.innerHTML = 'Location permission denied.';
          alert('Location permission is denied. Enable location access in your browser settings.');
          return;
        }
      }
    } catch (e) {}

    if (statusEl) statusEl.innerHTML = 'Fetching live location...';

    const getPos = () => new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
    });

    try {
      const position = await getPos();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const locationLink = `https://maps.google.com/?q=${latitude},${longitude}`;

      const response = await fetch('/update-live-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ latitude, longitude, locationLink, email: userEmail })
      });

      if (response.ok) {
        if (statusEl) statusEl.innerHTML = 'Live location shared successfully';
        window.open(locationLink, '_blank');
      } else {
        if (statusEl) statusEl.innerHTML = 'Location sharing failed (server error)';
      }
    } catch (err: any) {
      if (!statusEl) return;

      if (err.code === 1) statusEl.innerHTML = 'Permission denied';
      else if (err.code === 2) statusEl.innerHTML = 'Position unavailable';
      else if (err.code === 3) statusEl.innerHTML = 'Location request timed out';
      else statusEl.innerHTML = 'Location sharing failed (network)';
    }
  };

  // Emergency SOS handler
  const triggerSOS = async () => {
    const phoneEl = document.getElementById('emergencyPhone') as HTMLInputElement | null;
    const phone = phoneEl?.value || '';

    if (!phone) {
      alert('Please enter emergency phone number');
      return;
    }

    // Play audio alarm (requires an <audio id="sosAlarm"> element in your JSX)
    const alarm = document.getElementById('sosAlarm') as HTMLAudioElement | null;
    try {
      alarm?.play();
    } catch (e) {
      /* ignore audio autoplay block */
    }

    if (!navigator.geolocation) {
      alert('Geolocation not supported in this browser');
      return;
    }

    // Check permission state first
    try {
      if ((navigator as any).permissions && (navigator as any).permissions.query) {
        const perm = await (navigator as any).permissions.query({ name: 'geolocation' });
        if (perm.state === 'denied') {
          alert('Location permission is denied. Please enable location for this site in your settings.');
          return;
        }
      }
    } catch (e) {
      // Ignore
    }

    setSosSending(true);

    const getPos = () => new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
    });

    try {
      const position = await getPos();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const locationLink = `https://maps.google.com/?q=${latitude},${longitude}`;

      // Send payload to backend
      const response = await fetch('/trigger-sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, latitude, longitude, locationLink })
      });

      if (response.ok) {
        alert('🚨 Emergency SOS Sent Successfully');
        setShowEmergencyContacts(false);
      } else {
        alert('SOS failed (server error)');
      }
    } catch (err: any) {
      if (err && err.code === 1) {
        alert('Please allow location access for this site in your browser settings.');
      } else if (err && err.code === 3) {
        alert('Location request timed out. Try again.');
      } else {
        alert('Unable to obtain location.');
      }
    } finally {
      setSosSending(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    if (!currentUser) return;


    // If a photo file is attached, attempt to upload to backend, and also read as data URL for local storage fallback
    let photoDataUrl: string | undefined;
    const file = formData.photoFile as File | null;

    if (file) {
      // read as data URL
      photoDataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ''));
        fr.onerror = () => reject(new Error('Failed to read file'));
        fr.readAsDataURL(file);
      });

      // Try uploading to backend endpoint; ignore failure but prefer server storage if available
      try {
        const fd = new FormData();
        fd.append('image', file);
        fd.append('district', formData.location);
        fd.append('crime_type', formData.crimeType);
        fd.append('description', formData.description || '');

        const res = await fetch('/api/upload-crime-photo/', { method: 'POST', body: fd });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          // backend may not return image path; keep data URL as fallback
          if (json && json.image) {
            photoDataUrl = json.image;
          }
        }
      } catch (err) {
        console.info('Upload to backend failed, saved locally as data URL');
      }
    }

    const newReport: CitizenReport = {
      reportId: `REP-${Date.now()}`,
      reporterUsername: currentUser.username,
      reporterName: currentUser.fullName,
      reporterEmail: userEmail || 'N/A',
      location: formData.location,
      crimeType: formData.crimeType,
      incidentDateTime: formData.incidentDateTime,
      description: formData.description,
      urgency: formData.urgency,
      status: 'Submitted',
      createdAt: new Date().toISOString(),
      photo: photoDataUrl,
    };

    const allReports = JSON.parse(localStorage.getItem(REPORTS_DB_KEY) || '[]');
    const updatedReports = [newReport, ...allReports];
    localStorage.setItem(REPORTS_DB_KEY, JSON.stringify(updatedReports));

    setReports([newReport, ...reports]);
    setShowForm(false);
    setFormData({ location: '', crimeType: 'Theft', incidentDateTime: '', description: '', photoFile: null, urgency: 'Medium' });
    alert("Report submitted successfully! Thank you for your engagement.");
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-success">Citizen Safety Portal</h2>
          <p className="text-muted">Empowering the community with transparency</p>
        </div>
        
          <div className="d-flex gap-2">
          <button className="btn btn-success fw-bold shadow-sm" onClick={() => setShowForm(true)}>
            <i className="fas fa-file-signature me-2"></i> Report a Crime
          </button>


          <button
            className="btn btn-outline-secondary shadow-sm fw-bold"
            onClick={() => setShowAIChat(true)}
          >
            <i className="fas fa-robot me-2"></i>🤖 AI Safety Assistant
          </button>

          <button 
            className="btn btn-outline-primary shadow-sm fw-bold"
            onClick={() => setShowAuthorityChat(true)}
          >
            <i className="fas fa-comments me-2"></i>💬 Chat With Authorities
          </button>

          <button 
            className="btn btn-info shadow-sm fw-bold"
            onClick={() => navigate('/dashboard/public/analytics')}
          >
            <i className="fas fa-chart-line me-2"></i>Analytics
          </button>
          <div className="dropdown">
            <button className="btn btn-outline-success fw-bold shadow-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
               <i className="fas fa-th-large me-2"></i> Custom View
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow border-0 p-3">
               {widgets.map(w => (
                  <li key={w.id} className="mb-2">
                    <div className="form-check">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        checked={w.isVisible} 
                        onChange={() => toggleWidget(w.id)}
                        id={'pub-'+w.id}
                      />
                      <label className="form-check-label small fw-bold" htmlFor={'pub-'+w.id}>{w.title}</label>
                    </div>
                  </li>
               ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Reporting Modal / Overlay */}
      {showForm && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center" style={{ zIndex: 1050 }}>
          <div className="card shadow-lg border-0 w-100 mx-3" style={{ maxWidth: '600px', borderRadius: '20px' }}>
            <div className="card-header bg-success text-white py-3 border-0 d-flex justify-content-between align-items-center" style={{ borderRadius: '20px 20px 0 0' }}>
              <h5 className="mb-0 fw-bold"><i className="fas fa-mask me-2"></i> Submit Crime Report</h5>
              <button className="btn-close btn-close-white" onClick={() => setShowForm(false)}></button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleReportSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Reporter Name</label>
                    <input type="text" className="form-control bg-light" value={currentUser?.fullName || ''} disabled />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Email</label>
                    <input type="text" className="form-control bg-light" value={userEmail || 'N/A'} disabled />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold"><i className="fas fa-map-marker-alt me-1 text-success"></i> Location / District</label>
                    <select className="form-select" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required>
                      <option value="">Select District</option>
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold"><i className="fas fa-shield-alt me-1 text-success"></i> Crime Type</label>
                    <select className="form-select" value={formData.crimeType} onChange={e => setFormData({...formData, crimeType: e.target.value})}>
                      <option>Theft</option>
                      <option>Robbery</option>
                      <option>Assault</option>
                      <option>Vandalism</option>
                      <option>Harassment</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Date & Time</label>
                    <input type="datetime-local" className="form-control" value={formData.incidentDateTime} onChange={e => setFormData({...formData, incidentDateTime: e.target.value})} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Urgency Level</label>
                    <select className="form-select" value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value as UrgencyLevel})}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold">Description of Incident</label>
                    <textarea className="form-control" rows={3} placeholder="Describe exactly what happened..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required></textarea>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold">Photo Evidence (optional)</label>
                    <input type="file" accept="image/*" className="form-control" onChange={e => setFormData({...formData, photoFile: e.target.files?.[0] || null})} />
                  </div>
                </div>
                <div className="mt-4 border-top pt-3">
                  <p className="text-muted small italic mb-3">
                    <i className="fas fa-info-circle me-1"></i> Disclaimer: This is a community reporting tool for awareness and assistance.
                  </p>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-secondary w-100 fw-bold" onClick={() => setShowForm(false)}>Cancel</button>
                    <button type="submit" className="btn btn-success w-100 fw-bold">Submit Report</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Contacts Modal */}
      {showEmergencyContacts && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center" style={{ zIndex: 1060 }}>
          <div className="card shadow-lg border-0 w-100 mx-3" style={{ maxWidth: '500px', borderRadius: '20px' }}>
            <div className="card-header bg-danger text-white py-3 border-0 d-flex justify-content-between align-items-center" style={{ borderRadius: '20px 20px 0 0' }}>
              <h5 className="mb-0 fw-bold"><i className="fas fa-phone-volume me-2"></i> Emergency Contacts</h5>
              <button className="btn-close btn-close-white" onClick={() => setShowEmergencyContacts(false)}></button>
            </div>
            <div className="card-body p-4">
              <div className="mb-3">
                <label className="form-label small fw-bold">Emergency Contact Number</label>
                <div className="input-group">
                  <input
                    id="emergencyPhone"
                    type="tel"
                    className="form-control"
                    placeholder="Enter phone to notify (e.g. +8801XXXXXXXXX)"
                  />
                  <button
                    className="btn btn-danger"
                    disabled={sosSending}
                    onClick={triggerSOS}
                  >
                    {sosSending ? 'Sending...' : 'Send SOS'}
                  </button>
                </div>
                <small className="text-muted">This number will receive the alert (optional if you want to notify family/friends).</small>
              </div>

              {/* National Hotlines List */}
              <div className="list-group list-group-flush">

                <div className="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
                  <div>
                    <h6 className="mb-0 fw-bold"><i className="fas fa-star-of-life me-2 text-danger"></i> National Emergency Number</h6>
                  </div>
                  <span className="h5 mb-0 fw-bold text-danger">999</span>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
                  <div>
                    <h6 className="mb-0 fw-bold"><i className="fas fa-hand-holding-medical me-2 text-primary"></i> National Health Helpline</h6>
                  </div>
                  <span className="h5 mb-0 fw-bold text-primary">16263</span>
                </div>
                <div className="list-group-item d-flex flex-column px-0 py-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-bold"><i className="fas fa-heart me-2 text-info"></i> Mental Health Support (Kaan Pete Roi)</h6>
                    <span className="h6 mb-0 fw-bold text-info">+880 9639-67899</span>
                  </div>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
                  <div>
                    <h6 className="mb-0 fw-bold"><i className="fas fa-venus-mars me-2 text-warning"></i> Women & Children Helpline</h6>
                  </div>
                  <span className="h5 mb-0 fw-bold text-warning">109</span>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
                  <div>
                    <h6 className="mb-0 fw-bold"><i className="fas fa-child me-2 text-success"></i> Child Helpline</h6>
                  </div>
                  <span className="h5 mb-0 fw-bold text-success">1098</span>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
                  <div>
                    <h6 className="mb-0 fw-bold"><i className="fas fa-bolt me-2 text-warning"></i> Electricity Emergency / Complaints (REB)</h6>
                  </div>
                  <span className="h5 mb-0 fw-bold text-warning">16999</span>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
                  <div>
                    <h6 className="mb-0 fw-bold"><i className="fas fa-ship me-2 text-primary"></i> Coast Guard (Water Accidents)</h6>
                  </div>
                  <span className="h5 mb-0 fw-bold text-primary">16111</span>
                </div>
              </div>
              <div className="mt-4">
                <button className="btn btn-outline-secondary w-100 fw-bold rounded-3" onClick={() => setShowEmergencyContacts(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How to Report Crime Guide Modal */}
      {showGuide && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center" style={{ zIndex: 1060 }}>
          <div className="card shadow-lg border-0 w-100 mx-3" style={{ maxWidth: '550px', borderRadius: '20px' }}>
            <div className="card-header bg-success text-white py-3 border-0 d-flex justify-content-between align-items-center" style={{ borderRadius: '20px 20px 0 0' }}>
              <h5 className="mb-0 fw-bold"><i className="fas fa-book-open me-2"></i> How to Report Crime</h5>
              <button className="btn-close btn-close-white" onClick={() => setShowGuide(false)}></button>
            </div>
            <div className="card-body p-4">
              <div className="mb-4">
                <p className="text-muted small fw-bold text-uppercase mb-3">User Guide: 5 Simple Steps</p>
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex gap-3 align-items-start">
                    <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', fontWeight: 'bold' }}>1</div>
                    <div>
                      <h6 className="mb-1 fw-bold text-dark">Open Reporting Tool</h6>
                      <p className="small text-muted mb-0">Click on the <span className="text-success fw-bold">"Report a Crime"</span> button at the top of your dashboard.</p>
                    </div>
                  </div>
                  <div className="d-flex gap-3 align-items-start">
                    <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', fontWeight: 'bold' }}>2</div>
                    <div>
                      <h6 className="mb-1 fw-bold text-dark">Provide Incident Details</h6>
                      <p className="small text-muted mb-0">Fill in the required details: <span className="fw-bold">Location</span>, <span className="fw-bold">Crime Type</span>, <span className="fw-bold">Date & Time</span>, and a clear <span className="fw-bold">Description</span>.</p>
                    </div>
                  </div>
                  <div className="d-flex gap-3 align-items-start">
                    <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', fontWeight: 'bold' }}>3</div>
                    <div>
                      <h6 className="mb-1 fw-bold text-dark">Review Your Info</h6>
                      <p className="small text-muted mb-0">Carefully review the information you've entered to ensure accuracy and detail.</p>
                    </div>
                  </div>
                  <div className="d-flex gap-3 align-items-start">
                    <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', fontWeight: 'bold' }}>4</div>
                    <div>
                      <h6 className="mb-1 fw-bold text-dark">Submit to Law Enforcement</h6>
                      <p className="small text-muted mb-0">Once ready, click the <span className="text-success fw-bold">"Submit Report"</span> button to securely send your tip.</p>
                    </div>
                  </div>
                  <div className="d-flex gap-3 align-items-start">
                    <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', fontWeight: 'bold' }}>5</div>
                    <div>
                      <h6 className="mb-1 fw-bold text-dark">Monitor Progress</h6>
                      <p className="small text-muted mb-0">Check the <span className="fw-bold">"My Submitted Reports"</span> section later to view status updates from authorities.</p>
                    </div>
                  </div>
                </div>
              </div>
              <button className="btn btn-success w-100 fw-bold py-2 rounded-3" onClick={() => setShowGuide(false)}>Got it!</button>
            </div>
          </div>
        </div>
      )}

      <div className="row g-4">
        {widgets.find(w => w.id === 'my-reports')?.isVisible && (
          <div className="col-12">
            <div className="card dashboard-card">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold text-success"><i className="fas fa-list-check me-2"></i> My Submitted Reports</h5>
                <span className="badge bg-success-subtle text-success border border-success">{reports.length} Total</span>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Report ID</th>
                        <th>Type</th>
                        <th>Location</th>
                        <th>Date & Time</th>
                        <th>Urgency</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.length > 0 ? reports.map(r => (
                        <tr key={r.reportId}>
                          <td className="fw-bold">{r.reportId}</td>
                          <td><span className="badge bg-secondary">{r.crimeType}</span></td>
                          <td>{r.location}</td>
                          <td className="small">{new Date(r.incidentDateTime).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${r.urgency === 'High' ? 'bg-danger' : r.urgency === 'Medium' ? 'bg-warning text-dark' : 'bg-info'}`}>
                              {r.urgency}
                            </span>
                          </td>
                          <td>
                            <span className={`badge border ${getStatusBadge(r.status)}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="text-center py-5 text-muted">
                            <i className="fas fa-folder-open fa-2x d-block mb-2 opacity-25"></i>
                            No reports submitted yet.
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

        <div className="col-lg-8">
          {widgets.find(w => w.id === 'safety-trends')?.isVisible && (
            <div className="card dashboard-card h-100">
              <div className="card-header bg-white py-3 border-bottom-0">
                <h5 className="mb-0 fw-bold">
                  <i className="fas fa-chart-area me-2 text-success"></i> Monthly Safety Trends
                </h5>
              </div>
              <div className="card-body">
                <div className="bg-success bg-opacity-10 rounded-4 d-flex align-items-center justify-content-center" style={{ height: '350px' }}>
                  <div className="text-center">
                    <i className="fas fa-chart-line fa-5x mb-3 text-success opacity-25"></i>
                    <h5 className="fw-bold text-success">Community Safety Index: High</h5>
                    <p className="text-muted">Trend shows a 15% decrease in petty crime this month.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Related Crime News in a separate box */}
          <div className="mt-4">
            <CrimeRelatedNews />
          </div>
        </div>


        <div className="col-lg-4">
           {widgets.find(w => w.id === 'safety-tips')?.isVisible && (
            <div className="card dashboard-card border-0 shadow-sm bg-success text-white mb-4">
               <div className="card-body p-4">
                  <h5 className="fw-bold mb-3"><i className="fas fa-lightbulb me-2"></i> Safety Tip of the Day</h5>
                  <p className="mb-0">"Ensure your outdoor lighting is functional. A well-lit entryway is one of the best deterrents for home intrusion."</p>
               </div>
            </div>
          )}

          <div className="card dashboard-card h-100 border-0 shadow-sm">
             <div className="card-header bg-white py-3">
                <h5 className="mb-0 fw-bold"><i className="fas fa-info-circle me-2 text-muted"></i> Useful Links</h5>
             </div>
             <div className="card-body">
                <div className="d-grid gap-2">
                   <button 
                      className="btn btn-outline-secondary text-start p-3 border-dashed"
                      onClick={() => setShowEmergencyContacts(true)}
                   >
                     <i className="fas fa-phone-alt me-2"></i> Emergency Contacts
                   </button>

                   <div className="mb-2">
                      <button
                        className="btn btn-danger"
                        id="liveLocationBtn"
                        onClick={shareLiveLocation}
                      >
                        <i className="fas fa-map-marker-alt"></i>
                        &nbsp;Share Live Location Update
                      </button>
                      <p id="locationStatus" className="text-success mt-2"></p>
                   </div>

                   <button 
                      className="btn btn-outline-secondary text-start p-3 border-dashed"
                      onClick={() => setShowGuide(true)}
                   >
                      <i className="fas fa-file-alt me-2"></i> How to Report Crime
                   </button>
                   <button className="btn btn-outline-secondary text-start p-3 border-dashed"><i className="fas fa-map-marked me-2"></i> Local Police Precincts</button>
                </div>
             </div>
          </div>
        </div>
      </div>

      <audio id="sosAlarm" src="/static/sounds/alarm.mp3" preload="auto" />

      {/* Authority Chat Modal (WebSocket-based, real-time) */}
      {showAuthorityChat && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center"
          style={{ zIndex: 1060 }}
        >
          <div
            className="card shadow-lg border-0 w-100 mx-3"
            style={{ maxWidth: '640px', borderRadius: '12px' }}
          >
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">Chat With Authorities</h5>
              <button className="btn-close" onClick={() => setShowAuthorityChat(false)}></button>
            </div>

            <div className="card-body p-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <LawAuthorityInbox />
            </div>
          </div>
        </div>
      )}


      {showAIChat && (

        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center"
          style={{ zIndex: 1060 }}
        >

          <div
            className="card shadow-lg border-0 w-100 mx-3"
            style={{ maxWidth: '640px', borderRadius: '12px' }}
          >
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">AI Safety Assistant</h5>
              <button className="btn-close" onClick={() => setShowAIChat(false)}></button>
            </div>

            <div
              className="card-body p-3"
              style={{ maxHeight: '60vh', overflowY: 'auto' }}
            >
              <div id="botMessages">
                {botMessages.length === 0 && (
                  <div className="text-muted small">
                    Ask the assistant about safety, reporting, or emergencies.
                  </div>
                )}

                {botMessages.map((m, i) => (
                  <div
                    key={i}
                    className={`mb-2 ${m.from === 'bot' ? 'text-primary' : ''}`}
                  >
                    <div className="small fw-bold">
                      {m.from === 'bot' ? 'Assistant' : 'You'}
                    </div>
                    <div className="small">{m.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-footer bg-white d-flex gap-2">
              <input
                className="form-control"
                value={botInput}
                onChange={e => setBotInput(e.target.value)}
                placeholder="Ask: How can I stay safe?"
                onKeyDown={e => {
                  if (e.key === 'Enter') sendBotMessage();
                }}
              />

              <button className="btn btn-success" onClick={sendBotMessage}>
                Ask AI
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};


export default PublicDashboard;


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

const USER_DB_KEY = 'crimepredict_local_users_db';

interface SignUpPageProps {
  onSignUp: (user: { username: string, role: any, fullName: string }) => void;
}

const SignUpPage: React.FC<SignUpPageProps> = ({ onSignUp }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    location: '',
    agree: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!formData.location) {
      setError('Please select your district.');
      return;
    }

    if (!formData.agree) {
      setError('You must agree to the Terms & Safety Policy.');
      return;
    }

    setLoading(true);

    // Simulate file-based storage using LocalStorage
    setTimeout(() => {
      try {
        const storedUsers = JSON.parse(localStorage.getItem(USER_DB_KEY) || '[]');
        
        // Check for duplicate username
        if (storedUsers.some((u: any) => u.username === formData.username)) {
          setError('Username is already taken.');
          setLoading(false);
          return;
        }

        // Check for duplicate email
        if (storedUsers.some((u: any) => u.email === formData.email)) {
          setError('Email is already registered.');
          setLoading(false);
          return;
        }

        // Create the new user object with signup timestamp
        const newUser = {
          fullName: formData.fullName,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          location: formData.location,
          role: 'PUBLIC',
          signupAt: new Date().toISOString()
        };

        // Save to the "local database"
        storedUsers.push(newUser);
        localStorage.setItem(USER_DB_KEY, JSON.stringify(storedUsers));

        // Success flow
        onSignUp({ 
          username: formData.username, 
          role: 'PUBLIC', 
          fullName: formData.fullName 
        });
        navigate('/dashboard/public');
      } catch (err) {
        setError('Storage error. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="login-container bg-light py-5">
      <div className="card shadow-lg border-0" style={{ maxWidth: '600px', width: '100%', borderRadius: '20px' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <i className="fas fa-user-plus fa-3x text-success mb-3"></i>
            <h2 className="fw-bold text-success">Join CrimePredict</h2>
            <p className="text-muted">Register your local citizen account safely.</p>
          </div>

          {error && <div className="alert alert-danger py-2 small text-center">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-bold small">Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Tanvir Ahmed"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold small">Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div className="col-12">
                <label className="form-label fw-bold small">Username</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="unique_handle"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold small">Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold small">Confirm Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  required
                />
              </div>
              <div className="col-12">
                <label className="form-label fw-bold small">Location / District</label>
                <select 
                  className="form-select"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  required
                >
                  <option value="">-- Select Your District --</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="col-12">
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="agreeCheck" 
                    checked={formData.agree}
                    onChange={(e) => setFormData({...formData, agree: e.target.checked})}
                  />
                  <label className="form-check-label small text-muted" htmlFor="agreeCheck">
                    I agree to the <span className="text-success fw-bold">Terms & Safety Policy</span>.
                  </label>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-success w-100 py-3 fw-bold shadow-sm mt-4 rounded-3"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Complete Registration'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button 
              className="btn btn-link text-decoration-none text-muted btn-sm"
              onClick={() => navigate('/public/auth-choice')}
            >
              <i className="fas fa-arrow-left me-1"></i> Back to Choice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;

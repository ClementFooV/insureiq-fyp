import React, { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../../utils/auth';
import '../../styles/ProfileSetup.css';

function ProfileSetup() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const passwordRules = [
    { id: 'length',  label: 'At least 8 characters',         test: (p) => p.length >= 8 },
    { id: 'upper',   label: 'At least one uppercase letter',  test: (p) => /[A-Z]/.test(p) },
    { id: 'lower',   label: 'At least one lowercase letter',  test: (p) => /[a-z]/.test(p) },
    { id: 'number',  label: 'At least one number',            test: (p) => /[0-9]/.test(p) },
    { id: 'special', label: 'At least one special character', test: (p) => /[\W_]/.test(p) }
  ];
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    employment_status: '',
    monthly_income: 0,
    savings: 0,
    num_dependents: 0,
    total_liabilities: 0,
    health_status: '',
    smoker: false
  });

  // Pre-fill form if profile already exists
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setFormData({
            age: data.profile.age || '',
            gender: data.profile.gender || '',
            employment_status: data.profile.employment_status || '',
            monthly_income: data.profile.monthly_income ?? 0,
            savings: data.profile.savings ?? 0,
            num_dependents: data.profile.num_dependents ?? 0,
            total_liabilities: data.profile.total_liabilities ?? 0,
            health_status: data.profile.health_status || '',
            smoker: data.profile.smoker === 1
          });
        }
      } catch (err) {
        // No profile yet — that's fine, form stays empty
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
    if (error) setError('');
  };

  const handleToggle = () => {
    setFormData(prev => ({ ...prev, smoker: !prev.smoker }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    const failedRules = passwordRules.filter(r => !r.test(pwForm.newPassword));
    if (failedRules.length > 0) return setPwError('New password does not meet the requirements below.');
    if (pwForm.newPassword !== pwForm.confirmPassword) return setPwError('Passwords do not match.');
    setPwLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      });
      const data = await res.json();
      if (!res.ok) return setPwError(data.message || 'Failed to change password.');
      setPwSuccess('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      setPwError('Network error.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (!formData.age || !formData.gender || !formData.employment_status || !formData.health_status) {
      return setError('Please fill in all required fields.');
    }
    if (formData.age < 18 || formData.age > 100) {
      return setError('Age must be between 18 and 100.');
    }
    if (formData.monthly_income < 0) {
      return setError('Monthly income cannot be negative.');
    }

    setIsLoading(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save profile');

      setSuccess('Profile saved successfully! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: '600', cursor: 'pointer', padding: '0 0 12px 0', fontFamily: 'inherit' }}
          >
            ← Back
          </button>
          <h1 className="profile-title">Setup Your Profile</h1>
          <p className="profile-subtitle">Tell us about yourself so we can assess your insurance needs</p>
        </div>

        {error && <div className="profile-error">{error}</div>}
        {success && <div className="profile-success">{success}</div>}

        <form className="profile-form" onSubmit={handleSubmit}>

          {/* ---- Section 1: Personal Info ---- */}
          <div className="form-section">
            <h2 className="section-label">
              <span className="section-icon">👤</span>
              Personal Information
            </h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="age">Age *</label>
                <input type="number" id="age" name="age" className="form-input"
                  placeholder="e.g. 28" min="18" max="100" value={formData.age} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="gender">Gender *</label>
                <select id="gender" name="gender" className="form-input" value={formData.gender} onChange={handleChange} required>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* ---- Section 2: Financial Info ---- */}
          <div className="form-section">
            <h2 className="section-label">
              <span className="section-icon">💼</span>
              Financial Information
            </h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="employment_status">Employment Status *</label>
                <select id="employment_status" name="employment_status" className="form-input" value={formData.employment_status} onChange={handleChange} required>
                  <option value="">Select status</option>
                  <option value="Employed">Employed</option>
                  <option value="Part-time/Contract">Part-time / Contract</option>
                  <option value="Self-employed">Self-employed</option>
                  <option value="Student">Student</option>
                  <option value="Retired">Retired</option>
                  <option value="Unemployed">Unemployed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="monthly_income">Monthly Income (RM)</label>
                <input type="number" id="monthly_income" name="monthly_income" className="form-input"
                  placeholder="e.g. 5000" min="0" step="100" value={formData.monthly_income} onChange={handleChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="savings">Total Liquid Savings (RM)</label>
                <input type="number" id="savings" name="savings" className="form-input"
                  placeholder="e.g. 15000" min="0" step="100" value={formData.savings} onChange={handleChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="num_dependents">Number of Dependents</label>
                <input type="number" id="num_dependents" name="num_dependents" className="form-input"
                  placeholder="e.g. 2" min="0" value={formData.num_dependents} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="total_liabilities">Total Liabilities (RM)</label>
                <input type="number" id="total_liabilities" name="total_liabilities" className="form-input"
                  placeholder="e.g. 150000" min="0" step="1000" value={formData.total_liabilities} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* ---- Section 3: Health Info ---- */}
          <div className="form-section">
            <h2 className="section-label">
              <span className="section-icon">🏥</span>
              Health Information
            </h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="health_status">Health Status *</label>
                <select id="health_status" name="health_status" className="form-input" value={formData.health_status} onChange={handleChange} required>
                  <option value="">Select status</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Smoker</label>
                <div className="toggle-wrapper" onClick={handleToggle}>
                  <div className={`toggle-track ${formData.smoker ? 'active' : ''}`}>
                    <div className="toggle-thumb" />
                  </div>
                  <span className="toggle-label">{formData.smoker ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Profile & Continue'}
          </button>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="profile-card" style={{ marginTop: '24px' }}>
        <div className="profile-header" style={{ paddingBottom: '0' }}>
          <h1 className="profile-title" style={{ fontSize: '1.25rem' }}>Change Password</h1>
          <p className="profile-subtitle">Update your account password below.</p>
        </div>

        {pwError && <div className="profile-error">{pwError}</div>}
        {pwSuccess && <div className="profile-success">{pwSuccess}</div>}

        <form className="profile-form" onSubmit={handleChangePassword}>
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="currentPassword">Current Password</label>
                <input type="password" id="currentPassword" className="form-input" required
                  value={pwForm.currentPassword} onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
                  placeholder="Enter current password" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="newPassword">New Password</label>
                <input type="password" id="newPassword" className="form-input" required
                  value={pwForm.newPassword} onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Min. 8 characters" />
                {pwForm.newPassword.length > 0 && (
                  <ul style={{ listStyle: 'none', margin: '8px 0 0 0', padding: 0, fontSize: '12px' }}>
                    {passwordRules.map(rule => (
                      <li key={rule.id} style={{ color: rule.test(pwForm.newPassword) ? '#22c55e' : '#ef4444', marginBottom: '3px' }}>
                        {rule.test(pwForm.newPassword) ? '✓' : '✕'} {rule.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">Confirm New Password</label>
                <input type="password" id="confirmPassword" className="form-input" required
                  value={pwForm.confirmPassword} onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Repeat new password" />
              </div>
            </div>
          </div>
          <button type="submit" className="submit-btn" disabled={pwLoading}
            style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
            {pwLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfileSetup;

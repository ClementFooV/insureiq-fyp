import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../styles/Login.css';
import API_BASE from '../config';

const passwordRules = [
  { id: 'length',  label: 'At least 8 characters',         test: (p) => p.length >= 8 },
  { id: 'upper',   label: 'At least one uppercase letter',  test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'At least one lowercase letter',  test: (p) => /[a-z]/.test(p) },
  { id: 'number',  label: 'At least one number',            test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'At least one special character', test: (p) => /[\W_]/.test(p) }
];

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-form-panel" style={{ margin: '0 auto' }}>
          <div className="login-card">
            <div className="login-header">
              <h1 className="login-title">Invalid Reset Link</h1>
              <p className="login-subtitle">This password reset link is invalid or has expired.</p>
            </div>
            <button className="submit-btn" onClick={() => navigate('/login')}>Go to Login</button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');

    const failedRules = passwordRules.filter(r => !r.test(password));
    if (failedRules.length > 0) {
      return setError('Password does not meet the requirements below.');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const EyeIcon = ({ open }) => open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );

  return (
    <div className="login-container">
      <div className="login-form-panel" style={{ margin: '0 auto' }}>
        <div className="login-card">
          <div className="login-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span style={{ fontWeight: '700', fontSize: '18px', color: '#0f172a' }}>InsureIQ</span>
            </div>
            <h1 className="login-title">Set New Password</h1>
            <p className="login-subtitle">Enter your new password below.</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          {success ? (
            <div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '14px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' }}>
                {success}
              </div>
              <button className="submit-btn" onClick={() => navigate('/login')}>Go to Login</button>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="newPassword">New Password</label>
                <div className="password-input-wrapper">
                  <input type={showPassword ? "text" : "password"} id="newPassword"
                    className="form-input" placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} required />
                  <button type="button" className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}>
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {password.length > 0 && (
                  <ul style={{ listStyle: 'none', margin: '8px 0 0 0', padding: 0, fontSize: '12px' }}>
                    {passwordRules.map(rule => (
                      <li key={rule.id} style={{ color: rule.test(password) ? '#22c55e' : '#ef4444', marginBottom: '3px' }}>
                        {rule.test(password) ? '✓' : '✕'} {rule.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirmNewPassword">Confirm Password</label>
                <div className="password-input-wrapper">
                  <input type={showPassword ? "text" : "password"} id="confirmNewPassword"
                    className="form-input" placeholder="••••••••" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} required />
                  <button type="button" className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}>
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;

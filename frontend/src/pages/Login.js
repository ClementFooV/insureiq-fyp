import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import '../styles/Login.css';
import API_BASE from '../config';

const GOOGLE_CLIENT_ID = "129871671641-q31cb5f5ds21m6rm1p8f45u4bdiglu0m.apps.googleusercontent.com";

const passwordRules = [
  { id: 'length',    label: 'At least 8 characters',          test: (p) => p.length >= 8 },
  { id: 'upper',     label: 'At least one uppercase letter',   test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',     label: 'At least one lowercase letter',   test: (p) => /[a-z]/.test(p) },
  { id: 'number',    label: 'At least one number',             test: (p) => /[0-9]/.test(p) },
  { id: 'special',   label: 'At least one special character',  test: (p) => /[\W_]/.test(p) }
];

// Inner component — must be a CHILD of GoogleOAuthProvider to use the hook
function LoginForm() {
  const navigate = useNavigate();
  const [view, setView] = useState('login'); // 'login' | 'register' | 'forgot'
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');

    if (view === 'register') {
      const failedRules = passwordRules.filter(r => !r.test(formData.password));
      if (failedRules.length > 0) {
        return setError('Password does not meet the requirements below.');
      }
      if (formData.password !== formData.confirmPassword) {
        return setError('Passwords do not match');
      }
    }

    setIsLoading(true);
    const endpoint = view === 'login' ? '/api/login' : '/api/register';
    const bodyArgs = view === 'login'
      ? { email: formData.email, password: formData.password }
      : { name: formData.name, email: formData.email, password: formData.password };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyArgs)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Something went wrong');

      if (view === 'login') {
        localStorage.setItem('token', data.token);
        const role = data.user?.role || 'individual';
        if (role === 'admin') navigate('/admin/dashboard');
        else if (role === 'provider') navigate('/provider/dashboard');
        else navigate('/dashboard');
      } else {
        setView('login');
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        setRegisterSuccess('Registration successful! Please login.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setForgotSuccess('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setForgotSuccess(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Google Auth Failed');

      localStorage.setItem('token', data.token);
      const role = data.user?.role || 'individual';
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'provider') navigate('/provider/dashboard');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message);
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
      {/* Left brand panel */}
      <div className="login-brand-panel">
        <div className="brand-logo-row" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'inline-flex' }} title="Return to Home">
          <div className="brand-icon">
            <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="brand-name">InsureIQ</span>
        </div>
        <h2 className="brand-headline">
          Smart insurance<br /><span>decisions start here.</span>
        </h2>
        <p className="brand-sub">
          Get a personalised risk score and matched insurance plans in minutes. Built for Malaysians.
        </p>
        <ul className="brand-features">
          <li>Personalised multi-factor risk assessment</li>
          <li>Smart plan matching engine</li>
          <li>5 coverage types analysed</li>
          <li>100% free to use</li>
        </ul>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">
            {view === 'login' ? 'Welcome back' : view === 'register' ? 'Create an account' : 'Reset your password'}
          </h1>
          <p className="login-subtitle">
            {view === 'login' ? 'Sign in to access your dashboard' : view === 'register' ? 'Sign up to get started for free' : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {registerSuccess && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '12px' }}>{registerSuccess}</div>}
        {error && <div className="error-message">{error}</div>}

        {view === 'forgot' ? (
          <>
            {forgotSuccess ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '14px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' }}>
                {forgotSuccess}
              </div>
            ) : (
              <form className="login-form" onSubmit={handleForgotPassword}>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgotEmail">Email Address</label>
                  <input type="email" id="forgotEmail" className="form-input" placeholder="you@example.com"
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                </div>
                <button type="submit" className="submit-btn" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}
            <div className="toggle-mode" style={{ marginTop: '16px' }}>
              <button type="button" className="toggle-btn"
                onClick={() => { setView('login'); setError(''); setForgotSuccess(''); }}>
                Back to login
              </button>
            </div>
          </>
        ) : (
          <>
            <form className="login-form" onSubmit={handleSubmit}>
              {view === 'register' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="name">Full Name</label>
                  <input type="text" id="name" name="name" className="form-input" placeholder="John Doe"
                    value={formData.name} onChange={handleChange} required />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <input type="email" id="email" name="email" className="form-input" placeholder="you@example.com"
                  value={formData.email} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input type={showPassword ? "text" : "password"} id="password" name="password"
                    className="form-input" placeholder="••••••••" value={formData.password}
                    onChange={handleChange} required />
                  <button type="button" className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}>
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {view === 'register' && formData.password.length > 0 && (
                  <ul style={{ listStyle: 'none', margin: '8px 0 0 0', padding: 0, fontSize: '12px' }}>
                    {passwordRules.map(rule => (
                      <li key={rule.id} style={{ color: rule.test(formData.password) ? '#22c55e' : '#ef4444', marginBottom: '3px' }}>
                        {rule.test(formData.password) ? '✓' : '✕'} {rule.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {view === 'login' && (
                <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '8px' }}>
                  <button type="button" className="toggle-btn" style={{ fontSize: '13px' }}
                    onClick={() => { setView('forgot'); setError(''); }}>
                    Forgot your password?
                  </button>
                </div>
              )}

              {view === 'register' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                  <div className="password-input-wrapper">
                    <input type={showPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword"
                      className="form-input" placeholder="••••••••" value={formData.confirmPassword}
                      onChange={handleChange} required />
                    <button type="button" className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}>
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Processing...' : (view === 'login' ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <div className="divider"><span>or</span></div>

            <div className="google-btn-wrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Sign In failed')}
                width="100%"
              />
            </div>

            <div className="toggle-mode">
              {view === 'login' ? "Don't have an account?" : "Already have an account?"}
              <button type="button" className="toggle-btn"
                onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); }}>
                {view === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

// Outer component — wraps everything in the Provider
function Login() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginForm />
    </GoogleOAuthProvider>
  );
}

export default Login;

import React from 'react';
import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontFamily: 'inherit' }}>
      <div style={{ textAlign: 'center', maxWidth: '440px', padding: '40px 24px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', boxShadow: '0 4px 16px rgba(79,70,229,0.3)' }}>
          <svg width="36" height="36" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 style={{ fontSize: '72px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', lineHeight: 1 }}>404</h1>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>Page not found</h2>
        <p style={{ color: '#64748b', fontSize: '15px', margin: '0 0 28px 0', lineHeight: 1.6 }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => navigate(-1)}
            style={{ padding: '12px 24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#475569', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            Go Back
          </button>
          <button onClick={() => navigate('/')}
            style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}>
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFound;

import React from 'react';

/**
 * LoadingSpinner — reusable animated loading indicator.
 * Props:
 *  - message: string (optional, default "Loading...")
 *  - size: 'sm' | 'md' | 'lg' (optional, default 'md')
 */
function LoadingSpinner({ message = 'Loading...', size = 'md' }) {
  const sizes = {
    sm: { spinner: 24, border: 3, fontSize: '13px', gap: '10px' },
    md: { spinner: 36, border: 3.5, fontSize: '14px', gap: '14px' },
    lg: { spinner: 48, border: 4, fontSize: '16px', gap: '18px' }
  };
  const s = sizes[size] || sizes.md;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: s.gap }}>
      <div style={{
        width: s.spinner,
        height: s.spinner,
        border: `${s.border}px solid #e2e8f0`,
        borderTop: `${s.border}px solid #4f46e5`,
        borderRadius: '50%',
        animation: 'insureiq-spin 0.8s linear infinite'
      }} />
      {message && <p style={{ color: '#94a3b8', fontSize: s.fontSize, margin: 0, fontWeight: '500' }}>{message}</p>}
      <style>{`@keyframes insureiq-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default LoadingSpinner;

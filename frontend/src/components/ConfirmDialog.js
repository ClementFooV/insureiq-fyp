import React from 'react';

/**
 * ConfirmDialog — modal confirmation before destructive actions.
 * Props:
 *  - open: boolean
 *  - title: string
 *  - message: string
 *  - confirmLabel: string (default "Confirm")
 *  - cancelLabel: string (default "Cancel")
 *  - variant: 'danger' | 'warning' | 'info' (default 'danger')
 *  - onConfirm: () => void
 *  - onCancel: () => void
 */
function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', onConfirm, onCancel }) {
  if (!open) return null;

  const colors = {
    danger:  { bg: '#fef2f2', border: '#fecaca', btn: '#dc2626', btnHover: '#b91c1c', icon: '⚠️' },
    warning: { bg: '#fffbeb', border: '#fde68a', btn: '#d97706', btnHover: '#b45309', icon: '⚠️' },
    info:    { bg: '#eef2ff', border: '#c7d2fe', btn: '#4f46e5', btnHover: '#4338ca', icon: 'ℹ️' }
  };
  const c = colors[variant] || colors.danger;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
      zIndex: 5000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
    }} onClick={onCancel}>
      <div style={{
        background: '#ffffff', borderRadius: '16px', padding: '28px 32px', maxWidth: '420px', width: '100%',
        border: '1px solid #e2e8f0', boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
        animation: 'confirmFadeIn 0.15s ease-out'
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', background: c.bg,
            border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '18px', flexShrink: 0
          }}>{c.icon}</div>
          <div>
            <h3 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: '16px', fontWeight: '700' }}>{title}</h3>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{message}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '9px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0',
            borderRadius: '8px', color: '#475569', cursor: 'pointer', fontWeight: '600',
            fontFamily: 'inherit', fontSize: '14px'
          }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{
            padding: '9px 18px', background: c.btn, border: 'none',
            borderRadius: '8px', color: '#ffffff', cursor: 'pointer', fontWeight: '700',
            fontFamily: 'inherit', fontSize: '14px', boxShadow: `0 2px 8px ${c.btn}40`
          }}>{confirmLabel}</button>
        </div>
      </div>
      <style>{`@keyframes confirmFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

export default ConfirmDialog;

import React, { useState, useEffect } from 'react';
import API_BASE from '../../config';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';

const STATUS_STYLE = {
  pending:  { bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
  approved: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  rejected: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
};

const FORMAT_TYPE = (t) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function AdminClaims() {
  const token = getToken();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetch(`${API_BASE}/api/claims/admin/all`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setClaims(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter);
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleFilterChange = (f) => { setFilter(f); setCurrentPage(1); };

  const stats = {
    total: claims.length,
    pending: claims.filter(c => c.status === 'pending').length,
    approved: claims.filter(c => c.status === 'approved').length,
    rejected: claims.filter(c => c.status === 'rejected').length,
    totalSettled: claims.filter(c => c.settlement_amount).reduce((sum, c) => sum + Number(c.settlement_amount), 0),
  };

  return (
    <DashboardLayout role="admin" activePage="claims" pageTitle="Claims">
      <div className="dash-welcome">
        <h1>Claims Overview</h1>
        <p>Monitor all insurance claims across the platform.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Claims',   value: stats.total,    color: '#4f46e5' },
          { label: 'Pending',        value: stats.pending,  color: '#d97706' },
          { label: 'Approved',       value: stats.approved, color: '#16a34a' },
          { label: 'Rejected',       value: stats.rejected, color: '#dc2626' },
          { label: 'Total Settled',  value: `RM ${stats.totalSettled.toLocaleString()}`, color: '#0369a1' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button key={f} onClick={() => handleFilterChange(f)}
            style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', textTransform: 'capitalize',
              color: filter === f ? '#4f46e5' : '#64748b',
              borderBottom: filter === f ? '2px solid #4f46e5' : '2px solid transparent', marginBottom: '-2px' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner message="Loading claims..." /> :
       filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#94a3b8' }}>No {filter !== 'all' ? filter : ''} claims found.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['#', 'Individual', 'Plan', 'Provider', 'Type', 'Claimed', 'Settlement', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: '700', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.map((claim, i) => {
                const s = STATUS_STYLE[claim.status] || STATUS_STYLE.pending;
                return (
                  <tr key={claim.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px 14px', color: '#94a3b8', fontWeight: '600' }}>{claim.id}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{claim.applicant_name}</div>
                      <div style={{ color: '#94a3b8', fontSize: '12px' }}>{claim.applicant_email}</div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#0f172a', fontWeight: '600' }}>{claim.plan_name}</td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{claim.provider_name}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                        {FORMAT_TYPE(claim.claim_type)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f172a' }}>RM {Number(claim.claimed_amount).toLocaleString()}</td>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: '#16a34a' }}>
                      {claim.settlement_amount ? `RM ${Number(claim.settlement_amount).toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'capitalize' }}>
                        {claim.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {new Date(claim.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          <span style={{ color: '#94a3b8', fontSize: '13px' }}>
            Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              style={{ padding: '7px 14px', background: '#f1f5f9', color: currentPage === 1 ? '#94a3b8' : '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
              Previous
            </button>
            <span style={{ color: '#475569', fontSize: '13px', padding: '7px 10px' }}>Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              style={{ padding: '7px 14px', background: '#f1f5f9', color: currentPage === totalPages ? '#94a3b8' : '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
              Next
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default AdminClaims;

import React, { useState, useEffect } from 'react';
import API_BASE from '../../config';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';
import { useNavigate } from 'react-router-dom';

const STATUS_STYLE = {
  pending:  { bg: '#fffbeb', border: '#fde68a', text: '#d97706', label: '⏳ Under Review' },
  approved: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', label: '✅ Approved' },
  rejected: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: '❌ Rejected' },
};

const FORMAT_TYPE = (t) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function MyClaims() {
  const token = getToken();
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering and Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetch(`${API_BASE}/api/claims/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
      .then(data => { setClaims(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [token]);

  // --- Filtering & Pagination Logic ---
  const filteredClaims = claims.filter(claim => {
    if (statusFilter !== 'all' && claim.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!claim.plan_name?.toLowerCase().includes(q) && !claim.provider_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage) || 1;
  const paginatedClaims = filteredClaims.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  return (
    <DashboardLayout role="individual" activePage="my-claims" pageTitle="My Claims">
      <div className="dash-welcome">
        <h1>My Claims</h1>
        <p>Track the status of your insurance claims.</p>
      </div>

      {loading ? <LoadingSpinner message="Loading your claims..." /> :
       error ? <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px' }}>{error}</div> :
       claims.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗂</div>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>No claims filed yet.</p>
          <button onClick={() => navigate('/my-applications')}
            style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit' }}>
            Go to My Applications
          </button>
        </div>
      ) : (
        <>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Search Claims</label>
              <input type="text" placeholder="Search by plan or provider..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ minWidth: '160px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Filter by Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: '#f8fafc', cursor: 'pointer', fontFamily: 'inherit' }}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {filteredClaims.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#94a3b8', margin: 0 }}>No claims match your current filters.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paginatedClaims.map(claim => {
            const s = STATUS_STYLE[claim.status] || STATUS_STYLE.pending;
            return (
              <div key={claim.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ color: '#4f46e5', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{claim.provider_name}</span>
                    <h3 style={{ margin: '4px 0 2px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{claim.plan_name}</h3>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>Type: <strong style={{ color: '#0f172a' }}>{FORMAT_TYPE(claim.claim_type)}</strong></span>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>Incident: <strong style={{ color: '#0f172a' }}>{new Date(claim.incident_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>Filed: <strong style={{ color: '#0f172a' }}>{new Date(claim.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Claimed</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>RM {Number(claim.claimed_amount).toLocaleString()}</div>
                    </div>
                    {claim.settlement_amount && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Settlement</div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#16a34a' }}>RM {Number(claim.settlement_amount).toLocaleString()}</div>
                      </div>
                    )}
                    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                      {s.label}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: '#475569', borderLeft: '3px solid #e2e8f0' }}>
                  {claim.description}
                </div>

                {claim.provider_notes && (
                  <div style={{ marginTop: '10px', padding: '10px 14px', background: s.bg, borderRadius: '8px', borderLeft: `3px solid ${s.text}` }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                      <strong style={{ color: '#0f172a' }}>Provider Note:</strong> {claim.provider_notes}
                    </p>
                  </div>
                )}

                {claim.documents && (() => {
                  const docs = typeof claim.documents === 'string' ? JSON.parse(claim.documents) : claim.documents;
                  return docs.length > 0 ? (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Submitted Documents</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {docs.map((doc, i) => (
                          <a key={i} href={`${API_BASE}/uploads/claims/${doc.filename}`} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', fontSize: '12px', color: '#0369a1', textDecoration: 'none', fontWeight: '600' }}>
                            📄 {doc.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            );
          })}
        </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', background: currentPage === 1 ? '#f8fafc' : '#ffffff', color: currentPage === 1 ? '#94a3b8' : '#0f172a', borderRadius: '8px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600' }}>
              Previous
            </button>
            <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', background: currentPage === totalPages ? '#f8fafc' : '#ffffff', color: currentPage === totalPages ? '#94a3b8' : '#0f172a', borderRadius: '8px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600' }}>
              Next
            </button>
          </div>
        )}
      </>
      )}
    </DashboardLayout>
  );
}

export default MyClaims;

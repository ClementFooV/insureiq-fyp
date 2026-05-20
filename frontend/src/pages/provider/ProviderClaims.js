import React, { useState, useEffect, useCallback } from 'react';
import API_BASE from '../../config';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';

const STATUS_STYLE = {
  pending:  { bg: '#fffbeb', border: '#fde68a', text: '#d97706', label: '⏳ Pending' },
  approved: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', label: '✅ Approved' },
  rejected: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: '❌ Rejected' },
};

const FORMAT_TYPE = (t) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function ProviderClaims() {
  const token = getToken();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [actionForm, setActionForm] = useState({}); // { [claimId]: { settlement_amount, provider_notes } }
  const [processing, setProcessing] = useState(null);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Filtering and Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3500);
  };

  const fetchClaims = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/claims/provider`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setClaims(data);
    } catch { showMsg('Failed to load claims.', 'error'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  const handleAction = async (claim, status) => {
    const form = actionForm[claim.id] || {};
    if (status === 'approved' && (!form.settlement_amount || Number(form.settlement_amount) <= 0)) {
      return showMsg('Enter a settlement amount to approve.', 'error');
    }
    if (status === 'approved' && Number(form.settlement_amount) > Number(claim.coverage_amount)) {
      return showMsg(`Settlement cannot exceed plan coverage of RM${Number(claim.coverage_amount).toLocaleString()}.`, 'error');
    }
    if (!window.confirm(`${status === 'approved' ? 'Approve' : 'Reject'} this claim?`)) return;

    setProcessing(claim.id);
    try {
      const res = await fetch(`${API_BASE}/api/claims/${claim.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, settlement_amount: form.settlement_amount || null, provider_notes: form.provider_notes || null })
      });
      const data = await res.json();
      if (!res.ok) return showMsg(data.message || 'Failed.', 'error');
      showMsg(`Claim ${status} successfully.`);
      fetchClaims();
    } catch { showMsg('Network error.', 'error'); }
    finally { setProcessing(null); }
  };

  const filteredClaims = claims.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.applicant_name?.toLowerCase().includes(q) && !c.claim_type?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage) || 1;
  const paginatedClaims = filteredClaims.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filter]);

  return (
    <DashboardLayout role="provider" activePage="claims" pageTitle="Claims">
      <div className="dash-welcome">
        <h1>Claims Management</h1>
        <p>Review and process insurance claims filed by your applicants.</p>
      </div>

      {msg.text && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
          background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          color: msg.type === 'error' ? '#dc2626' : '#16a34a' }}>
          {msg.text}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0', marginBottom: '16px' }}>
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', textTransform: 'capitalize',
              color: filter === f ? '#4f46e5' : '#64748b',
              borderBottom: filter === f ? '2px solid #4f46e5' : '2px solid transparent', marginBottom: '-2px' }}>
            {f === 'all' ? `All (${claims.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${claims.filter(c => c.status === f).length})`}
          </button>
        ))}
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Search Claims</label>
          <input type="text" placeholder="Search by claimant name or type..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
      </div>

      {loading ? <LoadingSpinner message="Loading claims..." /> :
       filteredClaims.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗂</div>
          <p style={{ color: '#94a3b8' }}>No claims match your current filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
          {paginatedClaims.map(claim => {
            const s = STATUS_STYLE[claim.status] || STATUS_STYLE.pending;
            const form = actionForm[claim.id] || {};
            return (
              <div key={claim.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                {/* Card header */}
                <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{FORMAT_TYPE(claim.claim_type)}</span>
                    <h3 style={{ margin: '3px 0 0 0', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>{claim.plan_name}</h3>
                  </div>
                  <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                    {s.label}
                  </span>
                </div>

                {/* Card body */}
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Applicant info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    <div><span style={{ color: '#94a3b8' }}>Name</span><br /><strong style={{ color: '#0f172a' }}>{claim.applicant_name}</strong></div>
                    <div><span style={{ color: '#94a3b8' }}>Phone</span><br /><strong style={{ color: '#0f172a' }}>{claim.applicant_phone}</strong></div>
                    <div><span style={{ color: '#94a3b8' }}>Email</span><br /><strong style={{ color: '#0f172a' }}>{claim.applicant_email}</strong></div>
                    <div><span style={{ color: '#94a3b8' }}>Incident Date</span><br /><strong style={{ color: '#0f172a' }}>{new Date(claim.incident_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
                  </div>

                  {/* Amounts */}
                  <div style={{ display: 'flex', gap: '16px', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Claimed</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>RM {Number(claim.claimed_amount).toLocaleString()}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Plan Coverage</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#475569' }}>RM {Number(claim.coverage_amount).toLocaleString()}</div>
                    </div>
                    {claim.settlement_amount && (
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Settlement</div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>RM {Number(claim.settlement_amount).toLocaleString()}</div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div style={{ fontSize: '13px', color: '#475569', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #e2e8f0' }}>
                    {claim.description}
                  </div>

                  {/* Submitted documents */}
                  {claim.documents && (() => {
                    const docs = typeof claim.documents === 'string' ? JSON.parse(claim.documents) : claim.documents;
                    return docs.length > 0 ? (
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Submitted Documents</div>
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

                  {/* Risk profile expand */}
                  <button onClick={() => setExpandedId(prev => prev === claim.id ? null : claim.id)}
                    style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: '600', color: '#4f46e5', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    {expandedId === claim.id ? '▲ Hide Risk Profile' : '▼ View Applicant Risk Profile'}
                  </button>

                  {expandedId === claim.id && (
                    <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <span style={{ color: '#64748b' }}>Risk Level: </span>
                        <span style={{ fontWeight: '700', color: claim.risk_level === 'HIGH' ? '#dc2626' : claim.risk_level === 'MEDIUM' ? '#d97706' : '#16a34a' }}>{claim.risk_level}</span>
                        <span style={{ color: '#64748b' }}>Score: </span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{claim.total_score} / {claim.max_score || 240}</span>
                      </div>
                    </div>
                  )}

                  {/* Provider notes (settled) */}
                  {claim.provider_notes && (
                    <div style={{ padding: '10px 14px', background: s.bg, borderRadius: '8px', borderLeft: `3px solid ${s.text}`, fontSize: '13px', color: '#475569' }}>
                      <strong style={{ color: '#0f172a' }}>Your Note:</strong> {claim.provider_notes}
                    </div>
                  )}

                  {/* Actions (pending only) */}
                  {claim.status === 'pending' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Settlement Amount (RM)</label>
                        <input type="number" min="1" max={claim.coverage_amount} step="0.01"
                          placeholder={`Max RM${Number(claim.coverage_amount).toLocaleString()}`}
                          value={form.settlement_amount || ''}
                          onChange={e => setActionForm(p => ({ ...p, [claim.id]: { ...p[claim.id], settlement_amount: e.target.value } }))}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes (optional)</label>
                        <textarea rows={2} placeholder="Add notes for the claimant..."
                          value={form.provider_notes || ''}
                          onChange={e => setActionForm(p => ({ ...p, [claim.id]: { ...p[claim.id], provider_notes: e.target.value } }))}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleAction(claim, 'approved')} disabled={processing === claim.id}
                          style={{ flex: 1, padding: '9px', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {processing === claim.id ? 'Processing...' : '✓ Approve'}
                        </button>
                        <button onClick={() => handleAction(claim, 'rejected')} disabled={processing === claim.id}
                          style={{ flex: 1, padding: '9px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
    </DashboardLayout>
  );
}

export default ProviderClaims;

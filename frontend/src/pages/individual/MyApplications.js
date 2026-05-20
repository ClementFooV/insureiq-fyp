import React, { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';

const CLAIM_TYPES_BY_PLAN = {
  life:               [{ value: 'death',            label: 'Death' },
                       { value: 'disability',        label: 'Disability' }],
  medical:            [{ value: 'medical',           label: 'Medical' }],
  critical_illness:   [{ value: 'critical_illness',  label: 'Critical Illness' }],
  personal_accident:  [{ value: 'accident',          label: 'Accident' },
                       { value: 'disability',        label: 'Disability' },
                       { value: 'death',             label: 'Death' }],
  income_protection:  [{ value: 'disability',        label: 'Disability' },
                       { value: 'other',             label: 'Other' }],
};

const getClaimTypes = (insuranceType) =>
  CLAIM_TYPES_BY_PLAN[insuranceType] || [{ value: 'other', label: 'Other' }];

function MyApplications() {
  const navigate = useNavigate();
  const token = getToken();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [claimModal, setClaimModal] = useState(null); // holds the app object
  const [claimForm, setClaimForm] = useState({ claim_type: 'medical', incident_date: '', description: '', claimed_amount: '' });
  const [claimFiles, setClaimFiles] = useState([]);
  const [claimError, setClaimError] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState('');

  // Filtering and Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetch(`${API_BASE}/api/applications/my-applications`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load applications');
        return res.json();
      })
      .then(data => {
        setApps(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const openClaimModal = (app) => {
    const types = getClaimTypes(app.insurance_type);
    setClaimModal(app);
    setClaimForm({ claim_type: types[0].value, incident_date: '', description: '', claimed_amount: '' });
    setClaimFiles([]);
    setClaimError('');
    setClaimSuccess('');
  };

  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    setClaimError('');
    setClaimLoading(true);
    try {
      const formData = new FormData();
      formData.append('application_id', claimModal.id);
      Object.entries(claimForm).forEach(([k, v]) => formData.append(k, v));
      claimFiles.forEach(f => formData.append('documents', f));

      const res = await fetch(`${API_BASE}/api/claims`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) return setClaimError(data.message || 'Failed to submit claim.');
      setClaimSuccess('Claim submitted successfully!');
      setTimeout(() => { setClaimModal(null); navigate('/my-claims'); }, 1500);
    } catch { setClaimError('Network error.'); }
    finally { setClaimLoading(false); }
  };

  const handleCancelPolicy = async (id) => {
    if (!window.confirm('Cancel this policy? This cannot be undone and will end your coverage.')) return;
    setCancellingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/applications/${id}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok) setApps(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled', end_date: new Date().toISOString() } : a));
      else alert(d.message || 'Failed to cancel policy.');
    } catch { alert('Network error.'); }
    finally { setCancellingId(null); }
  };

  const handleWithdraw = async (id) => {
    if (!window.confirm('Withdraw this application? This cannot be undone.')) return;
    setWithdrawingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/applications/${id}/withdraw`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setApps(prev => prev.filter(a => a.id !== id));
      else { const d = await res.json(); alert(d.message || 'Failed to withdraw.'); }
    } catch { alert('Network error.'); }
    finally { setWithdrawingId(null); }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved':  return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' };
      case 'rejected':  return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' };
      case 'cancelled': return { bg: '#f8fafc', border: '#cbd5e1', text: '#64748b' };
      default:          return { bg: '#fffbeb', border: '#fde68a', text: '#d97706' };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved':  return '✅ Approved';
      case 'rejected':  return '❌ Rejected';
      case 'cancelled': return '🚫 Cancelled';
      default:          return '⏳ Under Review';
    }
  };

  const topbarActions = (
    <button onClick={() => navigate('/browse-plans')} style={{ padding: '0.45rem 1rem', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '0.825rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
      Browse More Plans
    </button>
  );

  // --- Filtering & Pagination Logic ---
  const filteredApps = apps.filter(app => {
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!app.plan_name.toLowerCase().includes(q) && !app.provider_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredApps.length / itemsPerPage) || 1;
  const paginatedApps = filteredApps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  return (
    <DashboardLayout role="individual" activePage="my-applications" pageTitle="My Applications" topbarActions={topbarActions}>
      <div className="dash-welcome">
        <h1>My Applications</h1>
        <p>Track the status of the insurance plans you've applied for.</p>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading your applications..." />
      ) : error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px' }}>{error}</div>
      ) : apps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>You haven't applied for any plans yet.</p>
          <button onClick={() => navigate('/browse-plans')} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit' }}>
            Find Your Perfect Match
          </button>
        </div>
      ) : (
        <>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Search Applications</label>
              <input type="text" placeholder="Search by plan or provider..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ minWidth: '160px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Filter by Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: '#f8fafc', cursor: 'pointer', fontFamily: 'inherit' }}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {filteredApps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#94a3b8', margin: 0 }}>No applications match your current filters.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paginatedApps.map(app => {
            const s = getStatusStyle(app.status);
            return (
              <div key={app.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <span style={{ color: '#4f46e5', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{app.provider_name}</span>
                    <h3 style={{ color: '#0f172a', margin: '4px 0 2px 0', fontSize: '16px', fontWeight: '700' }}>{app.plan_name}</h3>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                      Applied on {new Date(app.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Coverage</div>
                      <div style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700' }}>RM {Number(app.coverage_amount).toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Premium</div>
                      <div style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700' }}>RM {Number(app.premium_monthly).toLocaleString()}/mo</div>
                    </div>
                    <span style={{ background: s.bg, color: s.text, padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', display: 'inline-block', border: `1px solid ${s.border}` }}>
                      {getStatusLabel(app.status)}
                    </span>
                  </div>
                </div>

                {app.notes && (
                  <div style={{ marginTop: '14px', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', borderLeft: `3px solid ${s.text}` }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                      <strong style={{ color: '#0f172a' }}>Provider Note:</strong> {app.notes}
                    </p>
                  </div>
                )}

                {app.status === 'approved' && (app.start_date || app.end_date) && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '24px' }}>
                    {app.start_date && (
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Policy Start</div>
                        <div style={{ color: '#0f172a', fontSize: '13px', fontWeight: '600' }}>{new Date(app.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      </div>
                    )}
                    {app.end_date && (
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Policy Expires</div>
                        <div style={{ color: '#0f172a', fontSize: '13px', fontWeight: '600' }}>{new Date(app.end_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      </div>
                    )}
                  </div>
                )}

                {(app.status === 'pending' || app.status === 'approved') && (
                  <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    {app.status === 'approved' && (
                      <>
                        <button onClick={() => openClaimModal(app)}
                          style={{ padding: '7px 16px', background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.25)', borderRadius: '8px', color: '#4f46e5', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                          🗂 File a Claim
                        </button>
                        <button onClick={() => handleCancelPolicy(app.id)} disabled={cancellingId === app.id}
                          style={{ padding: '7px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#dc2626', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {cancellingId === app.id ? 'Cancelling...' : 'Cancel Policy'}
                        </button>
                      </>
                    )}
                    {app.status === 'pending' && (
                      <button onClick={() => handleWithdraw(app.id)} disabled={withdrawingId === app.id}
                        style={{ padding: '7px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#dc2626', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {withdrawingId === app.id ? 'Withdrawing...' : 'Withdraw Application'}
                      </button>
                    )}
                  </div>
                )}
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
      {/* Claim Modal */}
      {claimModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>File a Claim</h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>{claimModal.plan_name} — Coverage: RM {Number(claimModal.coverage_amount).toLocaleString()}</p>

            {claimError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>{claimError}</div>}
            {claimSuccess && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>{claimSuccess}</div>}

            <form onSubmit={handleSubmitClaim} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Claim Type</label>
                <select value={claimForm.claim_type} onChange={e => setClaimForm(p => ({ ...p, claim_type: e.target.value }))} required
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#0f172a', background: '#f8fafc', fontFamily: 'inherit' }}>
                  {getClaimTypes(claimModal.insurance_type).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Incident Date</label>
                <input type="date" required value={claimForm.incident_date} onChange={e => setClaimForm(p => ({ ...p, incident_date: e.target.value }))} max={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#0f172a', background: '#f8fafc', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Claimed Amount (RM)</label>
                <input type="number" required min="1" max={claimModal.coverage_amount} step="0.01" value={claimForm.claimed_amount} onChange={e => setClaimForm(p => ({ ...p, claimed_amount: e.target.value }))} placeholder="e.g. 5000"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#0f172a', background: '#f8fafc', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                <textarea required rows={3} value={claimForm.description} onChange={e => setClaimForm(p => ({ ...p, description: e.target.value }))} placeholder="Briefly describe what happened and why you are filing this claim..."
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#0f172a', background: '#f8fafc', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Supporting Documents <span style={{ fontWeight: '400', textTransform: 'none', color: '#94a3b8' }}>(optional — PDF, JPG, PNG, max 5 files, 5MB each)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: '2px dashed #e2e8f0', borderRadius: '8px', cursor: 'pointer', background: '#f8fafc' }}>
                  <span style={{ fontSize: '20px' }}>📎</span>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    {claimFiles.length === 0 ? 'Click to upload documents' : `${claimFiles.length} file(s) selected`}
                  </span>
                  <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                    onChange={e => {
                      const files = Array.from(e.target.files).slice(0, 5);
                      setClaimFiles(files);
                    }} />
                </label>
                {claimFiles.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {claimFiles.map((f, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '12px' }}>
                        <span style={{ color: '#0f172a' }}>📄 {f.name}</span>
                        <span style={{ color: '#94a3b8' }}>{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                    ))}
                    <button type="button" onClick={() => setClaimFiles([])}
                      style={{ alignSelf: 'flex-end', fontSize: '11px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setClaimModal(null)}
                  style={{ padding: '9px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button type="submit" disabled={claimLoading}
                  style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {claimLoading ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default MyApplications;

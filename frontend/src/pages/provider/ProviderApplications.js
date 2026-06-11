import React, { useState, useEffect, useCallback } from 'react';
import API_BASE from '../../config';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';

function ProviderApplications() {
  const token = getToken();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState({});
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' });

  const showActionMsg = (text, type = 'success') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg({ text: '', type: '' }), 3500);
  };

  // Filtering and Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const CATEGORY_MAX = { 'Age & Health': 60, 'Financial Resilience': 95, 'Insurance Gaps': 50, 'Lifestyle Risks': 40 };

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/applications/provider-queue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch applications.');
      const data = await res.json();
      setApps(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const handleUpdateStatus = async (id, status) => {
    try {
      setUpdatingId(id);
      const res = await fetch(`${API_BASE}/api/applications/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, notes: notes[id] || '' })
      });
      if (!res.ok) throw new Error('Failed to update status');
      showActionMsg(`Application ${status === 'approved' ? 'approved' : 'rejected'} successfully.`, 'success');
      setNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
      fetchApplications();
    } catch (err) {
      showActionMsg(err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const getRiskStyle = (level) => {
    if (level === 'HIGH') return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
    if (level === 'MEDIUM') return { color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
    return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
  };

  const getStatusStyle = (status) => {
    if (status === 'approved') return { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' };
    if (status === 'rejected') return { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' };
    return { bg: '#fffbeb', border: '#fde68a', color: '#d97706' };
  };

  // --- Filtering & Pagination Logic ---
  const filteredApps = apps.filter(app => {
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!app.plan_name?.toLowerCase().includes(q) && !app.applicant_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredApps.length / itemsPerPage) || 1;
  const paginatedApps = filteredApps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  return (
    <DashboardLayout role="provider" activePage="applications" pageTitle="Underwriting Queue">
          <div className="dash-welcome">
            <h1>Underwriting Queue</h1>
            <p>Review incoming prospect applications for your insurance products.</p>
          </div>

          {actionMsg.text && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', background: actionMsg.type === 'error' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${actionMsg.type === 'error' ? '#fecaca' : '#bbf7d0'}`, color: actionMsg.type === 'error' ? '#dc2626' : '#16a34a' }}>
              {actionMsg.text}
            </div>
          )}
          {loading ? (
            <LoadingSpinner message="Loading queue..." />
          ) : error ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px' }}>{error}</div>
          ) : apps.length === 0 ? (
            <div style={{ padding: '48px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8' }}>
              Your underwriting queue is empty.
            </div>
          ) : (
            <>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Search Applications</label>
                  <input type="text" placeholder="Search by plan or applicant name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box', fontFamily: 'inherit' }} />
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
                  {paginatedApps.map(app => {
                const rs = getRiskStyle(app.risk_level);
                const ss = getStatusStyle(app.status);
                const recs = typeof app.recommendations === 'string' ? JSON.parse(app.recommendations) : (app.recommendations || {});
                const breakdown = recs._score_breakdown || {};
                const explanations = typeof app.explanations === 'string' ? JSON.parse(app.explanations) : (app.explanations || []);
                const isExpanded = expandedId === app.id;
                return (
                  <div key={app.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    {/* Header */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Applying For</div>
                        <h3 style={{ color: '#0f172a', margin: '4px 0 0 0', fontSize: '16px', fontWeight: '700' }}>{app.plan_name}</h3>
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color }}>
                        {app.status}
                      </span>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '20px', flex: 1 }}>
                      <h4 style={{ color: '#0f172a', margin: '0 0 14px 0', fontSize: '14px', fontWeight: '700' }}>Prospect Details</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                        {[
                          { label: 'Full Name', val: app.applicant_name },
                          { label: 'Phone', val: app.applicant_phone },
                          { label: 'Email', val: app.applicant_email }
                        ].map(({ label, val }) => (
                          <div key={label}>
                            <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{label}</div>
                            <div style={{ color: '#0f172a', fontSize: '14px', fontWeight: '500' }}>{val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Risk Profile */}
                      <div style={{ background: rs.bg, padding: '14px 16px', borderRadius: '8px', border: `1px solid ${rs.border}`, borderLeft: `3px solid ${rs.color}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>InsureIQ Risk Assessment</span>
                          <span style={{ color: rs.color, fontWeight: '700', fontSize: '13px' }}>{app.risk_level} Risk</span>
                        </div>
                        <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '12px' }}>
                          Overall score: <strong style={{ color: '#0f172a' }}>{app.total_score} / {app.max_score || 240} points</strong>
                        </p>
                      </div>

                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedId(prev => prev === app.id ? null : app.id)}
                        style={{ marginTop: '10px', background: 'none', border: 'none', color: '#4f46e5', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', padding: '0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isExpanded ? '▲ Hide Risk Profile' : '▼ View Full Risk Profile'}
                      </button>

                      {/* Expanded risk profile */}
                      {isExpanded && (
                        <div style={{ marginTop: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                          {/* Score Breakdown */}
                          {Object.keys(breakdown).length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700', marginBottom: '10px' }}>Score Breakdown</div>
                              {Object.entries(breakdown).map(([cat, score]) => {
                                const max = CATEGORY_MAX[cat] || 60;
                                const pct = Math.min(100, Math.round((score / max) * 100));
                                return (
                                  <div key={cat} style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                      <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: '500' }}>{cat}</span>
                                      <span style={{ fontSize: '12px', color: '#64748b' }}>{score} / {max}</span>
                                    </div>
                                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Risk Factors */}
                          {explanations.length > 0 && (
                            <div>
                              <div style={{ color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700', marginBottom: '8px' }}>Risk Factors</div>
                              <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                {explanations.slice(0, 3).map((exp, i) => (
                                  <li key={i} style={{ fontSize: '12px', color: '#475569', marginBottom: '4px', lineHeight: '1.5' }}>{exp}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions (pending only) */}
                    {app.status === 'pending' && (
                      <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        <textarea
                          placeholder="Add underwriting notes (optional)"
                          value={notes[app.id] || ''}
                          onChange={e => setNotes(prev => ({ ...prev, [app.id]: e.target.value }))}
                          style={{ width: '100%', boxSizing: 'border-box', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', color: '#0f172a', fontSize: '13px', minHeight: '60px', marginBottom: '12px', resize: 'vertical', fontFamily: 'inherit' }}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            disabled={updatingId === app.id}
                            onClick={() => handleUpdateStatus(app.id, 'rejected')}
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: '700', fontFamily: 'inherit', fontSize: '13px' }}>
                            Reject
                          </button>
                          <button
                            disabled={updatingId === app.id}
                            onClick={() => handleUpdateStatus(app.id, 'approved')}
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontFamily: 'inherit', fontSize: '13px' }}>
                            Approve
                          </button>
                        </div>
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
    </DashboardLayout>
  );
}

export default ProviderApplications;

import React, { useState, useEffect } from 'react';
import API_BASE from '../../config';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';

const RISK_COLORS = {
  LOW:    { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  MEDIUM: { bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
  HIGH:   { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' }
};

const CATEGORY_MAX = { 'Age & Health': 60, 'Financial Resilience': 95, 'Insurance Gaps': 50, 'Lifestyle Risks': 40 };

function AdminAssessments() {
  const token = getToken();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/assessment/admin/all`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setAssessments(data.assessments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => {
    const allSelected = paginated.length > 0 && paginated.every(a => selectedIds.has(a.id));
    setSelectedIds(allSelected ? new Set() : new Set(paginated.map(a => a.id)));
  };
  const handleBulkDelete = async () => {
    setBulkDeleteConfirm(false);
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => fetch(`${API_BASE}/api/assessment/admin/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })));
      setAssessments(prev => prev.filter(a => !selectedIds.has(a.id)));
      setSelectedIds(new Set());
    } catch {}
    setBulkDeleting(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm.id);
    setDeleteConfirm(null);
    try {
      const res = await fetch(`${API_BASE}/api/assessment/admin/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAssessments(prev => prev.filter(a => a.id !== deleteConfirm.id));
    } catch {}
    finally { setDeletingId(null); }
  };

  const filtered = assessments.filter(a => {
    const matchFilter = filter === 'ALL' || a.risk_level === filter;
    const matchSearch = !search || a.user_name?.toLowerCase().includes(search.toLowerCase()) || a.user_email?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const counts = { ALL: assessments.length, LOW: 0, MEDIUM: 0, HIGH: 0 };
  assessments.forEach(a => { if (counts[a.risk_level] !== undefined) counts[a.risk_level]++; });

  return (
    <DashboardLayout role="admin" activePage="assessments" pageTitle="All Assessments">
      <div className="dash-welcome">
        <h1>All Assessments</h1>
        <p>{assessments.length} risk assessments taken across the platform.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', background: filter === f ? '#4f46e5' : '#ffffff', color: filter === f ? '#fff' : '#475569' }}>
            {f} <span style={{ opacity: 0.7 }}>({counts[f]})</span>
          </button>
        ))}
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email..."
          style={{ marginLeft: 'auto', padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', width: '240px', color: '#0f172a' }}
        />
      </div>

      {loading ? <LoadingSpinner message="Loading assessments..." /> : (
        <>
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px 16px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '10px' }}>
              <span style={{ color: '#4f46e5', fontSize: '13px', fontWeight: '600' }}>{selectedIds.size} selected</span>
              <button onClick={() => setBulkDeleteConfirm(true)} disabled={bulkDeleting}
                style={{ padding: '7px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size}`}
              </button>
              <button onClick={() => setSelectedIds(new Set())}
                style={{ padding: '7px 14px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', color: '#475569', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={paginated.every(a => selectedIds.has(a.id))} onChange={toggleSelectAll} />
                Select all on page
              </label>
            </div>
          )}
          {paginated.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>No assessments found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paginated.map(a => {
                const rc = RISK_COLORS[a.risk_level] || RISK_COLORS.LOW;
                const isExpanded = expandedId === a.id;
                return (
                  <div key={a.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleSelect(a.id)} onClick={e => e.stopPropagation()} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5' }} />
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>{a.user_name}</div>
                          <div style={{ color: '#64748b', fontSize: '13px' }}>{a.user_email}</div>
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>{new Date(a.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '4px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '12px', background: rc.bg, border: `1px solid ${rc.border}`, color: rc.text }}>{a.risk_level} RISK</span>
                        <div style={{ background: '#f8fafc', padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontWeight: '700', fontSize: '17px', color: '#0f172a' }}>{a.total_score}</span>
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}> / {a.max_score || 240}</span>
                        </div>
                        <button onClick={() => setExpandedId(prev => prev === a.id ? null : a.id)}
                          style={{ background: isExpanded ? '#eef2ff' : '#f8fafc', border: '1px solid #e2e8f0', color: '#4f46e5', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>
                          {isExpanded ? 'Hide ▲' : 'Details ▼'}
                        </button>
                        <button onClick={() => setDeleteConfirm({ id: a.id, name: a.user_name })} disabled={deletingId === a.id}
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>
                          {deletingId === a.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                        {a.score_breakdown && (
                          <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ margin: '0 0 12px', fontSize: '11px', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>Score Breakdown</h4>
                            {Object.entries(a.score_breakdown).map(([cat, pts]) => (
                              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <span style={{ width: '160px', fontSize: '13px', color: '#475569', fontWeight: '500' }}>{cat}</span>
                                <div style={{ flex: 1, height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', width: `${Math.min((pts / (CATEGORY_MAX[cat] || 60)) * 100, 100)}%` }} />
                                </div>
                                <span style={{ width: '50px', fontSize: '13px', textAlign: 'right', color: '#0f172a', fontWeight: '700' }}>{pts} pts</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {a.explanations && a.explanations.length > 0 && (
                          <div>
                            <h4 style={{ margin: '0 0 10px', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>Risk Factors</h4>
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {a.explanations.map((exp, i) => (
                                <li key={i} style={{ fontSize: '13px', color: '#475569', padding: '8px 12px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>⚠️ {exp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: '#475569', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>
                ← Prev
              </button>
              <span style={{ color: '#475569', fontSize: '13px' }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: '#475569', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
      {bulkDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', margin: '0 16px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Delete {selectedIds.size} Assessments?</h3>
            <p style={{ margin: '0 0 24px', color: '#dc2626', fontSize: '13px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px' }}>
              ⚠ This will also delete all feedback linked to these assessments. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setBulkDeleteConfirm(false)} style={{ flex: 1, padding: '11px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleBulkDelete} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff', border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Yes, Delete All</button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', margin: '0 16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Delete Assessment?</h3>
            <p style={{ margin: '0 0 6px 0', color: '#475569', fontSize: '14px', lineHeight: '1.6' }}>
              You are about to delete the assessment for <strong style={{ color: '#0f172a' }}>{deleteConfirm.name}</strong>.
            </p>
            <p style={{ margin: '0 0 24px 0', color: '#dc2626', fontSize: '13px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px' }}>
              ⚠ This will also delete any feedback tied to this assessment. Applications and claims are not affected.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: '11px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleDelete}
                style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff', border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default AdminAssessments;

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
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    fetch(`${API_BASE}/api/assessment/admin/all`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setAssessments(data.assessments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assessment? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/assessment/admin/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAssessments(prev => prev.filter(a => a.id !== id));
      else alert('Failed to delete assessment.');
    } catch { alert('Network error.'); }
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
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>{a.user_name}</div>
                        <div style={{ color: '#64748b', fontSize: '13px' }}>{a.user_email}</div>
                        <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>{new Date(a.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
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
                        <button onClick={() => handleDelete(a.id)} disabled={deletingId === a.id}
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
    </DashboardLayout>
  );
}

export default AdminAssessments;

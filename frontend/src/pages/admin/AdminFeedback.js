import React, { useState, useEffect } from 'react';
import API_BASE from '../../config';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';

function AdminFeedback() {
  const token = getToken();
  const [feedbackData, setFeedbackData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(0); // 0 = all ratings
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    fetch(`${API_BASE}/api/feedback/admin`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setFeedbackData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const allFeedback = feedbackData?.feedback || [];

  const filtered = allFeedback.filter(f => {
    const matchRating = filter === 0 || f.rating === filter;
    const q = search.toLowerCase();
    const matchSearch = !search || f.user_name?.toLowerCase().includes(q) || f.comment?.toLowerCase().includes(q);
    return matchRating && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const ratingCounts = [1, 2, 3, 4, 5].reduce((acc, r) => {
    acc[r] = allFeedback.filter(f => f.rating === r).length;
    return acc;
  }, {});

  return (
    <DashboardLayout role="admin" activePage="feedback" pageTitle="Feedback Management">
      <div className="dash-welcome">
        <h1>Feedback Management</h1>
        <p>All user ratings and comments about their risk assessments.</p>
      </div>

      {loading ? <LoadingSpinner message="Loading feedback..." /> : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', borderTop: '3px solid #4f46e5' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Total Ratings</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#4f46e5' }}>{feedbackData?.total || 0}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', borderTop: '3px solid #f59e0b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Avg Rating</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706' }}>★ {feedbackData?.avg_rating || '—'}</div>
            </div>
            {[5, 4, 3].map(r => (
              <div key={r} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', borderTop: `3px solid ${r >= 4 ? '#10b981' : r === 3 ? '#f59e0b' : '#ef4444'}` }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{'★'.repeat(r)} Ratings</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: r >= 4 ? '#059669' : r === 3 ? '#d97706' : '#dc2626' }}>{ratingCounts[r] || 0}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => { setFilter(0); setPage(1); }}
              style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', background: filter === 0 ? '#4f46e5' : '#fff', color: filter === 0 ? '#fff' : '#475569' }}>
              All ({allFeedback.length})
            </button>
            {[5, 4, 3, 2, 1].map(r => (
              <button key={r} onClick={() => { setFilter(r); setPage(1); }}
                style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', background: filter === r ? '#4f46e5' : '#fff', color: filter === r ? '#fff' : '#475569' }}>
                {'★'.repeat(r)} ({ratingCounts[r] || 0})
              </button>
            ))}
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or comment..."
              style={{ marginLeft: 'auto', padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', width: '240px', color: '#0f172a' }}
            />
          </div>

          {paginated.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>No feedback found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paginated.map(fb => (
                <div key={fb.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, display: 'flex', gap: '2px', marginTop: '2px' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} style={{ fontSize: '16px', color: s <= fb.rating ? '#4f46e5' : '#e2e8f0' }}>★</span>
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {fb.comment ? (
                      <p style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '14px', lineHeight: '1.5' }}>"{fb.comment}"</p>
                    ) : (
                      <p style={{ margin: '0 0 6px 0', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>No comment left</p>
                    )}
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                      {fb.user_name || fb.user_email}
                      <span style={{ margin: '0 6px' }}>·</span>
                      {new Date(fb.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
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

export default AdminFeedback;

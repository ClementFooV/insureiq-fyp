import React, { useState, useEffect } from 'react';
import API_BASE from '../../config';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';

const STATUS_COLORS = {
  pending:  { bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
  approved: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  rejected: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' }
};

const RISK_COLORS = {
  LOW:    { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  MEDIUM: { bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
  HIGH:   { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' }
};

const TYPE_LABELS = {
  life: 'Life', medical: 'Medical', critical_illness: 'Critical Illness',
  personal_accident: 'Personal Accident', income_protection: 'Income Protection'
};

function AdminApplications() {
  const token = getToken();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    fetch(`${API_BASE}/api/applications/admin/all`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setApplications(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const filtered = applications.filter(a => {
    const matchFilter = filter === 'all' || a.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      a.applicant_name?.toLowerCase().includes(q) ||
      a.applicant_email_user?.toLowerCase().includes(q) ||
      a.plan_name?.toLowerCase().includes(q) ||
      a.provider_name?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const counts = { all: applications.length, pending: 0, approved: 0, rejected: 0 };
  applications.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });

  return (
    <DashboardLayout role="admin" activePage="applications" pageTitle="All Applications">
      <div className="dash-welcome">
        <h1>All Applications</h1>
        <p>{applications.length} insurance applications across all providers.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', textTransform: 'capitalize', background: filter === f ? '#4f46e5' : '#ffffff', color: filter === f ? '#fff' : '#475569' }}>
            {f} <span style={{ opacity: 0.7 }}>({counts[f]})</span>
          </button>
        ))}
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search applicant, plan, provider..."
          style={{ marginLeft: 'auto', padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', width: '260px', color: '#0f172a' }}
        />
      </div>

      {loading ? <LoadingSpinner message="Loading applications..." /> : (
        <>
          {paginated.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>No applications found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paginated.map(app => {
                const sc = STATUS_COLORS[app.status] || STATUS_COLORS.pending;
                const rc = RISK_COLORS[app.risk_level] || RISK_COLORS.LOW;
                return (
                  <div key={app.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>{app.plan_name}</span>
                          <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>{TYPE_LABELS[app.insurance_type] || app.insurance_type}</span>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '13px' }}>
                          <span style={{ color: '#4f46e5', fontWeight: '600' }}>{app.applicant_name}</span>
                          <span style={{ color: '#94a3b8' }}> · {app.applicant_email_user}</span>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                          Provider: <span style={{ color: '#475569', fontWeight: '600' }}>{app.provider_name}</span>
                          <span style={{ margin: '0 6px' }}>·</span>
                          {new Date(app.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {app.risk_level && (
                          <span style={{ padding: '4px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '11px', background: rc.bg, border: `1px solid ${rc.border}`, color: rc.text }}>
                            {app.risk_level} · {app.total_score}/{app.max_score || 240}
                          </span>
                        )}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Coverage</div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>RM {Number(app.coverage_amount).toLocaleString()}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Premium</div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>RM {Number(app.premium_monthly).toLocaleString()}/mo</div>
                        </div>
                        <span style={{ padding: '6px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '12px', textTransform: 'capitalize', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>
                          {app.status}
                        </span>
                      </div>
                    </div>
                    {app.notes && (
                      <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', borderLeft: `3px solid ${sc.text}` }}>
                        <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}><strong style={{ color: '#0f172a' }}>Provider Note:</strong> {app.notes}</p>
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

export default AdminApplications;

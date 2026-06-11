import React, { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';

const statusColors = {
  pending:  { bg: '#fffbeb', border: '#fde68a', color: '#d97706' },
  approved: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
  rejected: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' }
};

const typeLabels = {
  life: 'Life Insurance',
  medical: 'Medical Insurance',
  critical_illness: 'Critical Illness',
  personal_accident: 'Personal Accident',
  income_protection: 'Income Protection'
};

function MyPlans() {
  const navigate = useNavigate();
  const token = getToken();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch(`${API_BASE}/api/plans/my-plans`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setPlans(data.plans);
      } catch (err) {
        console.error('Error fetching plans:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, [token]);



  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = (paginatedPlans) => {
    const allSelected = paginatedPlans.length > 0 && paginatedPlans.every(p => selectedIds.has(p.id));
    setSelectedIds(allSelected ? new Set() : new Set(paginatedPlans.map(p => p.id)));
  };
  const handleBulkDelete = async () => {
    setBulkDeleteConfirm(false);
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => fetch(`${API_BASE}/api/plans/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })));
      setPlans(prev => prev.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    } catch {}
    setBulkDeleting(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm.id);
    setDeleteConfirm(null);
    try {
      const res = await fetch(`${API_BASE}/api/plans/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setPlans(prev => prev.filter(p => p.id !== deleteConfirm.id));
    } catch (err) {
    } finally {
      setDeletingId(null);
    }
  };

  const topbarActions = (
    <button onClick={() => navigate('/provider/add-plan')} style={{ padding: '0.45rem 1rem', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '0.825rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
      + Add New Plan
    </button>
  );

  return (
    <DashboardLayout role="provider" activePage="my-plans" pageTitle="My Plans" topbarActions={topbarActions}>
          <div className="dash-welcome">
            <h1>My Plans</h1>
            <p>All insurance plans you have submitted.</p>
          </div>

          {loading && <LoadingSpinner message="Loading plans..." />}

          {!loading && plans.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '16px' }}>You haven't submitted any plans yet.</p>
              <button onClick={() => navigate('/provider/add-plan')} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit' }}>
                Submit Your First Plan
              </button>
            </div>
          )}

          {!loading && plans.length > 0 && (() => {
            const totalPages = Math.ceil(plans.length / itemsPerPage) || 1;
            const paginatedPlans = plans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            return (
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
                  <input type="checkbox" checked={paginatedPlans.every(p => selectedIds.has(p.id))} onChange={() => toggleSelectAll(paginatedPlans)} />
                  Select all on page
                </label>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paginatedPlans.map(plan => {
                const sc = statusColors[plan.status] || statusColors.pending;
                return (
                  <div key={plan.id} style={{ background: '#ffffff', border: `1px solid ${selectedIds.has(plan.id) ? '#c7d2fe' : '#e2e8f0'}`, borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <input type="checkbox" checked={selectedIds.has(plan.id)} onChange={() => toggleSelect(plan.id)} style={{ marginTop: '3px', width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5' }} />
                        <div>
                        <h3 style={{ color: '#0f172a', margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700' }}>{plan.plan_name}</h3>
                        <span style={{ color: '#4f46e5', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{typeLabels[plan.insurance_type] || plan.insurance_type}</span>
                        </div>
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                        {plan.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '24px', color: '#475569', fontSize: '14px' }}>
                      <div><span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Coverage</span><br /><strong style={{ color: '#0f172a' }}>RM {Number(plan.coverage_amount).toLocaleString()}</strong></div>
                      <div><span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Premium</span><br /><strong style={{ color: '#0f172a' }}>RM {Number(plan.premium_monthly).toLocaleString()}/mo</strong></div>
                      <div><span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Eligibility</span><br /><strong style={{ color: '#0f172a' }}>{plan.min_age} – {plan.max_age} yrs</strong></div>
                    </div>

                    {plan.status === 'rejected' && plan.rejection_reason && (
                      <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px' }}>
                        <strong>Rejection Reason:</strong> {plan.rejection_reason}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        onClick={() => navigate(`/provider/edit-plan/${plan.id}`)}
                        style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Edit Plan
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ id: plan.id, name: plan.plan_name })}
                        disabled={deletingId === plan.id}
                        style={{ padding: '8px 20px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', opacity: deletingId === plan.id ? 0.6 : 1 }}>
                        {deletingId === plan.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                  Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, plans.length)} of {plans.length}
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
            </>);
          })()}
      {bulkDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', margin: '0 16px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Delete {selectedIds.size} Plans?</h3>
            <p style={{ margin: '0 0 24px', color: '#dc2626', fontSize: '13px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px' }}>
              ⚠ This will permanently delete all selected plans along with their applications and claims.
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
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Delete Plan?</h3>
            <p style={{ margin: '0 0 6px 0', color: '#475569', fontSize: '14px', lineHeight: '1.6' }}>
              You are about to delete <strong style={{ color: '#0f172a' }}>"{deleteConfirm.name}"</strong>.
            </p>
            <p style={{ margin: '0 0 24px 0', color: '#dc2626', fontSize: '13px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px' }}>
              ⚠ This will also permanently delete all applications and claims linked to this plan.
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

export default MyPlans;

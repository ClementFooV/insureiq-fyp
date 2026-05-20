import React, { useState, useEffect, useCallback } from 'react';
import API_BASE from '../../config';

import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import { getToken } from '../../utils/auth';

const typeLabels = {
  life: 'Life Insurance',
  medical: 'Medical Insurance',
  critical_illness: 'Critical Illness',
  personal_accident: 'Personal Accident',
  income_protection: 'Income Protection'
};

const statusColors = {
  pending:  { bg: '#fffbeb', border: '#fde68a', color: '#d97706' },
  approved: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
  rejected: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' }
};

function AdminPlanApproval() {
  const token = getToken();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/plans/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setPlans(data.plans);
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  useEffect(() => { setCurrentPage(1); }, [filter]);

  const handleStatusUpdate = async (planId, status) => {
    let rejection_reason = null;
    if (status === 'rejected') {
      rejection_reason = prompt('Optional: Enter a reason for rejection (or leave blank):');
      if (rejection_reason === null) return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/plans/${planId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, rejection_reason: rejection_reason || '' })
      });
      if (res.ok) fetchPlans();
    } catch (err) {
      console.error('Error updating plan:', err);
    }
  };

  const filtered = filter === 'all' ? plans : plans.filter(p => p.status === filter);
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  return (
    <DashboardLayout role="admin" activePage="plan-approval" pageTitle="Plan Approval">
          <div className="dash-welcome">
            <h1>Plan Approval Queue</h1>
            <p>Review, approve, or reject insurance plans submitted by providers.</p>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '0' }}>
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '9px 18px', background: 'none', border: 'none', borderBottom: filter === f ? '2px solid #4f46e5' : '2px solid transparent', marginBottom: '-2px', color: filter === f ? '#4f46e5' : '#94a3b8', cursor: 'pointer', fontWeight: filter === f ? '700' : '500', fontSize: '13px', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                {f}{f !== 'all' && ` (${plans.filter(p => p.status === f).length})`}
              </button>
            ))}
          </div>

          {loading && <LoadingSpinner message="Loading plans..." />}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#94a3b8', fontSize: '16px' }}>No plans found for this filter.</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentData.map(plan => {
                  const sc = statusColors[plan.status] || statusColors.pending;
                  return (
                    <div key={plan.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <h3 style={{ color: '#0f172a', margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700' }}>{plan.plan_name}</h3>
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                            {typeLabels[plan.insurance_type] || plan.insurance_type} · by <strong style={{ color: '#4f46e5' }}>{plan.provider_name}</strong>
                          </span>
                        </div>
                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                          {plan.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '24px', fontSize: '13px', marginBottom: '10px' }}>
                        <span style={{ color: '#94a3b8' }}>Coverage: <strong style={{ color: '#0f172a' }}>RM {Number(plan.coverage_amount).toLocaleString()}</strong></span>
                        <span style={{ color: '#94a3b8' }}>Premium: <strong style={{ color: '#0f172a' }}>RM {Number(plan.premium_monthly).toLocaleString()}/mo</strong></span>
                        <span style={{ color: '#94a3b8' }}>Age: <strong style={{ color: '#0f172a' }}>{plan.min_age} – {plan.max_age}</strong></span>
                      </div>

                      {plan.description && (
                        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '10px', lineHeight: '1.5' }}>{plan.description}</p>
                      )}

                      {plan.status === 'rejected' && plan.rejection_reason && (
                        <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px' }}>
                          <strong>Rejection Reason:</strong> {plan.rejection_reason}
                        </div>
                      )}

                      {plan.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                          <button onClick={() => handleStatusUpdate(plan.id, 'approved')}
                            style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontFamily: 'inherit', fontSize: '13px' }}>
                            ✓ Approve
                          </button>
                          <button onClick={() => handleStatusUpdate(plan.id, 'rejected')}
                            style={{ padding: '8px 20px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontFamily: 'inherit', fontSize: '13px' }}>
                            ✕ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                    Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} plans
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
            </>
          )}
    </DashboardLayout>
  );
}

export default AdminPlanApproval;

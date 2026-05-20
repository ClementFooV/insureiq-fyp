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

          {!loading && plans.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {plans.map(plan => {
                const sc = statusColors[plan.status] || statusColors.pending;
                return (
                  <div key={plan.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ color: '#0f172a', margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700' }}>{plan.plan_name}</h3>
                        <span style={{ color: '#4f46e5', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{typeLabels[plan.insurance_type] || plan.insurance_type}</span>
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

                    <button
                      onClick={() => navigate(`/provider/edit-plan/${plan.id}`)}
                      style={{ marginTop: '12px', padding: '8px 20px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Edit Plan
                    </button>
                  </div>
                );
              })}
            </div>
          )}
    </DashboardLayout>
  );
}

export default MyPlans;

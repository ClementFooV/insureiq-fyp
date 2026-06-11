import React, { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';

const insuranceTypes = [
  { value: 'life', label: 'Life Insurance' },
  { value: 'medical', label: 'Medical Insurance' },
  { value: 'critical_illness', label: 'Critical Illness' },
  { value: 'personal_accident', label: 'Personal Accident' },
  { value: 'income_protection', label: 'Income Protection' }
];

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit', background: '#f8fafc', outline: 'none' };
const labelStyle = { display: 'block', color: '#475569', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' };

function EditPlan() {
  const navigate = useNavigate();
  const { id } = useParams();
  const token = getToken();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    plan_name: '',
    insurance_type: '',
    coverage_amount: '',
    premium_monthly: '',
    min_age: 18,
    max_age: 65,
    description: '',
    features: '',
    exclusions: ''
  });

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch(`${API_BASE}/api/plans/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch plan');
        const plan = data.plan;

        let featuresStr = '';
        let exclusionsStr = '';
        try { featuresStr = plan.features ? JSON.parse(plan.features).join(', ') : ''; } catch { featuresStr = Array.isArray(plan.features) ? plan.features.join(', ') : (plan.features || ''); }
        try { exclusionsStr = plan.exclusions ? JSON.parse(plan.exclusions).join(', ') : ''; } catch { exclusionsStr = Array.isArray(plan.exclusions) ? plan.exclusions.join(', ') : (plan.exclusions || ''); }

        setFormData({
          plan_name: plan.plan_name || '',
          insurance_type: plan.insurance_type || '',
          coverage_amount: plan.coverage_amount || '',
          premium_monthly: plan.premium_monthly || '',
          min_age: plan.min_age || 18,
          max_age: plan.max_age || 65,
          description: plan.description || '',
          features: featuresStr,
          exclusions: exclusionsStr
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingPlan(false);
      }
    }
    fetchPlan();
  }, [id, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setSuccess('');

    if (!formData.plan_name || !formData.insurance_type || !formData.coverage_amount || !formData.premium_monthly) {
      return setError('Please fill in all required fields.');
    }
    if (Number(formData.coverage_amount) <= 0 || Number(formData.premium_monthly) <= 0) {
      return setError('Coverage amount and monthly premium must be greater than zero.');
    }
    if (Number(formData.min_age) > Number(formData.max_age)) {
      return setError('Minimum age cannot be greater than maximum age.');
    }

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        coverage_amount: Number(formData.coverage_amount),
        premium_monthly: Number(formData.premium_monthly),
        min_age: Number(formData.min_age),
        max_age: Number(formData.max_age),
        features: formData.features ? formData.features.split(',').map(f => f.trim()) : [],
        exclusions: formData.exclusions ? formData.exclusions.split(',').map(e => e.trim()) : []
      };

      const res = await fetch(`${API_BASE}/api/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update plan');

      setSuccess('Plan updated and resubmitted for approval!');
      setTimeout(() => navigate('/provider/my-plans'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout role="provider" activePage="my-plans" pageTitle="Edit Plan">
          <div className="dash-welcome">
            <h1>Edit Insurance Plan</h1>
            <p>Update your plan details. It will be resubmitted for admin review.</p>
          </div>

          {loadingPlan ? (
            <LoadingSpinner message="Loading plan..." />
          ) : (
            <div>
              {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}
              {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{success}</div>}

              <form onSubmit={handleSubmit} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Plan Name *</label>
                  <input type="text" name="plan_name" value={formData.plan_name} onChange={handleChange}
                    placeholder="e.g. Silver Shield Life 360" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Insurance Type *</label>
                  <select name="insurance_type" value={formData.insurance_type} onChange={handleChange} style={inputStyle}>
                    <option value="">Select type</option>
                    {insuranceTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Coverage Amount (RM) *</label>
                    <input type="number" name="coverage_amount" value={formData.coverage_amount} onChange={handleChange}
                      placeholder="e.g. 250000" min="1" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Monthly Premium (RM) *</label>
                    <input type="number" name="premium_monthly" value={formData.premium_monthly} onChange={handleChange}
                      placeholder="e.g. 150" min="1" step="0.01" style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Min Age</label>
                    <input type="number" name="min_age" value={formData.min_age} onChange={handleChange}
                      min="0" max="120" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Max Age</label>
                    <input type="number" name="max_age" value={formData.max_age} onChange={handleChange}
                      min="0" max="120" style={inputStyle} />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea name="description" value={formData.description} onChange={handleChange}
                    placeholder="Describe the plan benefits..." rows={4}
                    style={{ ...inputStyle, resize: 'vertical' }} />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Features (comma-separated)</label>
                  <input type="text" name="features" value={formData.features} onChange={handleChange}
                    placeholder="e.g. Cashless admission, Overseas coverage, Annual checkup"
                    style={inputStyle} />
                </div>

                <div style={{ marginBottom: '28px' }}>
                  <label style={labelStyle}>Exclusions (comma-separated)</label>
                  <input type="text" name="exclusions" value={formData.exclusions} onChange={handleChange}
                    placeholder="e.g. Pre-existing conditions, Cosmetic surgery"
                    style={inputStyle} />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => navigate('/provider/my-plans')}
                    style={{ flex: 1, padding: '13px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isLoading}
                    style={{ flex: 2, padding: '13px', background: isLoading ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: isLoading ? 'none' : '0 2px 8px rgba(79,70,229,0.3)', transition: 'background 0.2s' }}>
                    {isLoading ? 'Updating...' : 'Update Plan'}
                  </button>
                </div>
              </form>
            </div>
          )}
    </DashboardLayout>
  );
}

export default EditPlan;

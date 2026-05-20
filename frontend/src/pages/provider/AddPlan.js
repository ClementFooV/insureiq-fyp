import React, { useState } from 'react';
import API_BASE from '../../config';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
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

function AddPlan() {
  const navigate = useNavigate();
  const token = getToken();
  const [isLoading, setIsLoading] = useState(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      const res = await fetch(`${API_BASE}/api/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add plan');

      setSuccess('Plan submitted for admin approval!');
      setTimeout(() => navigate('/provider/dashboard'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout role="provider" activePage="add-plan" pageTitle="Add New Plan">
          <div className="dash-welcome">
            <h1>Add New Insurance Plan</h1>
            <p>Fill in the details below. Your plan will be reviewed by an admin before going live.</p>
          </div>

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

              <button type="submit" disabled={isLoading}
                style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', opacity: isLoading ? 0.6 : 1, boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}>
                {isLoading ? 'Submitting...' : 'Submit Plan for Approval'}
              </button>
            </form>
          </div>
    </DashboardLayout>
  );
}

export default AddPlan;

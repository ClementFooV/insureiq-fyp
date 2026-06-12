import React, { useState, useEffect, useCallback } from 'react';
import API_BASE from '../../config';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';

const typeLabels = {
  life: 'Life Insurance',
  medical: 'Medical Insurance',
  critical_illness: 'Critical Illness',
  personal_accident: 'Personal Accident',
  income_protection: 'Income Protection'
};

const allTypes = ['life', 'medical', 'critical_illness', 'personal_accident', 'income_protection'];

const card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };

function BrowsePlans() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = getToken();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchedPlans, setMatchedPlans] = useState([]);
  const [matchLoading, setMatchLoading] = useState(true);
  const [matchError, setMatchError] = useState('');
  const [activeTab, setActiveTab] = useState('recommended');
  const [expandedId, setExpandedId] = useState(null);
  const [compareList, setCompareList] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyingPlan, setApplyingPlan] = useState(null);
  const [applyForm, setApplyForm] = useState({ name: '', email: '', phone: '' });
  const [assessmentId, setAssessmentId] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState('');
  const [applyError, setApplyError] = useState('');

  const [filterType, setFilterType] = useState('all');
  const [maxPremium, setMaxPremium] = useState('');
  const [minCoverage, setMinCoverage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [compareWarning, setCompareWarning] = useState(false);
  const [noAssessmentModal, setNoAssessmentModal] = useState(false);
  const [allPage, setAllPage] = useState(1);
  const [recPage, setRecPage] = useState(1);
  const plansPerPage = 6;
  const [myApplications, setMyApplications] = useState([]);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/plans/approved`, {
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

  useEffect(() => {
    fetchPlans();

    fetch(`${API_BASE}/api/assessment/latest`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setAssessmentId(data.id); })
      .catch(console.error);

    fetch(`${API_BASE}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          const decoded = token ? JSON.parse(atob(token.split('.')[1])) : {};
          setApplyForm(prev => ({ ...prev, email: decoded.email || '', name: decoded.name || '' }));
        }
      })
      .catch(console.error);

    fetch(`${API_BASE}/api/plans/matched`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error === 'incomplete_profile') {
          setMatchError('Complete your profile and risk assessment to see personalised plan matches.');
        } else if (data.matched_plans) {
          setMatchedPlans(data.matched_plans);
        }
        setMatchLoading(false);
      })
      .catch(() => {
        setMatchError('Could not load matched plans.');
        setMatchLoading(false);
      });

    fetch(`${API_BASE}/api/applications/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.applications) setMyApplications(data.applications); })
      .catch(() => {});
  }, [fetchPlans, token]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');
    if (typeParam && allTypes.includes(typeParam)) {
      setFilterType(typeParam);
      setActiveTab('all');
    }
  }, [location.search]);

  useEffect(() => {
    setAllPage(1);
    setRecPage(1);
  }, [filterType, maxPremium, minCoverage, searchQuery]);

  const applyFilters = (p) => {
    if (filterType !== 'all' && p.insurance_type !== filterType) return false;
    if (maxPremium && Number(p.premium_monthly) > Number(maxPremium)) return false;
    if (minCoverage && Number(p.coverage_amount) < Number(minCoverage)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.plan_name?.toLowerCase().includes(q) && !p.provider_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  };

  const filtered = plans.filter(applyFilters);
  const filteredMatched = matchedPlans.filter(applyFilters);

  const toggleCompare = (plan) => {
    setCompareList(prev => {
      const exists = prev.find(p => p.id === plan.id);
      if (exists) return prev.filter(p => p.id !== plan.id);
      if (prev.length >= 3) {
        setCompareWarning(true);
        setTimeout(() => setCompareWarning(false), 3000);
        return prev;
      }
      return [...prev, plan];
    });
  };

  const parseJson = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return []; }
  };

  const handleApplyClick = (plan) => {
    if (!assessmentId) {
      setNoAssessmentModal(true);
      return;
    }
    setApplyingPlan(plan);
    setShowApplyModal(true);
    setApplySuccess('');
    setApplyError('');
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    if (!applyForm.name || !applyForm.phone || !applyForm.email) {
      setApplyError('Please fill in all contact details.');
      return;
    }
    const phoneRegex = /^(\+?60|0)[0-9]{8,10}$/;
    if (!phoneRegex.test(applyForm.phone.replace(/[\s-]/g, ''))) {
      setApplyError('Please enter a valid Malaysian phone number (e.g. 012-3456789).');
      return;
    }
    setApplyLoading(true);
    setApplyError('');
    try {
      const res = await fetch(`${API_BASE}/api/applications/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          plan_id: applyingPlan.id,
          provider_id: applyingPlan.provider_id,
          assessment_id: assessmentId,
          applicant_name: applyForm.name,
          applicant_email: applyForm.email,
          applicant_phone: applyForm.phone
        })
      });
      const data = await res.json();
      if (res.ok) {
        setApplySuccess('Application submitted successfully!');
        setTimeout(() => { setShowApplyModal(false); navigate('/my-applications'); }, 2000);
      } else {
        setApplyError(data.message || 'Failed to submit application.');
      }
    } catch {
      setApplyError('Network error. Failed to communicate with server.');
    } finally {
      setApplyLoading(false);
    }
  };

  // Shared plan card renderer
  const renderPlanCard = (plan, isMatched = false) => {
    const isExpanded = expandedId === plan.id;
    const isCompared = compareList.some(p => p.id === plan.id);
    const features = parseJson(plan.features);
    const exclusions = parseJson(plan.exclusions);
    const existingApp = myApplications.find(a => a.plan_id === plan.id);
    const appStatus = existingApp?.status;
    return (
      <div key={plan.id} style={{ ...card, borderColor: isMatched ? '#c7d2fe' : '#e2e8f0' }}>
        {isMatched && (
          <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '20px', padding: '3px 12px', color: '#4f46e5', fontSize: '12px', fontWeight: '700' }}>
              Match Score: {plan.match_score}/8
            </span>
            {plan.match_reasons.map((reason, i) => (
              <span key={i} style={{ display: 'inline-block', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '2px 10px', color: '#475569', fontSize: '11px' }}>
                {reason}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ color: '#4f46e5', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{plan.provider_name}</span>
            <h3 style={{ color: '#0f172a', margin: '4px 0 2px 0', fontSize: '17px', fontWeight: '700' }}>{plan.plan_name}</h3>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>{typeLabels[plan.insurance_type] || plan.insurance_type}</span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>
            <input type="checkbox" checked={isCompared} onChange={() => toggleCompare(plan)} style={{ cursor: 'pointer' }} />
            Compare
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0', marginTop: '16px', padding: '14px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          {[
            { label: 'Coverage', value: `RM ${Number(plan.coverage_amount).toLocaleString()}` },
            { label: 'Monthly Premium', value: `RM ${Number(plan.premium_monthly).toLocaleString()}` },
            { label: 'Eligibility', value: `${plan.min_age} – ${plan.max_age} yrs` }
          ].map(({ label, value }) => (
            <div key={label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
              <div style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
          <button onClick={() => setExpandedId(isExpanded ? null : plan.id)}
            style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: 0, fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>
            {isExpanded ? 'Hide details ▲' : 'Show details ▼'}
          </button>
          <button
            onClick={() => { if (!appStatus || appStatus === 'rejected' || appStatus === 'cancelled') handleApplyClick(plan); }}
            title={!assessmentId ? 'Complete your Risk Assessment first' : appStatus === 'pending' ? 'Application pending review' : appStatus === 'approved' ? 'You already have this policy' : ''}
            style={{
              background: appStatus === 'approved' ? '#10b981' : appStatus === 'pending' ? '#f59e0b' : !assessmentId ? '#e2e8f0' : 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: appStatus ? '#fff' : assessmentId ? '#fff' : '#94a3b8',
              cursor: (appStatus === 'pending' || appStatus === 'approved' || !assessmentId) ? 'not-allowed' : 'pointer',
              padding: '9px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit',
              boxShadow: (!appStatus && assessmentId) ? '0 2px 8px rgba(16,185,129,0.3)' : 'none'
            }}>
            {appStatus === 'approved' ? '✓ Policy Active' : appStatus === 'pending' ? '⏳ Pending' : !assessmentId ? '🔒 Assessment Required' : 'Apply Now'}
          </button>
        </div>

        {isExpanded && (
          <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {plan.description && (
              <p style={{ color: '#475569', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5' }}>{plan.description}</p>
            )}
            <div style={{ display: 'flex', gap: '32px' }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ color: '#10b981', fontSize: '13px', marginBottom: '8px', fontWeight: '700' }}>✓ Benefits / Features</h4>
                {features.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {features.map((f, i) => <li key={i} style={{ color: '#475569', fontSize: '13px', marginBottom: '4px' }}>{f}</li>)}
                  </ul>
                ) : <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>No features listed.</p>}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ color: '#ef4444', fontSize: '13px', marginBottom: '8px', fontWeight: '700' }}>✕ Exclusions</h4>
                {exclusions.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {exclusions.map((e, i) => <li key={i} style={{ color: '#475569', fontSize: '13px', marginBottom: '4px' }}>{e}</li>)}
                  </ul>
                ) : <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>No exclusions listed.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout role="individual" activePage="browse-plans" pageTitle="Browse Plans">
      <div className="dash-welcome">
        <h1>Browse Insurance Plans</h1>
        <p>Explore approved plans from our trusted providers.</p>
      </div>

      {/* Filter Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Insurance Type</div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '13px', background: '#f8fafc', fontFamily: 'inherit', cursor: 'pointer' }}>
            <option value="all">All Types</option>
            {allTypes.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Min Coverage (RM)</div>
          <input type="number" value={minCoverage} onChange={e => setMinCoverage(e.target.value)} placeholder="e.g. 100000" min="0"
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '13px', background: '#f8fafc', fontFamily: 'inherit', width: '140px' }} />
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Max Premium (RM/mo)</div>
          <input type="number" value={maxPremium} onChange={e => setMaxPremium(e.target.value)} placeholder="e.g. 300" min="0"
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '13px', background: '#f8fafc', fontFamily: 'inherit', width: '130px' }} />
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Search</div>
          <input
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Plan name or provider..."
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '13px', background: '#f8fafc', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ color: '#94a3b8', fontSize: '12px', alignSelf: 'center', whiteSpace: 'nowrap' }}>
          {activeTab === 'all' ? `${filtered.length} of ${plans.length} plans` : `${filteredMatched.length} matched`}
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
        {[
          { key: 'recommended', label: `Recommended ${matchedPlans.length > 0 ? `(${matchedPlans.length})` : ''}` },
          { key: 'all', label: `All Plans (${plans.length})` }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #4f46e5' : '2px solid transparent', marginBottom: '-2px', color: activeTab === tab.key ? '#4f46e5' : '#94a3b8', cursor: 'pointer', fontWeight: activeTab === tab.key ? '700' : '500', fontSize: '14px', fontFamily: 'inherit', transition: 'color 0.2s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Recommended Tab */}
      {activeTab === 'recommended' && (
        <>
          {matchLoading && <LoadingSpinner message="Finding your best plans..." />}
          {!matchLoading && matchError && (
            <div style={{ textAlign: 'center', padding: '48px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#94a3b8', marginBottom: '16px' }}>{matchError}</p>
              <button onClick={() => navigate('/assessment')}
                style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontFamily: 'inherit' }}>
                Complete Assessment
              </button>
            </div>
          )}
          {!matchLoading && !matchError && matchedPlans.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#94a3b8' }}>No plans matched your profile. Try browsing all plans.</p>
            </div>
          )}
          {!matchLoading && !matchError && matchedPlans.length > 0 && filteredMatched.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#94a3b8' }}>No matched plans fit your current filters.</p>
            </div>
          )}
          {!matchLoading && (() => {
            const totalRecPages = Math.ceil(filteredMatched.length / plansPerPage) || 1;
            const paginatedRec = filteredMatched.slice((recPage - 1) * plansPerPage, recPage * plansPerPage);
            return (
              <>
                {paginatedRec.map(plan => renderPlanCard(plan, true))}
                {totalRecPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
                    <button onClick={() => setRecPage(p => Math.max(1, p - 1))} disabled={recPage === 1}
                      style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: recPage === 1 ? 'not-allowed' : 'pointer', color: recPage === 1 ? '#94a3b8' : '#475569', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>
                      ← Prev
                    </button>
                    <span style={{ color: '#475569', fontSize: '13px' }}>Page {recPage} of {totalRecPages}</span>
                    <button onClick={() => setRecPage(p => Math.min(totalRecPages, p + 1))} disabled={recPage === totalRecPages}
                      style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: recPage === totalRecPages ? 'not-allowed' : 'pointer', color: recPage === totalRecPages ? '#94a3b8' : '#475569', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>
                      Next →
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

      {/* All Plans Tab */}
      {activeTab === 'all' && (
        <>
          {loading && <LoadingSpinner message="Loading plans..." />}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#94a3b8' }}>No plans match your current filters.</p>
            </div>
          )}
          {(() => {
            const totalAllPages = Math.ceil(filtered.length / plansPerPage) || 1;
            const paginatedAll = filtered.slice((allPage - 1) * plansPerPage, allPage * plansPerPage);
            return (
              <>
                {paginatedAll.map(plan => renderPlanCard(plan, false))}
                {totalAllPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
                    <button onClick={() => setAllPage(p => Math.max(1, p - 1))} disabled={allPage === 1}
                      style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: allPage === 1 ? 'not-allowed' : 'pointer', color: allPage === 1 ? '#94a3b8' : '#475569', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>
                      ← Prev
                    </button>
                    <span style={{ color: '#475569', fontSize: '13px' }}>Page {allPage} of {totalAllPages}</span>
                    <button onClick={() => setAllPage(p => Math.min(totalAllPages, p + 1))} disabled={allPage === totalAllPages}
                      style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: allPage === totalAllPages ? 'not-allowed' : 'pointer', color: allPage === totalAllPages ? '#94a3b8' : '#475569', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>
                      Next →
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

      {/* Sticky Compare Widget */}
      {compareList.length > 0 && !showCompareModal && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 1000, minWidth: '220px' }}>
          {compareList.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: '600' }}>{p.plan_name}</span>
              <button onClick={() => toggleCompare(p)}
                style={{ background: '#fef2f2', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '50%', width: '22px', height: '22px', fontSize: '12px', lineHeight: '22px', padding: 0 }}>
                ✕
              </button>
            </div>
          ))}
          {compareWarning && (
            <div style={{ fontSize: '12px', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '6px 10px', marginBottom: '8px', textAlign: 'center' }}>
              Max 3 plans at a time
            </div>
          )}
          <button onClick={() => setShowCompareModal(true)}
            style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', marginTop: '4px', fontFamily: 'inherit' }}>
            Compare ({compareList.length}/3)
          </button>
        </div>
      )}

      {/* Compare Modal */}
      {showCompareModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}
          onClick={() => setShowCompareModal(false)}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '900px', width: '100%', maxHeight: '85vh', overflowY: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#0f172a', margin: 0, fontWeight: '700' }}>Compare Plans</h2>
              <button onClick={() => setShowCompareModal(false)}
                style={{ background: '#f1f5f9', border: 'none', color: '#475569', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', fontFamily: 'inherit' }}>
                ✕
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '160px' }}></th>
                  {compareList.map(p => (
                    <th key={p.id} style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ color: '#4f46e5', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.provider_name}</div>
                      <div style={{ color: '#0f172a', fontSize: '16px', fontWeight: '700', marginTop: '4px' }}>{p.plan_name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Coverage Amount', key: p => `RM ${Number(p.coverage_amount).toLocaleString()}` },
                  { label: 'Monthly Premium', key: p => `RM ${Number(p.premium_monthly).toLocaleString()}/mo` },
                  { label: 'Eligibility', key: p => `${p.min_age} – ${p.max_age} years` },
                  { label: 'Insurance Type', key: p => typeLabels[p.insurance_type] || p.insurance_type },
                ].map(({ label, key }, idx) => (
                  <tr key={label} style={{ background: idx % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                    <td style={{ padding: '12px 16px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>{label}</td>
                    {compareList.map(p => (
                      <td key={p.id} style={{ padding: '12px', textAlign: 'center', color: '#0f172a', fontSize: '14px' }}>{key(p)}</td>
                    ))}
                  </tr>
                ))}
                <tr style={{ background: '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: '700', fontSize: '13px', verticalAlign: 'top' }}>Benefits</td>
                  {compareList.map(p => {
                    const features = parseJson(p.features);
                    return (
                      <td key={p.id} style={{ padding: '12px', color: '#475569', fontSize: '13px', verticalAlign: 'top', textAlign: 'center' }}>
                        {features.length > 0 ? <ul style={{ margin: '0 auto', paddingLeft: '16px', display: 'inline-block', textAlign: 'left' }}>{features.map((f, i) => <li key={i} style={{ marginBottom: '3px' }}>{f}</li>)}</ul> : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', color: '#ef4444', fontWeight: '700', fontSize: '13px', verticalAlign: 'top' }}>Exclusions</td>
                  {compareList.map(p => {
                    const exclusions = parseJson(p.exclusions);
                    return (
                      <td key={p.id} style={{ padding: '12px', color: '#475569', fontSize: '13px', verticalAlign: 'top', textAlign: 'center' }}>
                        {exclusions.length > 0 ? <ul style={{ margin: '0 auto', paddingLeft: '16px', display: 'inline-block', textAlign: 'left' }}>{exclusions.map((e, i) => <li key={i} style={{ marginBottom: '3px' }}>{e}</li>)}</ul> : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && applyingPlan && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '40px', maxWidth: '500px', width: '100%', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '22px', fontWeight: '700' }}>Confirm Application</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
              You are applying for <strong style={{ color: '#0f172a' }}>{applyingPlan.plan_name}</strong> by {applyingPlan.provider_name}.
            </p>
            <div style={{ background: '#eef2ff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #c7d2fe', marginBottom: '20px' }}>
              <p style={{ color: '#475569', margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
                <strong style={{ color: '#4f46e5' }}>Note:</strong> By submitting, you agree to share your most recent Risk Assessment ({assessmentId ? '✅ Attached' : '❌ Missing'}) with the insurance provider for underwriting review.
              </p>
            </div>

            {applySuccess ? (
              <div style={{ padding: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', textAlign: 'center' }}>
                <h3 style={{ color: '#16a34a', margin: '0 0 8px 0' }}>✅ Success!</h3>
                <p style={{ color: '#475569', margin: 0, fontSize: '14px' }}>{applySuccess}</p>
                <p style={{ color: '#94a3b8', margin: '8px 0 0 0', fontSize: '12px' }}>Redirecting to applications...</p>
              </div>
            ) : (
              <form onSubmit={submitApplication}>
                {[
                  { label: 'Full Legal Name', key: 'name', type: 'text', placeholder: 'John Doe' },
                  { label: 'Email Address', key: 'email', type: 'email', placeholder: 'you@example.com' },
                  { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: '+60 12-345 6789' }
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key} style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', color: '#475569', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</label>
                    <input type={type} required value={applyForm[key]} placeholder={placeholder}
                      onChange={e => setApplyForm({ ...applyForm, [key]: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit', background: '#f8fafc' }} />
                  </div>
                ))}

                {applyError && <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px', background: '#fef2f2', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fecaca' }}>{applyError}</div>}

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button type="button" onClick={() => setShowApplyModal(false)}
                    style={{ flex: 1, padding: '11px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={applyLoading}
                    style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', cursor: applyLoading ? 'wait' : 'pointer', fontWeight: '700', fontFamily: 'inherit', opacity: applyLoading ? 0.7 : 1 }}>
                    {applyLoading ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {noAssessmentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', margin: '0 16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '22px' }}>
              📋
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Assessment Required</h3>
            <p style={{ margin: '0 0 24px', color: '#475569', fontSize: '14px', lineHeight: '1.6' }}>
              You need to complete your <strong style={{ color: '#0f172a' }}>Risk Assessment</strong> before applying for a plan. The provider needs your risk score to process your application.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setNoAssessmentModal(false)}
                style={{ flex: 1, padding: '11px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={() => { setNoAssessmentModal(false); navigate('/assessment'); }}
                style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                Take Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default BrowsePlans;

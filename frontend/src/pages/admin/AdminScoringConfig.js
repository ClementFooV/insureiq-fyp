import React, { useState, useEffect, useCallback } from 'react';
import API_BASE from '../../config';

import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';

const CATEGORIES = ['Insurance Gaps', 'Lifestyle Risks'];

const getWeightUnit = (key) => {
  if (key.includes('_mult_'))        return '×';
  if (key === 'rec_ip_rate')         return '%';
  if (key.includes('_months_'))      return 'mo';
  if (key.startsWith('rec_'))        return 'RM';
  return 'pts';
};

const CATEGORY_FORMULAS = {
  'Life Insurance': {
    formula: '(Monthly Income \u00d7 12 \u00d7 multiplier) + Total Liabilities + (Dependents \u00d7 per-dependent add-on)',
    output: 'Capped between minimum and maximum. Result = recommended life insurance coverage (RM)',
  },
  'Medical Insurance': {
    formula: 'Fixed cap selected by risk level \u2014 LOW / MEDIUM / HIGH',
    output: 'Result = recommended annual medical coverage (RM)',
  },
  'Critical Illness': {
    formula: 'Monthly Income \u00d7 12 \u00d7 multiplier',
    output: 'Result = recommended lump-sum critical illness coverage (RM)',
  },
  'Personal Accident': {
    formula: 'Fixed cap selected by occupation type \u2014 Desk / Manual / High-risk',
    output: 'Result = recommended personal accident coverage (RM)',
  },
  'Income Protection': {
    formula: 'Monthly Income \u00d7 rate% \u00d7 duration (months)',
    output: 'Result = recommended income replacement coverage (RM)',
  },
};

const emptyQuestion = () => ({
  question_key: '', title: '', description: '', category: 'Insurance Gaps',
  options: [{ option_value: '', option_label: '', score_points: 0 }, { option_value: '', option_label: '', score_points: 0 }]
});

function AdminScoringConfig() {
  const token = getToken();

  const [activeTab, setActiveTab] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [weights, setWeights] = useState({});
  const [maxScore, setMaxScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingQ, setEditingQ] = useState(null); // null = new
  const [form, setForm] = useState(emptyQuestion());
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  const fetchQuestions = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/scoring/questions/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setQuestions(data.questions || []);
  }, [token]);

  const fetchWeights = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/scoring/weights`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setWeights(data.weights || {});
  }, [token]);

  const fetchMaxScore = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/scoring/max-score`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setMaxScore(data);
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchQuestions(), fetchWeights(), fetchMaxScore()]);
      setLoading(false);
    })();
  }, [fetchQuestions, fetchWeights, fetchMaxScore]);

  // ── Questions CRUD ──

  const openNew = () => { setEditingQ(null); setForm(emptyQuestion()); setShowModal(true); };
  const openEdit = (q) => {
    setEditingQ(q.id);
    setForm({
      question_key: q.question_key,
      title: q.title,
      description: q.description || '',
      category: q.category,
      is_active: q.is_active,
      options: q.options.map(o => ({ option_value: o.option_value, option_label: o.option_label, score_points: o.score_points }))
    });
    setShowModal(true);
  };

  const addOption = () => setForm(f => ({ ...f, options: [...f.options, { option_value: '', option_label: '', score_points: 0 }] }));
  const removeOption = (i) => setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));
  const updateOption = (i, field, val) => setForm(f => {
    const opts = [...f.options];
    opts[i] = { ...opts[i], [field]: field === 'score_points' ? Number(val) : val };
    return { ...f, options: opts };
  });

  const saveQuestion = async () => {
    if (!form.title.trim()) return showMsg('Title is required.', 'error');
    if (!editingQ && !form.question_key.trim()) return showMsg('Question key is required for new questions.', 'error');
    if (form.options.length < 2) return showMsg('At least 2 options are required.', 'error');
    if (form.options.some(o => !o.option_value.trim() || !o.option_label.trim())) return showMsg('All option fields are required.', 'error');

    setSaving(true);
    try {
      const url = editingQ
        ? `${API_BASE}/api/scoring/questions/${editingQ}`
        : `${API_BASE}/api/scoring/questions`;
      const method = editingQ ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) return showMsg(data.message || 'Save failed.', 'error');
      showMsg(editingQ ? 'Question updated.' : 'Question created.');
      setShowModal(false);
      fetchQuestions();
      fetchMaxScore();
    } catch { showMsg('Network error.', 'error'); }
    finally { setSaving(false); }
  };

  const deleteQuestion = async (id) => {
    try {
      await fetch(`${API_BASE}/api/scoring/questions/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      showMsg('Question deactivated.');
      setDeleteConfirm(null);
      fetchQuestions();
      fetchMaxScore();
    } catch { showMsg('Delete failed.', 'error'); }
  };

  const moveQuestion = async (id, direction) => {
    const idx = questions.findIndex(q => q.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= questions.length) return;
    const reordered = [...questions];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const order = reordered.map((q, i) => ({ id: q.id, display_order: i + 1 }));
    setQuestions(reordered);
    await fetch(`${API_BASE}/api/scoring/questions/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ order })
    });
  };

  // ── Weights ──

  const updateWeight = (category, key, val) => {
    setWeights(prev => ({
      ...prev,
      [category]: prev[category].map(w => w.weight_key === key ? { ...w, points: Number(val) } : w)
    }));
  };

  const saveWeights = async (category) => {
    const categoryWeights = weights[category] || [];

    // Threshold cross-field validation (frontend)
    if (category === 'Risk Thresholds') {
      const medium = categoryWeights.find(w => w.weight_key === 'risk_threshold_medium');
      const high   = categoryWeights.find(w => w.weight_key === 'risk_threshold_high');
      if (medium && high) {
        if (!Number.isInteger(Number(medium.points)) || Number(medium.points) < 1 ||
            !Number.isInteger(Number(high.points))   || Number(high.points)   < 1) {
          return showMsg('Thresholds must be positive integers.', 'error');
        }
        if (Number(medium.points) >= Number(high.points)) {
          return showMsg(`Medium threshold (${medium.points}) must be less than High threshold (${high.points}).`, 'error');
        }
      }
    }

    setSaving(true);
    try {
      const results = await Promise.all(categoryWeights.map(w =>
        fetch(`${API_BASE}/api/scoring/weights/${w.weight_key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ points: w.points })
        }).then(r => r.json().then(d => ({ ok: r.ok, ...d })))
      ));
      const failed = results.find(r => !r.ok);
      if (failed) return showMsg(failed.message || 'Save failed.', 'error');
      showMsg(`${category} weights saved.`);
      fetchMaxScore();
    } catch { showMsg('Save failed.', 'error'); }
    finally { setSaving(false); }
  };

  const inputStyle = { width: '100%', padding: '9px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', marginBottom: '5px' };

  return (
    <DashboardLayout role="admin" activePage="scoring-config" pageTitle="Scoring Config">
          <div className="dash-welcome">
            <h1>Scoring Engine Configuration</h1>
            <p>Manage assessment questions and profile scoring weights.</p>
          </div>

          {msg.text && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '600', background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}`, color: msg.type === 'error' ? '#dc2626' : '#16a34a' }}>
              {msg.text}
            </div>
          )}

          {/* Max Score Summary Bar */}
          {(() => {
            const cats = [
              { key: 'Age & Health',        color: '#4f46e5' },
              { key: 'Financial Resilience', color: '#7c3aed' },
              { key: 'Insurance Gaps',       color: '#059669' },
              { key: 'Lifestyle Risks',      color: '#d97706' },
            ];
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '24px' }}>
                {cats.map(({ key, color }) => (
                  <div key={key} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', borderTop: `3px solid ${color}` }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{key}</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color }}>
                      {maxScore ? maxScore.breakdown[key] : '—'}
                      {maxScore && <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500', marginLeft: '3px' }}>pts</span>}
                    </div>
                  </div>
                ))}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', borderTop: '3px solid #0f172a' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Max Score</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#4f46e5' }}>
                    {maxScore ? maxScore.total : '—'}
                    {maxScore && <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500', marginLeft: '3px' }}>pts</span>}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '24px', gap: '4px' }}>
            {[['questions', '📋 Questions'], ['weights', '⚖ Profile Weights'], ['recommendations', '🎯 Recommendations']].map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', color: activeTab === key ? '#4f46e5' : '#64748b', borderBottom: activeTab === key ? '2px solid #4f46e5' : '2px solid transparent', marginBottom: '-2px' }}>
                {label}
              </button>
            ))}
          </div>

          {loading ? <LoadingSpinner message="Loading scoring config..." /> : (
            <>
              {/* ── QUESTIONS TAB ── */}
              {activeTab === 'questions' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <button onClick={openNew} style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
                      + Add Question
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {questions.map((q, idx) => (
                      <div key={q.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', opacity: q.is_active ? 1 : 0.5 }}>
                        {/* Order buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <button onClick={() => moveQuestion(q.id, 'up')} disabled={idx === 0} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '11px', color: '#64748b' }}>▲</button>
                          <button onClick={() => moveQuestion(q.id, 'down')} disabled={idx === questions.length - 1} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '11px', color: '#64748b' }}>▼</button>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{q.title}</span>
                            {!q.is_active && <span style={{ fontSize: '11px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '12px', padding: '1px 8px', fontWeight: '600' }}>Inactive</span>}
                          </div>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                            <span style={{ background: '#eef2ff', color: '#4f46e5', borderRadius: '12px', padding: '2px 8px', fontWeight: '600' }}>{q.category}</span>
                            <span>{q.options.length} options</span>
                            <span style={{ color: '#94a3b8' }}>key: {q.question_key}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => openEdit(q)} style={{ padding: '7px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '7px', color: '#475569', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit', fontSize: '12px' }}>Edit</button>
                          <button onClick={() => setDeleteConfirm(q.id)} style={{ padding: '7px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#dc2626', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit', fontSize: '12px' }}>
                            {q.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── PROFILE WEIGHTS TAB ── */}
              {activeTab === 'weights' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
                  {Object.entries(weights)
                    .filter(([cat]) => !CATEGORY_FORMULAS[cat] && cat !== 'Risk Thresholds')
                    .map(([category, items]) => (
                    <div key={category} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{category}</span>
                        <button onClick={() => saveWeights(category)} disabled={saving} style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>
                          Save
                        </button>
                      </div>
                      <div style={{ padding: '16px 20px' }}>
                        {items.map(w => (
                          <div key={w.weight_key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: '13px', color: '#0f172a' }}>{w.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input type="number" min="0" max="9999999" value={w.points}
                                onChange={e => updateWeight(category, w.weight_key, e.target.value)}
                                style={{ width: '64px', padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#0f172a', background: '#f8fafc', textAlign: 'center', fontFamily: 'inherit' }}
                              />
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{getWeightUnit(w.weight_key)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── RECOMMENDATIONS TAB ── */}
              {activeTab === 'recommendations' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  {/* Risk Thresholds section */}
                  {weights['Risk Thresholds'] && (
                    <div>
                      <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569', margin: '0 0 12px 0' }}>Risk Level Thresholds</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                          <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>Risk Thresholds</span>
                            <button onClick={() => saveWeights('Risk Thresholds')} disabled={saving} style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Save</button>
                          </div>
                          <div style={{ padding: '10px 20px', background: '#fefce8', borderBottom: '1px solid #fde68a' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#92400e', marginBottom: '4px' }}>How it works</div>
                            <div style={{ fontSize: '12px', color: '#78350f' }}>Score &lt; Medium threshold → LOW &nbsp;|&nbsp; Medium ≤ Score &lt; High → MEDIUM &nbsp;|&nbsp; Score ≥ High → HIGH</div>
                          </div>
                          <div style={{ padding: '16px 20px' }}>
                            {weights['Risk Thresholds'].map(w => (
                              <div key={w.weight_key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '13px', color: '#0f172a' }}>{w.label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <input type="number" min="1" max="9999" value={w.points}
                                    onChange={e => updateWeight('Risk Thresholds', w.weight_key, e.target.value)}
                                    style={{ width: '64px', padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#0f172a', background: '#f8fafc', textAlign: 'center', fontFamily: 'inherit' }}
                                  />
                                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{getWeightUnit(w.weight_key)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Coverage Recommendation Parameters */}
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569', margin: '0 0 12px 0' }}>Coverage Recommendation Parameters</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
                      {Object.entries(weights)
                        .filter(([cat]) => CATEGORY_FORMULAS[cat])
                        .map(([category, items]) => (
                        <div key={category} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                          <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{category}</span>
                            <button onClick={() => saveWeights(category)} disabled={saving} style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Save</button>
                          </div>
                          <div style={{ padding: '10px 20px', background: '#f0f9ff', borderBottom: '1px solid #bae6fd' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0369a1', marginBottom: '4px' }}>Formula</div>
                            <div style={{ fontSize: '12px', color: '#0c4a6e', fontFamily: 'monospace', marginBottom: '4px' }}>{CATEGORY_FORMULAS[category].formula}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>→ {CATEGORY_FORMULAS[category].output}</div>
                          </div>
                          <div style={{ padding: '16px 20px' }}>
                            {items.map(w => (
                              <div key={w.weight_key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '13px', color: '#0f172a' }}>{w.label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <input type="number" min="0" max="9999999" value={w.points}
                                    onChange={e => updateWeight(category, w.weight_key, e.target.value)}
                                    style={{ width: '90px', padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#0f172a', background: '#f8fafc', textAlign: 'center', fontFamily: 'inherit' }}
                                  />
                                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{getWeightUnit(w.weight_key)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}


      {/* ── Question Modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
              {editingQ ? 'Edit Question' : 'Add New Question'}
            </h3>

            {!editingQ && (
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Question Key (unique, no spaces)</label>
                <input style={inputStyle} placeholder="e.g. hasPetInsurance" value={form.question_key} onChange={e => setForm(f => ({ ...f, question_key: e.target.value.replace(/\s/g, '') }))} />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Description (optional)</label>
              <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Category</label>
              <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {editingQ && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_active !== false} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  Active (visible in assessment)
                </label>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ ...labelStyle, margin: 0 }}>Answer Options</label>
                <button onClick={addOption} style={{ fontSize: '12px', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit' }}>+ Add Option</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {form.options.map((opt, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 60px 28px', gap: '8px', alignItems: 'center' }}>
                    <input style={inputStyle} placeholder="value (e.g. yes)" value={opt.option_value} onChange={e => updateOption(i, 'option_value', e.target.value)} />
                    <input style={inputStyle} placeholder="Label shown to user" value={opt.option_label} onChange={e => updateOption(i, 'option_label', e.target.value)} />
                    <input type="number" min="0" style={{ ...inputStyle, padding: '9px 6px', textAlign: 'center' }} placeholder="pts" value={opt.score_points} onChange={e => updateOption(i, 'score_points', e.target.value)} />
                    {form.options.length > 2 && (
                      <button onClick={() => removeOption(i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '16px', padding: '0' }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>Score points: how many risk points this answer adds (0 = no risk)</p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit', fontSize: '13px' }}>Cancel</button>
              <button onClick={saveQuestion} disabled={saving} style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
                {saving ? 'Saving...' : 'Save Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '28px', maxWidth: '400px', width: '90%', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '16px' }}>Deactivate Question?</h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>This question will be hidden from the assessment. Existing assessment data is not affected.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '7px', color: '#475569', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => deleteQuestion(deleteConfirm)} style={{ padding: '8px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#dc2626', cursor: 'pointer', fontWeight: '700', fontFamily: 'inherit' }}>Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default AdminScoringConfig;

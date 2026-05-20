import React, { useEffect, useState } from 'react';
import API_BASE from '../../config';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const chartTitle = { color: '#0f172a', margin: '0 0 20px 0', fontSize: '15px', fontWeight: '700' };

function AdminDashboard() {
  const navigate = useNavigate();
  const token = getToken();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackData, setFeedbackData] = useState(null);

  const handleExport = async (type) => {
    try {
      const res = await fetch(`${API_BASE}/api/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insureiq_${type}_export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export data. Please try again.');
    }
  };

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch(`${API_BASE}/api/analytics/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setMetrics(data.metrics);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    async function fetchFeedback() {
      try {
        const res = await fetch(`${API_BASE}/api/feedback/admin`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setFeedbackData(await res.json());
      } catch (err) {
        console.error('Error fetching feedback:', err);
      }
    }
    fetchMetrics();
    fetchFeedback();
  }, [token]);

  const usersData = {
    labels: ['Individuals', 'Providers', 'Admins'],
    datasets: [{
      data: metrics ? [metrics.usersByRole.individual || 0, metrics.usersByRole.provider || 0, metrics.usersByRole.admin || 0] : [0, 0, 0],
      backgroundColor: ['#10b981', '#4f46e5', '#ef4444'],
      borderWidth: 0,
    }]
  };

  const plansData = {
    labels: ['Pending', 'Approved', 'Rejected'],
    datasets: [{
      label: 'Insurance Plans',
      data: metrics ? [metrics.plansByStatus.pending || 0, metrics.plansByStatus.approved || 0, metrics.plansByStatus.rejected || 0] : [0, 0, 0],
      backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
      borderRadius: 6,
    }]
  };

  const riskDistData = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
    datasets: [{
      data: metrics ? [metrics.assessments?.byRisk?.LOW || 0, metrics.assessments?.byRisk?.MEDIUM || 0, metrics.assessments?.byRisk?.HIGH || 0] : [0, 0, 0],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 8,
    }]
  };

  const appPipelineData = {
    labels: ['Pending', 'Approved', 'Rejected'],
    datasets: [{
      label: 'Applications',
      data: metrics ? [metrics.applications?.byStatus?.pending || 0, metrics.applications?.byStatus?.approved || 0, metrics.applications?.byStatus?.rejected || 0] : [0, 0, 0],
      backgroundColor: ['#a78bfa', '#10b981', '#ef4444'],
      borderRadius: 6,
    }]
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#f1f5f9' } },
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  };

  const donutOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { color: '#475569', padding: 16, font: { size: 13 } } } },
    cutout: '72%'
  };



  const topbarActions = (
    <>
      <button onClick={() => navigate('/admin/user-management')} style={{ padding: '0.45rem 1rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '7px', color: '#475569', fontSize: '0.825rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
        👥 Manage Users
      </button>
      <button onClick={() => navigate('/admin/plan-approval')} style={{ padding: '0.45rem 1rem', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '0.825rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
        ✓ Review Plans
      </button>
    </>
  );

  return (
    <DashboardLayout role="admin" activePage="dashboard" pageTitle="Command Center" topbarActions={topbarActions}>
          <div className="dash-welcome">
            <h1>Command Center</h1>
            <p>Platform overview, analytics, and management hubs.</p>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading platform metrics..." />
          ) : (
            <>
              {/* Stat Cards */}
              <div className="dash-stats">
                {[
                  { label: 'Total Accounts', value: metrics?.totalUsers || 0, color: '#4f46e5', border: '#4f46e5' },
                  { label: 'Active Plans', value: metrics?.plansByStatus?.approved || 0, color: '#059669', border: '#10b981' },
                  { label: 'Pending Queue', value: metrics?.plansByStatus?.pending || 0, color: '#d97706', border: '#f59e0b' },
                  { label: 'Total Applications', value: metrics?.applications?.total || 0, color: '#7c3aed', border: '#a78bfa' },
                  { label: 'Avg Risk Score', value: metrics?.assessments?.avgScore || 0, color: '#475569', border: '#94a3b8', suffix: '' },
                  { label: 'Avg Feedback', value: feedbackData ? `★ ${feedbackData.avg_rating || '—'}` : '—', color: '#d97706', border: '#f59e0b', suffix: feedbackData?.total ? `/ 5 · ${feedbackData.total} ratings` : '' },
                ].map(({ label, value, color, border, suffix }) => (
                  <div key={label} className="stat-card" style={{ borderTop: `3px solid ${border}` }}>
                    <div className="stat-card-label">{label}</div>
                    <div className="stat-card-value" style={{ color }}>
                      {value}
                      {suffix && <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '400', marginLeft: '4px' }}>{suffix}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Data Export */}
              <div style={card}>
                <h3 style={chartTitle}>Export Data</h3>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
                  Download platform data as CSV files for reporting and analysis.
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'users', label: 'Users', icon: '👥' },
                    { key: 'assessments', label: 'Assessments', icon: '📊' },
                    { key: 'applications', label: 'Applications', icon: '📥' },
                    { key: 'feedback', label: 'Feedback', icon: '💬' }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => handleExport(item.key)}
                      style={{ padding: '10px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {item.icon} Export {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Charts Row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div style={card}>
                  <h3 style={chartTitle}>User Demographics</h3>
                  <div style={{ height: '240px', display: 'flex', justifyContent: 'center' }}>
                    <Doughnut data={usersData} options={donutOptions} />
                  </div>
                </div>
                <div style={card}>
                  <h3 style={chartTitle}>Plan Submissions by Status</h3>
                  <div style={{ height: '240px' }}>
                    <Bar data={plansData} options={chartOptions} />
                  </div>
                </div>
              </div>

              {/* Charts Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div style={card}>
                  <h3 style={chartTitle}>Platform Risk Distribution</h3>
                  <div style={{ height: '240px', display: 'flex', justifyContent: 'center' }}>
                    <Doughnut data={riskDistData} options={donutOptions} />
                  </div>
                </div>
                <div style={card}>
                  <h3 style={chartTitle}>Application Pipeline</h3>
                  <div style={{ height: '240px' }}>
                    <Bar data={appPipelineData} options={chartOptions} />
                  </div>
                </div>
              </div>

              {/* Recent Feedback */}
              {feedbackData?.feedback?.length > 0 && (
                <div style={card}>
                  <h3 style={chartTitle}>Recent User Feedback</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {feedbackData.feedback.slice(0, 5).map(fb => (
                      <div key={fb.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        <div style={{ flexShrink: 0 }}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <span key={s} style={{ fontSize: '14px', color: s <= fb.rating ? '#4f46e5' : '#e2e8f0' }}>★</span>
                          ))}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {fb.comment && <p style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '13px' }}>"{fb.comment}"</p>}
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>{fb.user_name || fb.user_email} · {new Date(fb.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
              ))}
                  </div>
                </div>
              )}
            </>
          )}
    </DashboardLayout>
  );
}

export default AdminDashboard;

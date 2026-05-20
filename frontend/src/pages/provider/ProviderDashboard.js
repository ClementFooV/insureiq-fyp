import React, { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken, getUser } from '../../utils/auth';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const chartTitle = { color: '#0f172a', margin: '0 0 20px 0', fontSize: '15px', fontWeight: '700' };

function ProviderDashboard() {
  const navigate = useNavigate();
  const token = getToken();
  const user = getUser();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackStats, setFeedbackStats] = useState(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch(`${API_BASE}/api/analytics/provider`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setAnalytics(await res.json());
      } catch (err) {
        console.error('Error fetching provider analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    async function fetchFeedback() {
      try {
        const res = await fetch(`${API_BASE}/api/feedback/provider`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setFeedbackStats(await res.json());
      } catch (err) {
        console.error('Error fetching feedback stats:', err);
      }
    }
    fetchAnalytics();
    fetchFeedback();
  }, [token]);

  const appStatusData = analytics ? {
    labels: ['Pending', 'Approved', 'Rejected'],
    datasets: [{
      data: [
        analytics.applications?.byStatus?.pending || 0,
        analytics.applications?.byStatus?.approved || 0,
        analytics.applications?.byStatus?.rejected || 0
      ],
      backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 8,
    }]
  } : null;

  const plansStatusData = analytics ? {
    labels: ['Pending', 'Approved', 'Rejected'],
    datasets: [{
      label: 'My Plans',
      data: [
        analytics.plans?.byStatus?.pending || 0,
        analytics.plans?.byStatus?.approved || 0,
        analytics.plans?.byStatus?.rejected || 0
      ],
      backgroundColor: ['#a78bfa', '#10b981', '#ef4444'],
      borderRadius: 6,
    }]
  } : null;

  const donutOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: '#475569', padding: 16, font: { size: 13 } } }
    },
    cutout: '72%'
  };

  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#f1f5f9' } },
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  };



  const topbarActions = (
    <>
      <button onClick={() => navigate('/provider/add-plan')} style={{ padding: '0.45rem 1rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '7px', color: '#475569', fontSize: '0.825rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
        ➕ Create Plan
      </button>
      <button onClick={() => navigate('/provider/applications')} style={{ padding: '0.45rem 1rem', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '0.825rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
        📥 Open Queue
      </button>
    </>
  );

  return (
    <DashboardLayout role="provider" activePage="dashboard" pageTitle="Dashboard" topbarActions={topbarActions}>
          <div className="dash-welcome">
            <h1>Welcome back, {user?.name?.split(' ')[0] || 'Provider'} 👋</h1>
            <p>Manage your insurance plans and review incoming applications.</p>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading dashboard analytics..." />
          ) : (
            <>
              {/* Stat Cards */}
              <div className="dash-stats">
                {[
                  { label: 'Total Applications', value: analytics?.applications?.total || 0, color: '#4f46e5', border: '#4f46e5' },
                  { label: 'Pending Review', value: analytics?.applications?.byStatus?.pending || 0, color: '#d97706', border: '#f59e0b' },
                  { label: 'Approved', value: analytics?.applications?.byStatus?.approved || 0, color: '#059669', border: '#10b981' },
                  { label: 'Avg Risk Score', value: analytics?.avgApplicantRiskScore || '—', color: '#7c3aed', border: '#7c3aed', suffix: '' },
                  { label: 'Applicant Satisfaction', value: feedbackStats?.avg_rating ? `★ ${feedbackStats.avg_rating}` : '—', color: '#d97706', border: '#f59e0b', suffix: feedbackStats?.total ? `/ 5 · ${feedbackStats.total} ratings` : '' },
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

              {/* Charts */}
              {(appStatusData || plansStatusData) && (
                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{ color: '#475569', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 1rem 0' }}>Analytics</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                    {appStatusData && (
                      <div style={card}>
                        <h3 style={chartTitle}>Application Pipeline</h3>
                        <div style={{ height: '240px', display: 'flex', justifyContent: 'center' }}>
                          <Doughnut data={appStatusData} options={donutOptions} />
                        </div>
                      </div>
                    )}
                    {plansStatusData && (
                      <div style={card}>
                        <h3 style={chartTitle}>My Plans by Status</h3>
                        <div style={{ height: '240px' }}>
                          <Bar data={plansStatusData} options={barOptions} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <h2 style={{ color: '#475569', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 1rem 0' }}>Quick Actions</h2>
              <div className="dash-cards">
                <div className="dash-card">
                  <div className="dash-card-icon">📄</div>
                  <h3>My Plans</h3>
                  <p>View and manage all your submitted insurance plans and their approval status.</p>
                  <button onClick={() => navigate('/provider/my-plans')} className="dash-card-btn btn-secondary">View Plans</button>
                </div>
                <div className="dash-card">
                  <div className="dash-card-icon">➕</div>
                  <h3>Add New Plan</h3>
                  <p>Submit a new insurance plan for admin review and approval to go live.</p>
                  <button onClick={() => navigate('/provider/add-plan')} className="dash-card-btn btn-secondary">Add Plan</button>
                </div>
                <div className="dash-card">
                  <div className="dash-card-icon">📥</div>
                  <h3>Applications Inbox</h3>
                  <p>Review and underwrite incoming prospect applications for your plans.</p>
                  <button onClick={() => navigate('/provider/applications')} className="dash-card-btn btn-primary">Open Queue</button>
                </div>
              </div>
            </>
          )}
    </DashboardLayout>
  );
}

export default ProviderDashboard;

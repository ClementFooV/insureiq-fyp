import React, { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, RadialLinearScale, Filler, Tooltip, Legend } from 'chart.js';
import { Line, Radar } from 'react-chartjs-2';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken, getUser } from '../../utils/auth';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, RadialLinearScale, Filler, Tooltip, Legend);

const card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const chartTitle = { color: '#0f172a', margin: '0 0 20px 0', fontSize: '15px', fontWeight: '700' };

function IndividualDashboard() {
  const token = getToken();
  const user = getUser();
  const [hasProfile, setHasProfile] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API_BASE}/api/profile`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/api/assessment/latest`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/api/analytics/individual`, { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(async ([profileRes, assessmentRes, analyticsRes]) => {
        const profileData = await profileRes.json();
        if (profileData.profile) setHasProfile(true);
        if (assessmentRes.ok) {
          const assessmentData = await assessmentRes.json();
          if (assessmentData?.total_score) setHasAssessment(true);
        }
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [token]);

  // ---- Chart Data ----
  const scoreHistoryData = analytics?.scoreHistory?.length > 0 ? {
    labels: analytics.scoreHistory.map((item, i) => {
      const d = new Date(item.date);
      return `#${i + 1} (${d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })})`;
    }),
    datasets: [{
      label: 'Risk Score',
      data: analytics.scoreHistory.map(item => item.score),
      borderColor: '#4f46e5',
      backgroundColor: 'rgba(79,70,229,0.08)',
      fill: true, tension: 0.4,
      pointBackgroundColor: analytics.scoreHistory.map(item =>
        item.riskLevel === 'HIGH' ? '#ef4444' : item.riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981'),
      pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 6, pointHoverRadius: 9,
    }]
  } : null;

  const radarData = analytics?.latestBreakdown ? {
    labels: Object.keys(analytics.latestBreakdown),
    datasets: [{
      label: 'Your Risk Profile',
      data: Object.values(analytics.latestBreakdown),
      backgroundColor: 'rgba(79,70,229,0.1)',
      borderColor: '#4f46e5', borderWidth: 2,
      pointBackgroundColor: '#4f46e5', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5,
    }]
  } : null;

  const lineOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1,
        titleColor: '#0f172a', bodyColor: '#475569', padding: 12,
        callbacks: { label: (ctx) => { const item = analytics.scoreHistory[ctx.dataIndex]; return `Score: ${item.score} (${item.riskLevel} Risk)`; } }
      }
    },
    scales: {
      y: { min: 0, ticks: { color: '#94a3b8' }, grid: { color: '#f1f5f9' } },
      x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } }
    }
  };

  const radarOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      r: {
        beginAtZero: true, max: 70,
        ticks: { color: '#94a3b8', backdropColor: 'transparent', stepSize: 14, font: { size: 10 } },
        grid: { color: '#e2e8f0' },
        pointLabels: { color: '#475569', font: { size: 12, weight: '500' } },
        angleLines: { color: '#e2e8f0' }
      }
    }
  };

  const topbarActions = hasProfile && !isLoading ? (
    <Link to="/profile-setup" style={{ padding: '0.45rem 1rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '7px', color: '#475569', fontSize: '0.825rem', fontWeight: '600', textDecoration: 'none' }}>
      Edit Profile
    </Link>
  ) : null;

  return (
    <DashboardLayout role="individual" activePage="dashboard" pageTitle="Dashboard" topbarActions={topbarActions}>
      <div className="dash-welcome">
        <h1>Welcome back, {user.name?.split(' ')[0] || 'there'} 👋</h1>
        <p>Here's an overview of your insurance health and risk status.</p>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading dashboard data..." />
      ) : (
        <>
          {/* Profile incomplete banner */}
          {!hasProfile && (
            <div className="dash-banner">
              <div className="dash-banner-text">
                <h3>Complete Your Profile First</h3>
                <p>Your profile is needed before you can start a risk assessment.</p>
              </div>
              <Link to="/profile-setup" style={{ padding: '0.55rem 1.25rem', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Setup Profile
              </Link>
            </div>
          )}

          {/* Application stats */}
          {analytics?.applications?.total > 0 && (
            <div className="dash-stats">
              <div className="stat-card" style={{ borderTop: '3px solid #f59e0b' }}>
                <div className="stat-card-label">Pending</div>
                <div className="stat-card-value" style={{ color: '#d97706' }}>{analytics.applications.byStatus.pending}</div>
              </div>
              <div className="stat-card" style={{ borderTop: '3px solid #10b981' }}>
                <div className="stat-card-label">Approved</div>
                <div className="stat-card-value" style={{ color: '#059669' }}>{analytics.applications.byStatus.approved}</div>
              </div>
              <div className="stat-card" style={{ borderTop: '3px solid #ef4444' }}>
                <div className="stat-card-label">Rejected</div>
                <div className="stat-card-value" style={{ color: '#dc2626' }}>{analytics.applications.byStatus.rejected}</div>
              </div>
            </div>
          )}

          {/* Charts */}
          {hasAssessment && analytics && (scoreHistoryData || radarData) && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569' }}>Risk Overview</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {scoreHistoryData && (
                  <div style={card}>
                    <h3 style={chartTitle}>Score History</h3>
                    <div style={{ height: '240px' }}><Line data={scoreHistoryData} options={lineOptions} /></div>
                    <p style={{ color: '#94a3b8', fontSize: '12px', margin: '12px 0 0 0', textAlign: 'center' }}>
                      {analytics.scoreHistory.length} assessment{analytics.scoreHistory.length !== 1 ? 's' : ''} recorded
                    </p>
                  </div>
                )}
                {radarData && (
                  <div style={card}>
                    <h3 style={chartTitle}>Latest Risk Breakdown</h3>
                    <div style={{ height: '240px' }}><Radar data={radarData} options={radarOptions} /></div>
                    <p style={{ color: '#94a3b8', fontSize: '12px', margin: '12px 0 0 0', textAlign: 'center' }}>Higher values = higher risk exposure</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feature cards */}
          <h2 style={{ color: '#475569', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 1rem 0' }}>Quick Actions</h2>
          <div className="dash-cards">
            <div className="dash-card">
              <div className="dash-card-icon">📋</div>
              <h3>Risk Assessment</h3>
              <p>Answer a few questions to evaluate your insurance risk level and get coverage recommendations.</p>
              {!hasProfile ? (
                <button className="dash-card-btn btn-disabled" disabled>Start Assessment</button>
              ) : !hasAssessment ? (
                <Link to="/assessment" className="dash-card-btn btn-primary">Start Assessment</Link>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Link to="/results" className="dash-card-btn btn-primary">View Results</Link>
                  <Link to="/assessment" className="dash-card-btn btn-secondary">Retake</Link>
                </div>
              )}
            </div>

            <div className="dash-card">
              <div className="dash-card-icon">🔍</div>
              <h3>Browse Plans</h3>
              <p>Explore approved insurance plans from trusted providers. See your personalised matches.</p>
              <Link to="/browse-plans" className="dash-card-btn btn-secondary">Browse Plans</Link>
            </div>

            <div className="dash-card">
              <div className="dash-card-icon">📥</div>
              <h3>My Applications</h3>
              <p>Track the status of the insurance plans you've applied for.</p>
              <Link to="/my-applications" className="dash-card-btn btn-secondary">Track Applications</Link>
            </div>

            <div className="dash-card">
              <div className="dash-card-icon">📁</div>
              <h3>Assessment History</h3>
              <p>Review your past risk assessments and download detailed PDF reports.</p>
              {hasAssessment
                ? <Link to="/assessment-history" className="dash-card-btn btn-secondary">View History</Link>
                : <button className="dash-card-btn btn-disabled" disabled>View History</button>
              }
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

export default IndividualDashboard;

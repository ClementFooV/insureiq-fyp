import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, clearToken, setPageTitle } from '../utils/auth';
import NotificationBell from './NotificationBell';
import '../styles/Dashboard.css';

/**
 * DashboardLayout — shared shell for all authenticated pages.
 * Renders the sidebar, topbar, and wraps page content.
 *
 * Props:
 *  - role: 'individual' | 'admin' | 'provider'
 *  - activePage: string key matching a nav item (e.g. 'dashboard', 'browse-plans')
 *  - pageTitle: string shown in topbar and browser tab
 *  - topbarActions: optional JSX for extra buttons in the topbar
 *  - children: the page content
 */

const NAV_CONFIG = {
  individual: {
    label: 'Menu',
    badgeClass: 'badge-individual',
    badgeText: 'Individual',
    items: [
      { key: 'dashboard',          icon: '🏠', label: 'Dashboard',       path: '/dashboard' },
      { key: 'assessment',         icon: '📋', label: 'Risk Assessment', path: '/assessment' },
      { key: 'browse-plans',       icon: '🔍', label: 'Browse Plans',    path: '/browse-plans' },
      { key: 'my-applications',    icon: '📥', label: 'My Applications', path: '/my-applications' },
      { key: 'my-claims',          icon: '🗂', label: 'My Claims',       path: '/my-claims' },
      { key: 'assessment-history', icon: '📁', label: 'History',         path: '/assessment-history' },
    ]
  },
  admin: {
    label: 'Admin Panel',
    badgeClass: 'badge-admin',
    badgeText: 'Admin',
    items: [
      { key: 'dashboard',       icon: '🏠', label: 'Dashboard',       path: '/admin/dashboard' },
      { key: 'plan-approval',   icon: '✓',  label: 'Plan Approval',   path: '/admin/plan-approval' },
      { key: 'user-management', icon: '👥', label: 'User Management', path: '/admin/user-management' },
      { key: 'assessments',     icon: '📋', label: 'Assessments',     path: '/admin/assessments' },
      { key: 'applications',    icon: '📥', label: 'Applications',    path: '/admin/applications' },
      { key: 'feedback',        icon: '💬', label: 'Feedback',        path: '/admin/feedback' },
      { key: 'scoring-config',  icon: '⚙',  label: 'Scoring',         path: '/admin/scoring-config' },
      { key: 'claims',          icon: '🗂', label: 'Claims',           path: '/admin/claims' },
      { key: 'knowledge',       icon: '🧠', label: 'AI Knowledge',    path: '/admin/knowledge' },
    ]
  },
  provider: {
    label: 'Provider Portal',
    badgeClass: 'badge-provider',
    badgeText: 'Provider',
    items: [
      { key: 'dashboard',    icon: '🏠', label: 'Dashboard',    path: '/provider/dashboard' },
      { key: 'my-plans',     icon: '📄', label: 'My Plans',     path: '/provider/my-plans' },
      { key: 'add-plan',     icon: '➕', label: 'Add Plan',     path: '/provider/add-plan' },
      { key: 'applications', icon: '📥', label: 'Applications', path: '/provider/applications' },
      { key: 'claims',       icon: '🗂', label: 'Claims',        path: '/provider/claims' },
    ]
  }
};

function DashboardLayout({ role = 'individual', activePage = 'dashboard', pageTitle = 'Dashboard', topbarActions, children }) {
  const navigate = useNavigate();
  const user = getUser();
  const config = NAV_CONFIG[role] || NAV_CONFIG.individual;
  const initials = (user?.name || user?.email || 'U').charAt(0).toUpperCase();

  useEffect(() => {
    setPageTitle(pageTitle);
  }, [pageTitle]);

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">
          <div className="dash-sidebar-logo-icon">
            <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span>InsureIQ</span>
        </div>

        <div className="dash-nav-label">{config.label}</div>
        {config.items.map(item => (
          <button
            key={item.key}
            className={`dash-nav-item${activePage === item.key ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span> {item.label}
          </button>
        ))}

        <div className="dash-sidebar-footer">
          <div className="dash-user-info">
            <div className="dash-avatar">{initials}</div>
            <div>
              <div className="dash-user-name">{user?.name || user?.email}</div>
              <span className={`dash-role-badge ${config.badgeClass}`}>{config.badgeText}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      {/* Content */}
      <div className="dash-content">
        <header className="dash-topbar">
          <span className="dash-topbar-title">{pageTitle}</span>
          <div className="dash-topbar-right">
            <NotificationBell />
            {topbarActions}
          </div>
        </header>

        <main className="dash-main">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;

import React, { useState, useEffect, useCallback } from 'react';
import API_BASE from '../../config';

import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';

const roleBadgeColors = {
  admin:      { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
  provider:   { bg: '#eef2ff', border: '#c7d2fe', color: '#4f46e5' },
  individual: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' }
};

const statusColors = {
  active:    { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
  suspended: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' }
};

function AdminUserManagement() {
  const token = getToken();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const [editForm, setEditForm] = useState({ name: '', password: '' });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const [editProfileForm, setEditProfileForm] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setCurrentPage(1); }, [filter, search]);

  const fetchUserProfile = async (userId) => {
    setProfileLoading(true);
    setUserProfile(null);
    setEditProfileForm(null);
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUserProfile(data.profile);
      const defaults = { age: '', gender: 'male', employment_status: 'employed', monthly_income: '', num_dependents: '0', total_liabilities: '0', health_status: 'healthy', smoker: false, savings: '0' };
      setEditProfileForm(data.profile ? { ...defaults, ...data.profile } : defaults);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCreateProvider = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    if (!createForm.name || !createForm.email || !createForm.password || !createForm.confirmPassword) return setCreateError('All fields are required.');
    if (createForm.password !== createForm.confirmPassword) return setCreateError('Passwords do not match.');
    try {
      const res = await fetch(`${API_BASE}/api/users/create-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: createForm.name, email: createForm.email, password: createForm.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCreateSuccess('Provider created successfully!');
      setCreateForm({ name: '', email: '', password: '', confirmPassword: '' });
      fetchUsers();
      setTimeout(() => { setShowCreateModal(false); setCreateSuccess(''); }, 1500);
    } catch (err) {
      setCreateError(err.message);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    const payload = {};
    if (editForm.name && editForm.name !== editingUser.name) payload.name = editForm.name;
    if (editForm.password) payload.password = editForm.password;
    if (Object.keys(payload).length === 0) return setEditError('No changes detected.');
    try {
      const res = await fetch(`${API_BASE}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setEditSuccess('User updated successfully!');
      fetchUsers();
      setTimeout(() => { setEditingUser(null); setEditSuccess(''); }, 1200);
    } catch (err) {
      setEditError(err.message);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/users/${editingUser.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editProfileForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setProfileSuccess('Profile updated successfully!');
      fetchUserProfile(editingUser.id);
    } catch (err) {
      setProfileError(err.message);
    }
  };

  const handleToggleStatus = async (u) => {
    const action = u.status === 'suspended' ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${action} the account for "${u.name || u.email}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${u.id}/toggle-status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${userName}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setEditForm({ name: u.name || '', password: '' });
    setEditError('');
    setEditSuccess('');
    setProfileError('');
    setProfileSuccess('');
    fetchUserProfile(u.id);
  };

  const filtered = users.filter(u => {
    if (filter !== 'all' && u.role !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (u.name && u.name.toLowerCase().includes(s)) || (u.email && u.email.toLowerCase().includes(s));
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Joined Date'];
    const rows = filtered.map(u => [
      `"${u.name || ''}"`, `"${u.email}"`, `"${u.role}"`,
      `"${u.status || 'active'}"`,
      `"${u.created_at ? new Date(u.created_at).toLocaleDateString() : ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'users_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const EyeIcon = ({ open }) => open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' };
  const modalBox = { background: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '600px', width: '100%', border: '1px solid #e2e8f0', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' };
  const inputStyle = { width: '100%', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelStyle = { display: 'block', color: '#475569', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' };
  const pwWrapper = { position: 'relative', display: 'flex', alignItems: 'center' };
  const eyeBtn = { position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', display: 'flex' };



  const topbarActions = (
    <>
      <button onClick={handleExportCSV} style={{ padding: '0.45rem 1rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '7px', color: '#475569', fontSize: '0.825rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
        ⬇ Export CSV
      </button>
      <button onClick={() => { setShowCreateModal(true); setCreateError(''); setCreateSuccess(''); }}
        style={{ padding: '0.45rem 1rem', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '0.825rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
        + Create Provider
      </button>
    </>
  );

  return (
    <DashboardLayout role="admin" activePage="user-management" pageTitle="User Management" topbarActions={topbarActions}>
          <div className="dash-welcome">
            <h1>User Management</h1>
            <p>Manage all registered users on the platform.</p>
          </div>

          {/* Search + Filter */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
              style={{ ...inputStyle, flex: 1, minWidth: '200px' }} />
            <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0' }}>
              {['all', 'individual', 'provider', 'admin'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: '8px 14px', background: 'none', border: 'none', borderBottom: filter === f ? '2px solid #4f46e5' : '2px solid transparent', marginBottom: '-2px', color: filter === f ? '#4f46e5' : '#94a3b8', cursor: 'pointer', fontWeight: filter === f ? '700' : '500', fontSize: '13px', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                  {f}{f !== 'all' && ` (${users.filter(u => u.role === f).length})`}
                </button>
              ))}
            </div>
          </div>

          {loading && <LoadingSpinner message="Loading users..." />}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#94a3b8' }}>No users found.</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <>
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h, i) => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: i === 5 ? 'right' : 'left', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((u, i) => {
                      const rc = roleBadgeColors[u.role] || roleBadgeColors.individual;
                      const sc = statusColors[u.status] || statusColors.active;
                      return (
                        <tr key={u.id} style={{ borderBottom: i < currentData.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '14px 16px', color: '#0f172a', fontSize: '14px', fontWeight: '500' }}>
                            {u.name || '—'}
                            {u.google_id && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#94a3b8' }}>(Google)</span>}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#475569', fontSize: '13px' }}>{u.email}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', background: rc.bg, border: `1px solid ${rc.border}`, color: rc.color }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                              {u.status || 'active'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '13px' }}>
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button onClick={() => openEdit(u)}
                              style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', marginRight: '5px', fontFamily: 'inherit' }}>
                              ✏️ Edit
                            </button>
                            {u.role !== 'admin' && (
                              <>
                                <button onClick={() => handleToggleStatus(u)}
                                  style={{ background: u.status === 'suspended' ? '#f0fdf4' : '#fffbeb', border: `1px solid ${u.status === 'suspended' ? '#bbf7d0' : '#fde68a'}`, color: u.status === 'suspended' ? '#16a34a' : '#d97706', cursor: 'pointer', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', marginRight: '5px', fontFamily: 'inherit' }}>
                                  {u.status === 'suspended' ? '✓ Activate' : '⏸ Suspend'}
                                </button>
                                <button onClick={() => handleDeleteUser(u.id, u.name || u.email)}
                                  style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontFamily: 'inherit' }}>
                                  🗑️ Delete
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                    Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} users
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      style={{ padding: '6px 12px', background: '#f1f5f9', color: currentPage === 1 ? '#94a3b8' : '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                      Previous
                    </button>
                    <span style={{ color: '#475569', fontSize: '13px', padding: '6px 8px' }}>Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      style={{ padding: '6px 12px', background: '#f1f5f9', color: currentPage === totalPages ? '#94a3b8' : '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}


      {/* CREATE PROVIDER MODAL */}
      {showCreateModal && (
        <div style={modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#0f172a', margin: 0, fontWeight: '700' }}>Create Provider Account</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: '#f1f5f9', border: 'none', color: '#475569', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', fontFamily: 'inherit' }}>✕</button>
            </div>

            {createError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{createError}</div>}
            {createSuccess && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{createSuccess}</div>}

            <form onSubmit={handleCreateProvider}>
              {[
                { label: 'Company / Provider Name', key: 'name', type: 'text', placeholder: 'e.g. Great Eastern Insurance' },
                { label: 'Email Address', key: 'email', type: 'email', placeholder: 'e.g. admin@greateastern.com' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type} value={createForm[key]} placeholder={placeholder}
                    onChange={e => setCreateForm(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}
              {['password', 'confirmPassword'].map(key => (
                <div key={key} style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>{key === 'password' ? 'Password' : 'Confirm Password'}</label>
                  <div style={pwWrapper}>
                    <input type={showPassword ? 'text' : 'password'} value={createForm[key]}
                      placeholder={key === 'password' ? 'Strong password' : 'Re-enter password'}
                      onChange={e => setCreateForm(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtn}><EyeIcon open={showPassword} /></button>
                  </div>
                </div>
              ))}
              <button type="submit" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px', fontFamily: 'inherit', marginTop: '8px' }}>
                Create Provider Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div style={modalOverlay} onClick={() => setEditingUser(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#0f172a', margin: 0, fontWeight: '700' }}>Edit User</h2>
              <button onClick={() => setEditingUser(null)} style={{ background: '#f1f5f9', border: 'none', color: '#475569', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', fontFamily: 'inherit' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              {[['Email', editingUser.email], ['Role', editingUser.role], ['Joined', editingUser.created_at ? new Date(editingUser.created_at).toLocaleDateString() : '—']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>{k}</span>
                  <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: '500', textTransform: k === 'Role' ? 'capitalize' : 'none' }}>{v}</span>
                </div>
              ))}
            </div>

            {editError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{editError}</div>}
            {editSuccess && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{editSuccess}</div>}

            <form onSubmit={handleUpdateUser}>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Name</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>New Password</label>
                <div style={pwWrapper}>
                  <input type={showPassword ? 'text' : 'password'} value={editForm.password}
                    onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Leave blank to keep current" style={inputStyle} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtn}><EyeIcon open={showPassword} /></button>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>Only fill this to reset the user's password.</p>
              </div>
              <button type="submit" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px', fontFamily: 'inherit' }}>
                Save Changes
              </button>
            </form>

            {editingUser.role === 'individual' && (
              <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <h3 style={{ color: '#0f172a', fontSize: '15px', marginBottom: '12px', fontWeight: '700' }}>📋 User Profile Override</h3>
                {profileLoading ? (
                  <LoadingSpinner message="Loading profile..." size="sm" />
                ) : editProfileForm && (
                  <form onSubmit={handleUpdateProfile} style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    {profileError && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px' }}>{profileError}</div>}
                    {profileSuccess && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '8px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px' }}>{profileSuccess}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div><label style={{ ...labelStyle, fontSize: '11px' }}>Age</label><input type="number" value={editProfileForm.age} onChange={e => setEditProfileForm(p => ({ ...p, age: e.target.value }))} style={{ ...inputStyle, padding: '8px' }} required /></div>
                      <div><label style={{ ...labelStyle, fontSize: '11px' }}>Gender</label><select value={editProfileForm.gender} onChange={e => setEditProfileForm(p => ({ ...p, gender: e.target.value }))} style={{ ...inputStyle, padding: '8px' }}><option value="male">Male</option><option value="female">Female</option></select></div>
                      <div><label style={{ ...labelStyle, fontSize: '11px' }}>Employment</label><select value={editProfileForm.employment_status} onChange={e => setEditProfileForm(p => ({ ...p, employment_status: e.target.value }))} style={{ ...inputStyle, padding: '8px' }}><option value="employed">Employed</option><option value="self-employed">Self-Employed</option><option value="unemployed">Unemployed</option></select></div>
                      <div><label style={{ ...labelStyle, fontSize: '11px' }}>Monthly Income (RM)</label><input type="number" value={editProfileForm.monthly_income} onChange={e => setEditProfileForm(p => ({ ...p, monthly_income: e.target.value }))} style={{ ...inputStyle, padding: '8px' }} required /></div>
                      <div><label style={{ ...labelStyle, fontSize: '11px' }}>Dependents</label><input type="number" value={editProfileForm.num_dependents} onChange={e => setEditProfileForm(p => ({ ...p, num_dependents: e.target.value }))} style={{ ...inputStyle, padding: '8px' }} required /></div>
                      <div><label style={{ ...labelStyle, fontSize: '11px' }}>Total Liabilities (RM)</label><input type="number" value={editProfileForm.total_liabilities} onChange={e => setEditProfileForm(p => ({ ...p, total_liabilities: e.target.value }))} style={{ ...inputStyle, padding: '8px' }} required /></div>
                      <div><label style={{ ...labelStyle, fontSize: '11px' }}>Savings (RM)</label><input type="number" value={editProfileForm.savings} onChange={e => setEditProfileForm(p => ({ ...p, savings: e.target.value }))} style={{ ...inputStyle, padding: '8px' }} required /></div>
                      <div><label style={{ ...labelStyle, fontSize: '11px' }}>Health Status</label><select value={editProfileForm.health_status} onChange={e => setEditProfileForm(p => ({ ...p, health_status: e.target.value }))} style={{ ...inputStyle, padding: '8px' }}><option value="healthy">Healthy</option><option value="minor_issues">Minor Issues</option><option value="chronic">Chronic</option></select></div>
                      <div><label style={{ ...labelStyle, fontSize: '11px' }}>Smoker</label><select value={editProfileForm.smoker ? 'true' : 'false'} onChange={e => setEditProfileForm(p => ({ ...p, smoker: e.target.value === 'true' }))} style={{ ...inputStyle, padding: '8px' }}><option value="false">No</option><option value="true">Yes</option></select></div>
                    </div>
                    <button type="submit" style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', fontFamily: 'inherit' }}>
                      Save Profile Data
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default AdminUserManagement;

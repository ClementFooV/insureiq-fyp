import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { getToken } from '../../utils/auth';
import '../../styles/AdminKnowledgeBase.css';

const API = 'http://localhost:5000/api/client/markdown';

function AdminKnowledgeBase() {
  const [documents, setDocuments]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);

  // Modal state
  const [showModal, setShowModal]   = useState(false);
  const [editDoc, setEditDoc]       = useState(null);  // null = add mode, object = edit mode
  const [inputMode, setInputMode]   = useState('paste'); // 'paste' | 'upload'
  const [title, setTitle]           = useState('');
  const [markdown, setMarkdown]     = useState('');
  const [file, setFile]             = useState(null);
  const [processing, setProcessing] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fileInputRef = useRef(null);

  // ── Fetch documents ──
  const fetchDocs = async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      if (data.ok) setDocuments(data.documents);
    } catch (e) {
      console.error('Failed to fetch documents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  // ── Toast auto-clear ──
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ── Open Add Modal ──
  const openAddModal = () => {
    setEditDoc(null);
    setTitle('');
    setMarkdown('');
    setFile(null);
    setInputMode('paste');
    setShowModal(true);
  };

  // ── Open Edit Modal ──
  const openEditModal = (doc) => {
    setEditDoc(doc);
    setTitle(doc.title);
    setMarkdown(doc.raw_content || '');
    setFile(null);
    setInputMode('paste');
    setShowModal(true);
  };

  // ── Handle file selection ──
  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.md$/i, '').replace(/_/g, ' '));

      const reader = new FileReader();
      reader.onload = (ev) => setMarkdown(ev.target.result);
      reader.readAsText(f);
    }
  };

  // ── Handle drag & drop ──
  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.endsWith('.md')) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.md$/i, '').replace(/_/g, ' '));

      const reader = new FileReader();
      reader.onload = (ev) => setMarkdown(ev.target.result);
      reader.readAsText(f);
    }
  };

  // ── Submit (Add or Update) ──
  const handleSubmit = async () => {
    if (!markdown.trim()) {
      setToast({ type: 'error', msg: 'Please provide some markdown content.' });
      return;
    }
    setProcessing(true);
    try {
      let res;
      if (editDoc) {
        // UPDATE existing
        res = await fetch(`${API}/${editDoc.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title || undefined, markdown }),
        });
      } else {
        // CREATE new
        res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title || undefined, markdown }),
        });
      }

      const data = await res.json();
      if (data.ok) {
        setToast({ type: 'success', msg: `${editDoc ? 'Updated' : 'Created'} "${data.title}" — ${data.chunks} chunks processed.` });
        setShowModal(false);
        fetchDocs();
      } else {
        setToast({ type: 'error', msg: data.error || 'Something went wrong.' });
      }
    } catch (e) {
      setToast({ type: 'error', msg: 'Failed to connect to server.' });
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => {
    const allSelected = documents.length > 0 && documents.every(d => selectedIds.has(d.id));
    setSelectedIds(allSelected ? new Set() : new Set(documents.map(d => d.id)));
  };
  const handleBulkDelete = async () => {
    setBulkDeleteConfirm(false);
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => fetch(`${API}/${id}`, { method: 'DELETE' })));
      setDocuments(prev => prev.filter(d => !selectedIds.has(d.id)));
      setSelectedIds(new Set());
      setToast({ type: 'success', msg: 'Selected documents deleted from AI memory.' });
    } catch { setToast({ type: 'error', msg: 'Some deletions failed.' }); }
    setBulkDeleting(false);
  };

  // ── Delete ──
  const handleDelete = async (docId) => {
    try {
      const res = await fetch(`${API}/${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setToast({ type: 'success', msg: 'Document deleted from AI memory.' });
        setConfirmDelete(null);
        fetchDocs();
      } else {
        setToast({ type: 'error', msg: data.error || 'Delete failed.' });
      }
    } catch (e) {
      setToast({ type: 'error', msg: 'Failed to connect to server.' });
    }
  };

  // ── Stats ──
  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);

  return (
    <DashboardLayout role="admin" activePage="knowledge" pageTitle="AI Knowledge Base">
      {/* Toast */}
      {toast && (
        <div className={`kb-toast ${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="kb-header">
        <div>
          <h1>🧠 AI Knowledge Base</h1>
          <p>Manage the documents that power your AI chatbot's intelligence.</p>
        </div>
        <button className="kb-add-btn" onClick={openAddModal}>
          ＋ Add New Knowledge
        </button>
      </div>

      {/* Stats */}
      <div className="kb-stats">
        <div className="kb-stat-card">
          <div className="kb-stat-label">Total Documents</div>
          <div className="kb-stat-value">{documents.length}</div>
        </div>
        <div className="kb-stat-card">
          <div className="kb-stat-label">Total AI Chunks</div>
          <div className="kb-stat-value">{totalChunks}</div>
        </div>
        <div className="kb-stat-card">
          <div className="kb-stat-label">Status</div>
          <div className="kb-stat-value" style={{ color: documents.length > 0 ? '#10b981' : '#f59e0b', fontSize: '1.1rem' }}>
            {documents.length > 0 ? '● Trained' : '● Untrained'}
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="kb-table-wrapper">
        {loading ? (
          <div className="kb-empty">
            <div className="kb-processing"><div className="kb-spinner"></div> Loading documents...</div>
          </div>
        ) : documents.length === 0 ? (
          <div className="kb-empty">
            <div className="kb-empty-icon">📭</div>
            <h3>No documents loaded yet</h3>
            <p>Click "Add New Knowledge" to train your AI chatbot with data.</p>
          </div>
        ) : (
          <>
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px 16px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '10px' }}>
              <span style={{ color: '#4f46e5', fontSize: '13px', fontWeight: '600' }}>{selectedIds.size} selected</span>
              <button onClick={() => setBulkDeleteConfirm(true)} disabled={bulkDeleting}
                style={{ padding: '7px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size}`}
              </button>
              <button onClick={() => setSelectedIds(new Set())}
                style={{ padding: '7px 14px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear
              </button>
            </div>
          )}
          <table className="kb-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}><input type="checkbox" checked={documents.length > 0 && documents.every(d => selectedIds.has(d.id))} onChange={toggleSelectAll} style={{ cursor: 'pointer', accentColor: '#4f46e5' }} /></th>
                <th>Document Title</th>
                <th>Chunks</th>
                <th>Date Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} style={{ background: selectedIds.has(doc.id) ? '#f5f3ff' : undefined }}>
                  <td><input type="checkbox" checked={selectedIds.has(doc.id)} onChange={() => toggleSelect(doc.id)} style={{ cursor: 'pointer', accentColor: '#4f46e5' }} /></td>
                  <td><span className="kb-doc-title">{doc.title}</span></td>
                  <td><span className="kb-chunk-badge">{doc.chunk_count} chunks</span></td>
                  <td><span className="kb-date">{new Date(doc.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</span></td>
                  <td>
                    <div className="kb-actions">
                      <button className="kb-action-btn edit" onClick={() => openEditModal(doc)}>✏️ Edit</button>
                      <button className="kb-action-btn delete" onClick={() => setConfirmDelete(doc)}>🗑 Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      {/* ═══ Add / Edit Modal ═══ */}
      {showModal && (
        <div className="kb-modal-overlay" onClick={() => !processing && setShowModal(false)}>
          <div className="kb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="kb-modal-header">
              <h2>{editDoc ? '✏️ Edit Document' : '📄 Add New Knowledge'}</h2>
              <button className="kb-modal-close" onClick={() => !processing && setShowModal(false)}>&times;</button>
            </div>

            <div className="kb-modal-body">
              {/* Title Field */}
              <div className="kb-form-group">
                <label>Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. InsureIQ User Manual"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={processing}
                />
              </div>

              {/* Input Mode Toggle (only for Add mode) */}
              {!editDoc && (
                <div className="kb-input-toggle">
                  <button className={`kb-toggle-btn ${inputMode === 'paste' ? 'active' : ''}`} onClick={() => setInputMode('paste')}>
                    📝 Paste Text
                  </button>
                  <button className={`kb-toggle-btn ${inputMode === 'upload' ? 'active' : ''}`} onClick={() => setInputMode('upload')}>
                    📁 Upload File
                  </button>
                </div>
              )}

              {/* Paste Text Area */}
              {(inputMode === 'paste' || editDoc) && (
                <div className="kb-form-group">
                  <label>Content (Markdown)</label>
                  <textarea
                    placeholder="Paste your knowledge content here... (supports Markdown formatting)"
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    disabled={processing}
                  />
                </div>
              )}

              {/* File Upload */}
              {inputMode === 'upload' && !editDoc && (
                <div className="kb-form-group">
                  <label>Upload Markdown File</label>
                  <div
                    className="kb-file-drop"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                    onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                    onDrop={handleDrop}
                  >
                    <div className="kb-file-drop-icon">📂</div>
                    <p>Drag & drop a <span className="highlight">.md</span> file here, or <span className="highlight">click to browse</span></p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  {file && (
                    <div className="kb-file-selected">
                      📄 <span>{file.name}</span>
                      <button className="kb-file-remove" onClick={() => { setFile(null); setMarkdown(''); }}>&times;</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="kb-modal-footer">
              {processing ? (
                <div className="kb-processing">
                  <div className="kb-spinner"></div>
                  Training AI... This may take a moment.
                </div>
              ) : (
                <>
                  <button className="kb-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                  <button
                    className="kb-btn-submit"
                    onClick={handleSubmit}
                    disabled={!markdown.trim()}
                  >
                    {editDoc ? '💾 Save & Retrain' : '🚀 Train AI'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {bulkDeleteConfirm && (
        <div className="kb-confirm-overlay" onClick={() => setBulkDeleteConfirm(false)}>
          <div className="kb-confirm-box" onClick={(e) => e.stopPropagation()}>
            <h3>🗑️ Delete {selectedIds.size} Documents?</h3>
            <p>This will permanently remove <strong>{selectedIds.size} documents</strong> and all their AI chunks from memory. This cannot be undone.</p>
            <div className="kb-confirm-actions">
              <button className="kb-btn-cancel" onClick={() => setBulkDeleteConfirm(false)}>Cancel</button>
              <button className="kb-btn-danger" onClick={handleBulkDelete}>Yes, Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Delete Confirm Dialog ═══ */}
      {confirmDelete && (
        <div className="kb-confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="kb-confirm-box" onClick={(e) => e.stopPropagation()}>
            <h3>🗑️ Delete Document?</h3>
            <p>
              Are you sure you want to permanently remove <strong>"{confirmDelete.title}"</strong> from the
              AI's memory? This will delete {confirmDelete.chunk_count} chunks and cannot be undone.
            </p>
            <div className="kb-confirm-actions">
              <button className="kb-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="kb-btn-danger" onClick={() => handleDelete(confirmDelete.id)}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default AdminKnowledgeBase;

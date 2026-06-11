import React, { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getToken } from '../../utils/auth';

const RISK_COLORS = {
  LOW:    { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  MEDIUM: { bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
  HIGH:   { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' }
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatRM(amount) {
  return 'RM ' + Number(amount).toLocaleString('en-MY');
}

function AssessmentHistory() {
  const token = getToken();
  const [history, setHistory] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingId, setGeneratingId] = useState(null);

  const generatePDF = async (item) => {
    setGeneratingId(item.id);
    const element = document.getElementById(`history-card-${item.id}`);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1000
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pdfWidth, pageHeight, 'F');
      pdf.setFontSize(18);
      pdf.setTextColor(15, 23, 42);
      pdf.text('InsureIQ Official Results PDF', 14, 20);
      pdf.setFontSize(12);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

      let heightLeft = imgHeight;
      let position = 35;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= (pageHeight - 35);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, pageHeight, 'F');
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`InsureIQ_Archive_${item.id}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error: ', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingId(null);
    }
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/assessment/history`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setHistory(data);
        else setError(data.message || 'Failed to load history');
        setLoading(false);
      })
      .catch(() => {
        setError('Network error. Is the backend running?');
        setLoading(false);
      });
  }, [token]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const toggleExpand = (id) => setExpanded(prev => (prev === id ? null : id));

  return (
    <DashboardLayout role="individual" activePage="assessment-history" pageTitle="Assessment History">
          {loading ? (
            <LoadingSpinner message="Loading assessment history..." />
          ) : (
            <>
              <div className="dash-welcome">
                <h1>Assessment History</h1>
                <p>{history.length} assessment{history.length !== 1 ? 's' : ''} taken over time.</p>
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
                  {error}
                </div>
              )}

              {!error && history.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '16px' }}>No assessments yet.</p>
                  <Link to="/assessment" style={{ display: 'inline-block', padding: '12px 24px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '15px' }}>
                    Take Your First Assessment
                  </Link>
                </div>
              )}

              {(() => {
                const totalPages = Math.ceil(history.length / itemsPerPage) || 1;
                const paginatedHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                return (<>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {paginatedHistory.map((item, index) => {
                  const absIndex = (currentPage - 1) * itemsPerPage + index;
                  const rc = RISK_COLORS[item.risk_level] || RISK_COLORS.LOW;
                  return (
                    <div key={item.id} id={`history-card-${item.id}`} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: '700', fontSize: '17px', color: '#0f172a' }}>Assessment #{history.length - absIndex}</span>
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>{formatDate(item.created_at)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ padding: '4px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '12px', letterSpacing: '0.5px', background: rc.bg, border: `1px solid ${rc.border}`, color: rc.text }}>
                            {item.risk_level} RISK
                          </span>
                          <div style={{ background: '#f8fafc', padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: '700', fontSize: '17px', color: '#0f172a' }}>{item.total_score}</span>
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}> / {item.max_score || 240}</span>
                          </div>
                          <button
                            style={{ background: expanded === item.id ? '#eef2ff' : '#f8fafc', border: '1px solid #e2e8f0', color: '#4f46e5', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}
                            onClick={() => toggleExpand(item.id)}>
                            {expanded === item.id ? 'Hide Details ▲' : 'View Details ▼'}
                          </button>
                        </div>
                      </div>

                      {/* Score Breakdown Bar */}
                      {item.score_breakdown && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '4px' }}>
                          <h4 style={{ margin: '0 0 12px', fontSize: '11px', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>Score Breakdown</h4>
                          {Object.entries(item.score_breakdown).map(([cat, pts]) => (
                            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <span style={{ width: '150px', fontSize: '13px', color: '#475569', fontWeight: '500' }}>{cat}</span>
                              <div style={{ flex: 1, height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', width: `${(pts / 60) * 100}%`, transition: 'width 0.5s ease-out' }} />
                              </div>
                              <span style={{ width: '50px', fontSize: '13px', textAlign: 'right', color: '#0f172a', fontWeight: '700' }}>{pts} pts</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Expanded Details */}
                      {expanded === item.id && (
                        <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                          <h4 style={{ margin: '0 0 14px', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>Coverage Recommendations</h4>
                          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', marginBottom: '24px' }}>
                            <tbody>
                              {[
                                ['Life Insurance', item.life_insurance],
                                ['Medical Insurance', item.medical_insurance],
                                ['Critical Illness', item.critical_illness],
                                ['Personal Accident', item.personal_accident],
                                ['Income Protection', item.income_protection],
                              ].map(([label, val]) => (
                                <tr key={label}>
                                  <td style={{ padding: '10px 16px', color: '#475569', fontSize: '14px', background: '#f8fafc', borderRadius: '6px 0 0 6px', border: '1px solid #e2e8f0', borderRight: 'none' }}>{label}</td>
                                  <td style={{ padding: '10px 16px', fontWeight: '700', textAlign: 'right', fontSize: '14px', color: '#0f172a', background: '#f8fafc', borderRadius: '0 6px 6px 0', border: '1px solid #e2e8f0', borderLeft: 'none' }}>{formatRM(val)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {item.explanations && item.explanations.length > 0 && (
                            <>
                              <h4 style={{ margin: '0 0 12px', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>Primary Risk Factors</h4>
                              <ul style={{ margin: '0 0 20px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {item.explanations.map((exp, i) => (
                                  <li key={i} style={{ fontSize: '13px', color: '#475569', padding: '10px 14px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: '1.5' }}>
                                    <span>⚠️</span>
                                    <span style={{ flex: 1 }}>{exp}</span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }} data-html2canvas-ignore="true">
                            <button
                              onClick={() => generatePDF(item)}
                              disabled={generatingId === item.id}
                              style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', cursor: generatingId === item.id ? 'wait' : 'pointer', fontWeight: '600', fontSize: '14px', fontFamily: 'inherit', opacity: generatingId === item.id ? 0.7 : 1 }}>
                              {generatingId === item.id ? '⏳ Rendering PDF...' : '📄 Download Report'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                    Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, history.length)} of {history.length}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      style={{ padding: '7px 14px', background: '#f1f5f9', color: currentPage === 1 ? '#94a3b8' : '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                      Previous
                    </button>
                    <span style={{ color: '#475569', fontSize: '13px', padding: '7px 10px' }}>Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      style={{ padding: '7px 14px', background: '#f1f5f9', color: currentPage === totalPages ? '#94a3b8' : '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                      Next
                    </button>
                  </div>
                </div>
              )}
              </>);
              })()}
            </>
          )}
    </DashboardLayout>
  );
}

export default AssessmentHistory;

import React, { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { Link, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import '../../styles/Results.css';

function Results() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHow, setShowHow] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch(`${API_BASE}/api/assessment/latest`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch results');
        return res.json();
      })
      .then(data => {
        setResult(data);
        // Check if already rated
        fetch(`${API_BASE}/api/feedback/my?assessment_id=${data.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(fb => {
            if (fb.feedback) {
              setMyRating(fb.feedback.rating);
              setFeedbackComment(fb.feedback.comment || '');
              setFeedbackSubmitted(true);
            }
          })
          .catch(() => {});
        setLoading(false);
      })
      .catch(err => {
        setError('No assessment found. Please complete the assessment first.');
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div className="results-layout" style={{alignItems: 'center'}}>Loading your results...</div>;
  if (error || !result) return (
    <div className="results-layout" style={{alignItems: 'center', flexDirection: 'column'}}>
      <h2 style={{color: '#ef4444'}}>{error}</h2>
      <Link to="/dashboard" className="btn-dashboard" style={{marginTop: '20px'}}>Back to Dashboard</Link>
    </div>
  );

  const { total_score, risk_level, recommendations, explanations } = result;
  const scoreBreakdown = recommendations?._score_breakdown;
  
  // Format numbers to look like RM 150,000
  const formatRM = (val) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 0 }).format(val);

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    const element = document.getElementById('pdf-report-content');
    
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

      let heightLeft = imgHeight;
      let position = 0;

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pdfWidth, pageHeight, 'F');

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();

        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, pageHeight, 'F');

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`InsureIQ_Risk_Report_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error: ', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="results-layout">
      <div className="results-container" id="pdf-report-content" style={{ padding: '30px', background: '#ffffff', position: 'relative' }}>

        {/* PDF Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
          <h2 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            🛡️ InsureIQ Official Report
          </h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '13px' }}>
            Personalized Risk Assessment & Coverage Match
          </p>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0', fontSize: '12px' }}>
            Generated on {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Header - Score and Explanations */}
        <div className="results-header">
          <div className={`risk-badge risk-${risk_level}`}>
            {risk_level} RISK
          </div>
          
          <div className={`score-circle risk-${risk_level}`}>
            <h1>{total_score}</h1>
            <span>Risk Score</span>
          </div>

          <div className="explanations-list">
            <h3>Why did you receive this score?</h3>
            <ul>
              {explanations && explanations.map((exp, idx) => (
                <li key={idx}>{exp}</li>
              ))}
            </ul>
          </div>
          
          {/* Score Breakdown Section */}
          {scoreBreakdown && (
            <div className="breakdown-section">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{margin: '0', color: '#0f172a'}}>Score Details</h3>
                <Link to="/scoring-matrix" className="btn-text" style={{textDecoration: 'none'}} data-html2canvas-ignore="true">
                  View Full Scoring Engine Matrix →
                </Link>
              </div>
              
              <div className="breakdown-bars">
                {Object.entries(scoreBreakdown).map(([category, score]) => (
                  <div key={category} className="breakdown-row">
                    <span className="breakdown-label">{category}</span>
                    <div className="breakdown-bar-bg">
                      <div className="breakdown-bar-fill" style={{width: `${(score / 80) * 100}%`}}></div>
                    </div>
                    <span className="breakdown-score">{score} pts</span>
                  </div>
                ))}
              </div>

              {showHow && (
                <div className="how-calculated-box">
                  <h4>InsureIQ Risk Score System</h4>
                  <p>Your risk score is calculated out of <strong>{result?.max_score || 240} points</strong> based on two crucial areas:</p>
                  <ul>
                    <li><strong>Profile Data:</strong> Health, age, employment, DTI ratio, dependents, and savings.</li>
                    <li><strong>Lifestyle Survey:</strong> Existing insurance gaps, risk occupations, family history, and travel.</li>
                  </ul>
                  <p style={{margin: '10px 0 0 0'}}>
                    <strong>
                      0–{(result.mediumThreshold || 91) - 1} = LOW Risk
                      &nbsp;|&nbsp;
                      {result.mediumThreshold || 91}–{(result.highThreshold || 181) - 1} = MEDIUM Risk
                      &nbsp;|&nbsp;
                      {result.highThreshold || 181}+ = HIGH Risk
                    </strong>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Coverage Recommendations */}
        <h2 style={{textAlign: 'center', marginTop: '10px', color: '#0f172a', fontSize: '1.1rem', fontWeight: '700'}}>Recommended Coverage Amounts</h2>
        
        <div className="recommendations-section">
          
          <div className="rec-card">
            <div className="rec-icon">🛡️</div>
            <div className="rec-content">
              <h4>Life Insurance</h4>
              <p className="rec-amount">{formatRM(recommendations?.life_insurance || 0)}</p>
              <span className="rec-duration">Lump sum payout</span>
              <button data-html2canvas-ignore="true" onClick={() => navigate('/browse-plans?type=life')}
                style={{ marginTop: '12px', padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
                View Matched Plans →
              </button>
            </div>
          </div>

          <div className="rec-card">
            <div className="rec-icon">🏥</div>
            <div className="rec-content">
              <h4>Medical Insurance</h4>
              <p className="rec-amount">{formatRM(recommendations?.medical_insurance || 0)}</p>
              <span className="rec-duration">Annual limit</span>
              <button data-html2canvas-ignore="true" onClick={() => navigate('/browse-plans?type=medical')}
                style={{ marginTop: '12px', padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
                View Matched Plans →
              </button>
            </div>
          </div>

          <div className="rec-card">
            <div className="rec-icon">💔</div>
            <div className="rec-content">
              <h4>Critical Illness</h4>
              <p className="rec-amount">{formatRM(recommendations?.critical_illness || 0)}</p>
              <span className="rec-duration">Lump sum payout</span>
              <button data-html2canvas-ignore="true" onClick={() => navigate('/browse-plans?type=critical_illness')}
                style={{ marginTop: '12px', padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
                View Matched Plans →
              </button>
            </div>
          </div>

          <div className="rec-card">
            <div className="rec-icon">⚠️</div>
            <div className="rec-content">
              <h4>Personal Accident</h4>
              <p className="rec-amount">{formatRM(recommendations?.personal_accident || 0)}</p>
              <span className="rec-duration">Lump sum payout</span>
              <button data-html2canvas-ignore="true" onClick={() => navigate('/browse-plans?type=personal_accident')}
                style={{ marginTop: '12px', padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
                View Matched Plans →
              </button>
            </div>
          </div>

          <div className="rec-card">
            <div className="rec-icon">💸</div>
            <div className="rec-content">
              <h4>Income Protection</h4>
              <p className="rec-amount">{formatRM(recommendations?.income_protection || 0)}</p>
              <span className="rec-duration">Monthly benefit duration shown above</span>
              <button data-html2canvas-ignore="true" onClick={() => navigate('/browse-plans?type=income_protection')}
                style={{ marginTop: '12px', padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
                View Matched Plans →
              </button>
            </div>
          </div>

        </div>

        <div className="results-actions" data-html2canvas-ignore="true" style={{ marginTop: '30px', display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={generatePDF} disabled={isGeneratingPDF}
            className="btn-dashboard"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              cursor: isGeneratingPDF ? 'wait' : 'pointer',
              opacity: isGeneratingPDF ? 0.7 : 1
            }}>
            {isGeneratingPDF ? '⏳ Generating PDF...' : '⬇️ Download PDF Report'}
          </button>
          <Link to="/dashboard" className="btn-dashboard">Return to Dashboard</Link>
        </div>

        {/* Feedback / Rating Widget */}
        <div data-html2canvas-ignore="true" style={{ marginTop: '32px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '1rem', fontWeight: '700' }}>Was this assessment helpful?</h3>
          <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '13px' }}>Your feedback helps us improve InsureIQ for everyone.</p>

          {feedbackSubmitted ? (
            <div>
              <p style={{ color: '#16a34a', fontWeight: '600', marginBottom: '8px' }}>✓ Thanks for your feedback!</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span key={star} style={{ fontSize: '28px', color: star <= myRating ? '#4f46e5' : '#e2e8f0' }}>★</span>
                ))}
              </div>
              {feedbackComment && (
                <p style={{ marginTop: '10px', color: '#475569', fontSize: '13px', fontStyle: 'italic' }}>"{feedbackComment}"</p>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setMyRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '32px', padding: '0 2px', color: star <= (hoverRating || myRating) ? '#4f46e5' : '#e2e8f0', transition: 'color 0.15s' }}
                  >★</button>
                ))}
              </div>
              <textarea
                value={feedbackComment}
                onChange={e => setFeedbackComment(e.target.value)}
                placeholder="Tell us more (optional)"
                rows={3}
                style={{ width: '100%', maxWidth: '480px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#0f172a', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <div style={{ marginTop: '12px' }}>
                <button
                  disabled={myRating === 0 || feedbackSaving}
                  onClick={async () => {
                    if (!myRating) return;
                    setFeedbackSaving(true);
                    try {
                      await fetch(`${API_BASE}/api/feedback`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ assessment_id: result.id, rating: myRating, comment: feedbackComment })
                      });
                      setFeedbackSubmitted(true);
                    } catch (e) {
                      alert('Failed to submit feedback. Please try again.');
                    } finally {
                      setFeedbackSaving(false);
                    }
                  }}
                  style={{ padding: '10px 28px', background: myRating ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#e2e8f0', border: 'none', borderRadius: '8px', color: myRating ? '#fff' : '#94a3b8', fontSize: '14px', fontWeight: '600', cursor: myRating ? 'pointer' : 'not-allowed' }}
                >
                  {feedbackSaving ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Results;

import React, { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { useNavigate } from 'react-router-dom';
import '../../styles/RiskAssessment.css';

function RiskAssessment() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [questions, setQuestions] = useState([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [direction, setDirection] = useState('slide-in-right');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/scoring/questions`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        // Normalise to match the old shape: { id, title, desc, options: [{value, label}] }
        const normalised = (data.questions || []).map(q => ({
          id: q.question_key,
          title: q.title,
          desc: q.description,
          options: q.options.map(o => ({ value: o.option_value, label: o.option_label }))
        }));
        setQuestions(normalised);
      })
      .catch(() => {})
      .finally(() => setLoadingQ(false));
  }, [token]);

  const handleOptionSelect = async (value) => {
    const currentQ = questions[currentStep].id;
    const newAnswers = { ...answers, [currentQ]: value };
    setAnswers(newAnswers);

    if (currentStep < questions.length - 1) {
      setDirection('slide-in-right');
      setCurrentStep(prev => prev + 1);
    } else {
      await submitAssessment(newAnswers);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection('slide-in-left');
      setCurrentStep(prev => prev - 1);
    } else {
      navigate('/dashboard');
    }
  };

  const submitAssessment = async (finalAnswers) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(finalAnswers)
      });
      const data = await res.json();
      if (res.ok) {
        navigate('/results');
      } else {
        alert(data.message || 'Error calculating assessment');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      alert('Network error submitting assessment');
      setIsSubmitting(false);
    }
  };

  if (loadingQ) {
    return (
      <div className="assessment-layout">
        <div className="assessment-glass" style={{ textAlign: 'center', padding: '80px 40px' }}>
          <h2>Loading questions...</h2>
        </div>
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="assessment-layout">
        <div className="assessment-glass" style={{ textAlign: 'center', padding: '80px 40px' }}>
          <h2>Analyzing your risk profile...</h2>
          <p style={{ color: '#94a3b8', marginTop: '15px' }}>Calculating risk factors through InsureIQ engine.</p>
        </div>
      </div>
    );
  }

  const q = questions[currentStep];
  if (!q) return null;

  return (
    <div className="assessment-layout">
      <div className="assessment-glass">
        <div className="assessment-header">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(currentStep / questions.length) * 100}%` }} />
          </div>
          <span>Question {currentStep + 1} of {questions.length}</span>
        </div>

        <div key={currentStep} className={`assessment-question ${direction}`}>
          <h2>{q.title}</h2>
          <p className="assessment-desc">{q.desc}</p>
          <div className="assessment-options">
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                className={`option-btn ${answers[q.id] === opt.value ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(opt.value)}
              >
                {opt.label} <span>→</span>
              </button>
            ))}
          </div>
        </div>

        <div className="assessment-nav">
          <button className="back-btn" onClick={handleBack}>← Back</button>
        </div>
      </div>
    </div>
  );
}

export default RiskAssessment;

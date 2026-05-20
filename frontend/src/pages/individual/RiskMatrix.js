import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/RiskMatrix.css';

function AccordionSection({ icon, title, maxPts, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`accordion ${open ? 'accordion-open' : ''}`}>
      <button className="accordion-header" onClick={() => setOpen(!open)}>
        <span className="accordion-left">
          <span className="accordion-icon">{icon}</span>
          <span className="accordion-title">{title}</span>
        </span>
        <span className="accordion-right">
          <span className="accordion-max">Max {maxPts} pts</span>
          <span className="accordion-chevron">{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
}

function RiskMatrix() {
  const navigate = useNavigate();

  return (
    <div className="matrix-layout">
      <div className="matrix-container">
        
        <button onClick={() => navigate(-1)} className="back-header-btn">
          ← Back to Results
        </button>

        <div className="matrix-header">
          <h1>InsureIQ: The Algorithm</h1>
          <p>Our risk engine evaluates multiple factors across your profile and lifestyle. Tap any section below to see exactly how points are assigned.</p>
        </div>

        {/* Risk Tiers Summary - always visible */}
        <div className="tiers-strip">
          <div className="tier-chip tier-low">LOW  0 – 90</div>
          <div className="tier-chip tier-med">MEDIUM  91 – 180</div>
          <div className="tier-chip tier-high">HIGH  181+</div>
        </div>

        {/* Accordion Sections */}
        <AccordionSection icon="🎂" title="Age Profile" maxPts="20">
          <div className="matrix-table">
            <div className="mt-row"><span>56+ years</span><span className="pts-red">+20</span></div>
            <div className="mt-row"><span>46–55 years</span><span className="pts-red">+16</span></div>
            <div className="mt-row"><span>36–45 years</span><span className="pts-red">+12</span></div>
            <div className="mt-row"><span>26–35 years</span><span className="pts-red">+8</span></div>
            <div className="mt-row"><span>18–25 years</span><span className="pts-red">+5</span></div>
          </div>
        </AccordionSection>

        <AccordionSection icon="🩺" title="Health & Habits" maxPts="45">
          <div className="matrix-table">
            <div className="mt-label">Smoker Status</div>
            <div className="mt-row"><span>Smoker (Yes)</span><span className="pts-red">+20</span></div>
            <div className="mt-row"><span>Non-Smoker</span><span className="pts-green">0</span></div>
            <div className="mt-label" style={{marginTop:'10px'}}>Health Condition</div>
            <div className="mt-row"><span>Poor</span><span className="pts-red">+25</span></div>
            <div className="mt-row"><span>Fair</span><span className="pts-red">+15</span></div>
            <div className="mt-row"><span>Good</span><span className="pts-red">+5</span></div>
            <div className="mt-row"><span>Excellent</span><span className="pts-green">0</span></div>
          </div>
        </AccordionSection>

        <AccordionSection icon="👨‍👩‍👧‍👦" title="Dependents" maxPts="20">
          <div className="matrix-table">
            <div className="mt-row"><span>4+ Dependents</span><span className="pts-red">+20</span></div>
            <div className="mt-row"><span>3 Dependents</span><span className="pts-red">+15</span></div>
            <div className="mt-row"><span>2 Dependents</span><span className="pts-red">+10</span></div>
            <div className="mt-row"><span>1 Dependent</span><span className="pts-red">+5</span></div>
            <div className="mt-row"><span>0 Dependents</span><span className="pts-green">0</span></div>
          </div>
        </AccordionSection>

        <AccordionSection icon="💰" title="Debt-to-Income Ratio" maxPts="20">
          <div className="matrix-table">
            <div className="mt-row"><span>DTI &gt; 60%</span><span className="pts-red">+20</span></div>
            <div className="mt-row"><span>DTI 40–60%</span><span className="pts-red">+15</span></div>
            <div className="mt-row"><span>DTI 20–40%</span><span className="pts-red">+10</span></div>
            <div className="mt-row"><span>DTI &lt; 20%</span><span className="pts-red">+5</span></div>
          </div>
        </AccordionSection>

        <AccordionSection icon="💼" title="Employment & Income" maxPts="30">
          <div className="matrix-table">
            <div className="mt-label">Employment Status</div>
            <div className="mt-row"><span>Unemployed</span><span className="pts-red">+15</span></div>
            <div className="mt-row"><span>Part-time / Contract</span><span className="pts-red">+12</span></div>
            <div className="mt-row"><span>Self-employed</span><span className="pts-red">+10</span></div>
            <div className="mt-row"><span>Retired</span><span className="pts-red">+8</span></div>
            <div className="mt-row"><span>Full-time / Student</span><span className="pts-red">+5</span></div>
            <div className="mt-label" style={{marginTop:'10px'}}>Monthly Income</div>
            <div className="mt-row"><span>&lt; RM 2,500</span><span className="pts-red">+15</span></div>
            <div className="mt-row"><span>RM 2,500 – 3,999</span><span className="pts-red">+10</span></div>
            <div className="mt-row"><span>RM 4,000 – 6,999</span><span className="pts-red">+5</span></div>
            <div className="mt-row"><span>RM 7,000+</span><span className="pts-green">0</span></div>
          </div>
        </AccordionSection>

        <AccordionSection icon="🏦" title="Savings Buffer" maxPts="15">
          <div className="matrix-table">
            <div className="mt-row"><span>&lt; RM 5,000</span><span className="pts-red">+15</span></div>
            <div className="mt-row"><span>RM 5,000 – 19,999</span><span className="pts-red">+10</span></div>
            <div className="mt-row"><span>RM 20,000 – 49,999</span><span className="pts-red">+5</span></div>
            <div className="mt-row"><span>RM 50,000+</span><span className="pts-green">0</span></div>
          </div>
        </AccordionSection>

        <AccordionSection icon="🛡️" title="Insurance Gaps" maxPts="50">
          <div className="matrix-table">
            <div className="mt-row"><span>No Life Insurance</span><span className="pts-red">+15</span></div>
            <div className="mt-row"><span>Has Life Insurance</span><span className="pts-green">0</span></div>
            <div className="mt-row mt-spacer"><span>No Medical Insurance</span><span className="pts-red">+15</span></div>
            <div className="mt-row"><span>Has Medical Insurance</span><span className="pts-green">0</span></div>
            <div className="mt-row mt-spacer"><span>No Critical Illness Cover</span><span className="pts-red">+10</span></div>
            <div className="mt-row"><span>Has Critical Illness Cover</span><span className="pts-green">0</span></div>
            <div className="mt-row mt-spacer"><span>No 6-Month Emergency Fund</span><span className="pts-red">+10</span></div>
            <div className="mt-row"><span>Has 6-Month Emergency Fund</span><span className="pts-green">0</span></div>
          </div>
        </AccordionSection>

        <AccordionSection icon="⚡" title="Lifestyle Risks" maxPts="40">
          <div className="matrix-table">
            <div className="mt-row"><span>Active Mortgage</span><span className="pts-red">+10</span></div>
            <div className="mt-row"><span>No Mortgage</span><span className="pts-green">0</span></div>
            <div className="mt-row mt-spacer"><span>Occupation: High-Risk</span><span className="pts-red">+15</span></div>
            <div className="mt-row"><span>Occupation: Manual</span><span className="pts-red">+10</span></div>
            <div className="mt-row"><span>Occupation: Desk/Office</span><span className="pts-green">0</span></div>
            <div className="mt-row mt-spacer"><span>Family History of Illness</span><span className="pts-red">+10</span></div>
            <div className="mt-row"><span>No Family History</span><span className="pts-green">0</span></div>
            <div className="mt-row mt-spacer"><span>Frequent Travel (3+/yr)</span><span className="pts-red">+5</span></div>
            <div className="mt-row"><span>Rare / No Travel</span><span className="pts-green">0</span></div>
          </div>
        </AccordionSection>

      </div>
    </div>
  );
}

export default RiskMatrix;

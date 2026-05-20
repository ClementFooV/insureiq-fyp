import '../styles/Landing.css';
import { Link } from 'react-router-dom';

const ShieldIcon = ({ size = 20 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

function Landing() {
  const features = [
    { title: 'Risk Assessment Engine', description: 'Our multi-factor algorithm analyses your age, health, finances, and lifestyle to give you a precise risk score.', icon: '📋' },
    { title: 'Smart Plan Matching', description: 'Get matched to insurance plans that fit your risk profile and recommended coverage amounts.', icon: '💡' },
    { title: 'Coverage Gap Analysis', description: "See exactly where your protection is lacking and what you need to fill the gaps.", icon: '📊' },
  ];

  const roles = [
    {
      title: 'Individuals',
      badge: 'For You',
      icon: '👤',
      color: '#4f46e5',
      points: [
        'Get a personalised, multi-factor risk score',
        'See your coverage gaps and blind spots',
        'Match to plans that fit your profile',
        'Apply directly to insurance providers',
        'Track all applications in one place',
      ]
    },
    {
      title: 'Insurance Providers',
      badge: 'For Providers',
      icon: '🏢',
      color: '#059669',
      points: [
        'List and manage your insurance plans',
        'Receive pre-qualified applicants with risk scores',
        'Review full risk breakdowns before underwriting',
        'Approve or reject applications with notes',
        'Track applicant satisfaction ratings',
      ]
    },
    {
      title: 'Platform Admins',
      badge: 'For Admins',
      icon: '⚙',
      color: '#d97706',
      points: [
        'Approve and monitor all listed plans',
        'View every assessment and application',
        'Manage users and roles',
        'Configure scoring weights and questions',
        'Export data for reporting and analysis',
      ]
    },
  ];

  const steps = [
    { num: 1, title: 'Create your free account', desc: 'Sign up in under 30 seconds — no credit card required.' },
    { num: 2, title: 'Complete your profile', desc: 'Tell us about your finances, health, and lifestyle so we can personalise your assessment.' },
    { num: 3, title: 'Get your risk report', desc: 'Receive a detailed risk score with personalised coverage recommendations and matched plans.' },
  ];

  return (
    <div className="landing-container animate-fade-in">
      {/* Navbar */}
      <nav className="navbar">
        <div className="max-w-6xl px-content">
          <div className="navbar-content">
            <div className="navbar-logo-group">
              <div className="navbar-icon-wrapper">
                <ShieldIcon size={18} />
              </div>
              <span className="navbar-text">InsureIQ</span>
            </div>
            <Link to="/login" className="navbar-btn" style={{ textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {/* Hero */}
        <section className="hero-section px-content">
          <div className="hero-bg" />
          <div className="max-w-3xl hero-content">
            <div className="hero-eyebrow">
              <span>🇲🇾</span> Built for Malaysians
            </div>
            <h1 className="hero-title">
              Know Your Risk.<br />
              <span>Choose the Right Coverage.</span>
            </h1>
            <p className="hero-desc">
              Get a personalised insurance risk score in minutes. We analyse your profile and match you to plans that actually fit your life.
            </p>
            <div className="hero-actions">
              <Link to="/login" className="hero-btn" style={{ textDecoration: 'none' }}>
                Start Free Assessment
              </Link>
              <Link to="/login" className="hero-btn-outline" style={{ textDecoration: 'none' }}>
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="stats-section px-content">
          <div className="max-w-4xl">
            <div className="stats-grid">
              <div>
                <p className="stats-number">500+</p>
                <p className="stats-label">Users Assessed</p>
              </div>
              <div>
                <p className="stats-number">100%</p>
                <p className="stats-label">Free to Use</p>
              </div>
              <div>
                <p className="stats-number">5</p>
                <p className="stats-label">Coverage Types</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="how-it-works-section px-content">
          <div className="max-w-4xl">
            <div style={{ textAlign: 'center' }}>
              <span className="section-tag">Process</span>
            </div>
            <h2 className="section-title">How it works</h2>
            <p className="section-subtitle">Three simple steps to understand your insurance needs and find the right coverage.</p>
            <div className="steps-grid">
              {steps.map(step => (
                <div key={step.num} className="step-item">
                  <div className="step-number">{step.num}</div>
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-desc">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="features-section px-content">
          <div className="max-w-6xl">
            <div style={{ textAlign: 'center' }}>
              <span className="section-tag">Features</span>
            </div>
            <h2 className="section-title">Everything you need</h2>
            <p className="section-subtitle">Purpose-built tools to help you make smarter insurance decisions.</p>
            <div className="features-grid">
              {features.map(feature => (
                <div key={feature.title} className="feature-card">
                  <span className="feature-icon">{feature.icon}</span>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-desc">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="roles-section px-content">
          <div className="max-w-6xl">
            <div style={{ textAlign: 'center' }}>
              <span className="section-tag">Built for Everyone</span>
            </div>
            <h2 className="section-title">One platform. Three experiences.</h2>
            <p className="section-subtitle">InsureIQ connects individuals, insurance providers, and administrators in a single, purpose-built marketplace.</p>
            <div className="roles-grid">
              {roles.map(role => (
                <div key={role.title} className="role-card">
                  <div className="role-card-header" style={{ borderColor: role.color }}>
                    <span className="role-icon">{role.icon}</span>
                    <span className="role-badge" style={{ background: `${role.color}22`, color: role.color, border: `1px solid ${role.color}44` }}>{role.badge}</span>
                  </div>
                  <h3 className="role-title">{role.title}</h3>
                  <ul className="role-list">
                    {role.points.map((p, i) => (
                      <li key={i} className="role-list-item">
                        <span className="role-check" style={{ color: role.color }}>✓</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="cta-section px-content">
          <div className="max-w-3xl cta-inner">
            <h2 className="cta-title">Ready to know your risk?</h2>
            <p className="cta-desc">Join InsureIQ and get your personalised insurance risk report in minutes. It's free.</p>
            <Link to="/login" className="hero-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Get Started Free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer px-content">
        <div className="max-w-6xl footer-inner">
          <div className="footer-logo-group">
            <div className="navbar-icon-wrapper" style={{ width: '1.75rem', height: '1.75rem', borderRadius: '6px' }}>
              <ShieldIcon size={14} />
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>InsureIQ</span>
          </div>
          <p className="footer-copy">© 2026 InsureIQ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;

const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[EMAIL SKIPPED — no credentials] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"InsureIQ" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`[EMAIL SENT] To: ${to} | Subject: ${subject}`);
  } catch (err) {
    console.error(`[EMAIL FAILED] To: ${to} | Error: ${err.message}`);
    // Never throw — email is best-effort only
  }
};

// ── HTML Templates ───────────────────────────────────────────────────────────

const emailWrapper = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px 32px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="background:rgba(255,255,255,0.2);border-radius:10px;padding:8px 12px;margin-right:12px;">
                <span style="color:#fff;font-size:18px;font-weight:800;">IQ</span>
              </td>
              <td style="padding-left:12px;">
                <div style="color:#fff;font-size:20px;font-weight:800;">InsureIQ</div>
                <div style="color:rgba(255,255,255,0.75);font-size:12px;">${title}</div>
              </td>
            </tr></table>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${bodyHtml}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">You received this because you are registered on InsureIQ.<br>Please do not reply to this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const statusBadge = (status) => {
  const colors = {
    approved: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
    rejected: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
    pending:  { bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
  };
  const c = colors[status] || colors.pending;
  return `<span style="background:${c.bg};color:${c.text};border:1px solid ${c.border};padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;text-transform:capitalize;">${status}</span>`;
};

const infoRow = (label, value) =>
  `<tr>
    <td style="padding:8px 0;color:#64748b;font-size:13px;width:140px;">${label}</td>
    <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;">${value}</td>
  </tr>`;

// 1. New application received (→ provider)
const newApplicationEmail = ({ providerName, applicantName, planName, coverageAmount, premiumMonthly }) =>
  sendEmail({
    to: providerName, // will be replaced by email in controller
    subject: `New Application Received — ${planName}`,
    html: emailWrapper('New Application', `
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:800;">New Application Received</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Someone has applied for one of your insurance plans.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:10px;padding:16px 20px;border:1px solid #e2e8f0;">
        <tbody>
          ${infoRow('Applicant', applicantName)}
          ${infoRow('Plan', planName)}
          ${infoRow('Coverage', `RM ${Number(coverageAmount).toLocaleString()}`)}
          ${infoRow('Premium', `RM ${Number(premiumMonthly).toLocaleString()}/mo`)}
        </tbody>
      </table>
      <p style="margin:24px 0 0;color:#64748b;font-size:13px;">Log in to InsureIQ to review the applicant's risk profile and approve or reject this application.</p>
    `)
  });

// 2. Application status update (→ individual)
const applicationStatusEmail = ({ to, applicantName, planName, providerName, status, notes }) =>
  sendEmail({
    to,
    subject: `Your Application has been ${status === 'approved' ? 'Approved ✓' : 'Rejected'} — ${planName}`,
    html: emailWrapper(`Application ${status === 'approved' ? 'Approved' : 'Rejected'}`, `
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:800;">Application Update</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Hi ${applicantName}, here's an update on your insurance application.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:10px;padding:16px 20px;border:1px solid #e2e8f0;">
        <tbody>
          ${infoRow('Plan', planName)}
          ${infoRow('Provider', providerName)}
          ${infoRow('Status', statusBadge(status))}
          ${notes ? infoRow('Note', notes) : ''}
        </tbody>
      </table>
      ${status === 'approved' ? `<p style="margin:24px 0 0;color:#16a34a;font-size:13px;font-weight:600;">Congratulations! Your application has been approved. You can now file claims against this plan.</p>` : `<p style="margin:24px 0 0;color:#64748b;font-size:13px;">You may browse other plans on InsureIQ that better match your profile.</p>`}
    `)
  });

// 3. New claim filed (→ provider)
const newClaimEmail = ({ to, providerName, applicantName, planName, claimType, claimedAmount }) =>
  sendEmail({
    to,
    subject: `New Claim Filed — ${planName}`,
    html: emailWrapper('New Claim Filed', `
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:800;">New Claim Filed</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;">A claimant has filed a new insurance claim for review.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:10px;padding:16px 20px;border:1px solid #e2e8f0;">
        <tbody>
          ${infoRow('Claimant', applicantName)}
          ${infoRow('Plan', planName)}
          ${infoRow('Claim Type', claimType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}
          ${infoRow('Claimed Amount', `RM ${Number(claimedAmount).toLocaleString()}`)}
        </tbody>
      </table>
      <p style="margin:24px 0 0;color:#64748b;font-size:13px;">Log in to InsureIQ to review the claim details, supporting documents, and applicant risk profile before approving or rejecting.</p>
    `)
  });

// 4. Claim status update (→ individual)
const claimStatusEmail = ({ to, applicantName, planName, status, settlementAmount, providerNotes }) =>
  sendEmail({
    to,
    subject: `Your Claim has been ${status === 'approved' ? 'Approved ✓' : 'Rejected'} — ${planName}`,
    html: emailWrapper(`Claim ${status === 'approved' ? 'Approved' : 'Rejected'}`, `
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:800;">Claim Update</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Hi ${applicantName}, here's an update on your insurance claim.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:10px;padding:16px 20px;border:1px solid #e2e8f0;">
        <tbody>
          ${infoRow('Plan', planName)}
          ${infoRow('Status', statusBadge(status))}
          ${status === 'approved' && settlementAmount ? infoRow('Settlement', `RM ${Number(settlementAmount).toLocaleString()}`) : ''}
          ${providerNotes ? infoRow('Provider Note', providerNotes) : ''}
        </tbody>
      </table>
      ${status === 'approved' ? `<p style="margin:24px 0 0;color:#16a34a;font-size:13px;font-weight:600;">Your claim has been approved and a settlement of RM ${Number(settlementAmount).toLocaleString()} has been processed.</p>` : `<p style="margin:24px 0 0;color:#64748b;font-size:13px;">If you have questions, please contact your insurance provider directly.</p>`}
    `)
  });

// 5. Plan status update (→ provider)
const planStatusEmail = ({ to, providerName, planName, status, rejectionReason }) =>
  sendEmail({
    to,
    subject: `Your Plan has been ${status === 'approved' ? 'Approved ✓' : 'Rejected'} — ${planName}`,
    html: emailWrapper(`Plan ${status === 'approved' ? 'Approved' : 'Rejected'}`, `
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:800;">Plan Review Update</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Hi ${providerName}, the InsureIQ admin team has reviewed your plan submission.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:10px;padding:16px 20px;border:1px solid #e2e8f0;">
        <tbody>
          ${infoRow('Plan', planName)}
          ${infoRow('Status', statusBadge(status))}
          ${rejectionReason ? infoRow('Reason', rejectionReason) : ''}
        </tbody>
      </table>
      ${status === 'approved' ? `<p style="margin:24px 0 0;color:#16a34a;font-size:13px;font-weight:600;">Your plan is now live and visible to individuals browsing InsureIQ.</p>` : `<p style="margin:24px 0 0;color:#64748b;font-size:13px;">You may edit the plan and resubmit it for review.</p>`}
    `)
  });

module.exports = { sendEmail, newApplicationEmail, applicationStatusEmail, newClaimEmail, claimStatusEmail, planStatusEmail };

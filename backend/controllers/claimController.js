const { newClaimEmail, claimStatusEmail } = require('../utils/emailHelper');

module.exports = (pool) => {
  return {

    // POST /api/claims — individual submits a claim
    submitClaim: async (req, res) => {
      try {
        const userId = req.user.id;
        const { application_id, claim_type, incident_date, description, claimed_amount } = req.body;

        if (!application_id || !claim_type || !incident_date || !description || !claimed_amount) {
          return res.status(400).json({ message: 'All fields are required.' });
        }
        if (Number(claimed_amount) <= 0) {
          return res.status(400).json({ message: 'Claimed amount must be greater than 0.' });
        }

        // Verify application belongs to user and is approved
        const [apps] = await pool.query(
          'SELECT a.*, p.plan_name, p.coverage_amount FROM applications a JOIN plans p ON a.plan_id = p.id WHERE a.id = ? AND a.user_id = ?',
          [application_id, userId]
        );
        if (apps.length === 0) {
          return res.status(404).json({ message: 'Application not found.' });
        }
        const app = apps[0];
        if (app.status !== 'approved') {
          return res.status(400).json({ message: 'You can only file a claim for an approved application.' });
        }
        if (Number(claimed_amount) > Number(app.coverage_amount)) {
          return res.status(400).json({ message: `Claimed amount cannot exceed plan coverage of RM${Number(app.coverage_amount).toLocaleString()}.` });
        }

        // Check no active (pending/approved) claim already exists for this application
        const [existing] = await pool.query(
          "SELECT id FROM claims WHERE application_id = ? AND status = 'pending'",
          [application_id]
        );
        if (existing.length > 0) {
          return res.status(400).json({ message: 'You already have a pending claim for this application. Please wait for it to be reviewed.' });
        }

        // Handle uploaded documents
        const documents = req.files && req.files.length > 0
          ? JSON.stringify(req.files.map(f => ({ name: f.originalname, filename: f.filename, size: f.size })))
          : null;

        const [result] = await pool.query(
          'INSERT INTO claims (application_id, user_id, provider_id, plan_id, claim_type, incident_date, description, claimed_amount, documents) VALUES (?,?,?,?,?,?,?,?,?)',
          [application_id, userId, app.provider_id, app.plan_id, claim_type, incident_date, description, claimed_amount, documents]
        );

        // Notify provider
        await pool.query(
          'INSERT INTO notifications (user_id, title, message) VALUES (?,?,?)',
          [app.provider_id, 'New Claim Filed', `New claim filed for ${app.plan_name} by ${req.user.name}`]
        );
        // Email provider
        const [[providerUser]] = await pool.query('SELECT email, name FROM users WHERE id = ?', [app.provider_id]);
        if (providerUser) {
          newClaimEmail({
            to: providerUser.email,
            providerName: providerUser.name,
            applicantName: req.user.name,
            planName: app.plan_name,
            claimType: claim_type,
            claimedAmount: claimed_amount
          });
        }

        res.status(201).json({ message: 'Claim submitted successfully.', id: result.insertId });
      } catch (err) {
        console.error('submitClaim error:', err);
        res.status(500).json({ message: 'Server error submitting claim.' });
      }
    },

    // GET /api/claims/my — individual views their claims
    getMyClaims: async (req, res) => {
      try {
        const [rows] = await pool.query(
          `SELECT c.*, p.plan_name, p.insurance_type, p.coverage_amount,
                  u.name AS provider_name
           FROM claims c
           JOIN plans p ON c.plan_id = p.id
           JOIN users u ON c.provider_id = u.id
           WHERE c.user_id = ?
           ORDER BY c.created_at DESC`,
          [req.user.id]
        );
        res.json(rows);
      } catch (err) {
        console.error('getMyClaims error:', err);
        res.status(500).json({ message: 'Server error fetching claims.' });
      }
    },

    // GET /api/claims/provider — provider views claims for their plans
    getProviderClaims: async (req, res) => {
      try {
        const [rows] = await pool.query(
          `SELECT c.*, p.plan_name, p.insurance_type, p.coverage_amount,
                  u.name AS applicant_name, u.email AS applicant_email,
                  app.applicant_phone,
                  ass.total_score, ass.max_score, ass.risk_level
           FROM claims c
           JOIN plans p ON c.plan_id = p.id
           JOIN users u ON c.user_id = u.id
           JOIN applications app ON c.application_id = app.id
           JOIN assessments ass ON app.assessment_id = ass.id
           WHERE c.provider_id = ?
           ORDER BY FIELD(c.status,'pending','approved','rejected'), c.created_at DESC`,
          [req.user.id]
        );
        res.json(rows);
      } catch (err) {
        console.error('getProviderClaims error:', err);
        res.status(500).json({ message: 'Server error fetching claims.' });
      }
    },

    // PUT /api/claims/:id/status — provider approves or rejects
    updateClaimStatus: async (req, res) => {
      try {
        const { id } = req.params;
        const { status, settlement_amount, provider_notes } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
          return res.status(400).json({ message: 'Status must be approved or rejected.' });
        }

        // Verify claim belongs to this provider and is still pending
        const [claims] = await pool.query(
          'SELECT c.*, p.plan_name, p.coverage_amount, u.name AS applicant_name FROM claims c JOIN plans p ON c.plan_id = p.id JOIN users u ON c.user_id = u.id WHERE c.id = ? AND c.provider_id = ?',
          [id, req.user.id]
        );
        if (claims.length === 0) {
          return res.status(404).json({ message: 'Claim not found.' });
        }
        const claim = claims[0];
        if (claim.status !== 'pending') {
          return res.status(400).json({ message: 'This claim has already been processed.' });
        }

        if (status === 'approved') {
          if (!settlement_amount || Number(settlement_amount) <= 0) {
            return res.status(400).json({ message: 'Settlement amount is required when approving.' });
          }
          if (Number(settlement_amount) > Number(claim.coverage_amount)) {
            return res.status(400).json({ message: `Settlement amount cannot exceed plan coverage of RM${Number(claim.coverage_amount).toLocaleString()}.` });
          }
        }

        await pool.query(
          'UPDATE claims SET status = ?, settlement_amount = ?, provider_notes = ? WHERE id = ?',
          [status, status === 'approved' ? settlement_amount : null, provider_notes || null, id]
        );

        // Notify individual
        const notifMsg = status === 'approved'
          ? `Your claim for ${claim.plan_name} has been approved. Settlement: RM${Number(settlement_amount).toLocaleString()}`
          : `Your claim for ${claim.plan_name} has been rejected.${provider_notes ? ' Reason: ' + provider_notes : ''}`;

        await pool.query(
          'INSERT INTO notifications (user_id, title, message) VALUES (?,?,?)',
          [claim.user_id, `Claim ${status === 'approved' ? 'Approved' : 'Rejected'}`, notifMsg]
        );
        // Email individual
        const [[claimantUser]] = await pool.query('SELECT email, name FROM users WHERE id = ?', [claim.user_id]);
        if (claimantUser) {
          claimStatusEmail({
            to: claimantUser.email,
            applicantName: claimantUser.name,
            planName: claim.plan_name,
            status,
            settlementAmount: settlement_amount || null,
            providerNotes: provider_notes || null
          });
        }

        res.json({ message: `Claim ${status} successfully.` });
      } catch (err) {
        console.error('updateClaimStatus error:', err);
        res.status(500).json({ message: 'Server error updating claim.' });
      }
    },

    // GET /api/claims/admin/all — admin views all claims
    getAllClaims: async (req, res) => {
      try {
        const [rows] = await pool.query(
          `SELECT c.*,
                  p.plan_name, p.insurance_type, p.coverage_amount,
                  u.name AS applicant_name, u.email AS applicant_email,
                  prov.name AS provider_name
           FROM claims c
           JOIN plans p ON c.plan_id = p.id
           JOIN users u ON c.user_id = u.id
           JOIN users prov ON c.provider_id = prov.id
           ORDER BY c.created_at DESC`
        );
        res.json(rows);
      } catch (err) {
        console.error('getAllClaims error:', err);
        res.status(500).json({ message: 'Server error fetching claims.' });
      }
    }
  };
};

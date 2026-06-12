const { newApplicationEmail, applicationStatusEmail } = require('../utils/emailHelper');

module.exports = (pool) => {
  return {
    // [INDIVIDUAL] Apply for a specific plan
    applyForPlan: async (req, res) => {
      try {
        const userId = req.user.id;
        const { plan_id, provider_id, assessment_id, applicant_name, applicant_email, applicant_phone } = req.body;

        if (!plan_id || !provider_id || !assessment_id || !applicant_name || !applicant_email || !applicant_phone) {
          return res.status(400).json({ message: 'All application fields are required.' });
        }

        // Block if there is already a pending or approved application for this plan
        const [existing] = await pool.query(
          "SELECT id, status FROM applications WHERE user_id = ? AND plan_id = ? AND status IN ('pending', 'approved')",
          [userId, plan_id]
        );
        if (existing.length > 0) {
          const status = existing[0].status;
          const msg = status === 'approved'
            ? 'You already have an active policy for this plan.'
            : 'You already have a pending application for this plan.';
          return res.status(400).json({ message: msg });
        }

        const query = `
          INSERT INTO applications 
          (user_id, plan_id, provider_id, assessment_id, applicant_name, applicant_email, applicant_phone) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(query, [userId, plan_id, provider_id, assessment_id, applicant_name, applicant_email, applicant_phone]);

        // Notify provider of new application
        try {
          const [[plan]] = await pool.query('SELECT plan_name, coverage_amount, premium_monthly FROM plans WHERE id = ?', [plan_id]);
          if (plan) {
            await pool.query(
              'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
              [provider_id, 'New Application', `New application received for ${plan.plan_name} from ${applicant_name}`]
            );
            // Email provider
            const [[providerUser]] = await pool.query('SELECT email, name FROM users WHERE id = ?', [provider_id]);
            if (providerUser) {
              newApplicationEmail({
                to: providerUser.email,
                providerName: providerUser.name,
                applicantName: applicant_name,
                planName: plan.plan_name,
                coverageAmount: plan.coverage_amount,
                premiumMonthly: plan.premium_monthly
              });
            }
          }
        } catch (notifErr) {
          console.error('Notification insert error (apply):', notifErr);
        }

        res.status(201).json({ message: 'Application submitted successfully!', applicationId: result.insertId });
      } catch (err) {
        console.error('Error applying for plan:', err);
        res.status(500).json({ message: 'Server error during application process.' });
      }
    },

    // [INDIVIDUAL] Get all applications made by the current user
    getMyApplications: async (req, res) => {
      try {
        const userId = req.user.id;
        
        const query = `
          SELECT a.*, p.plan_name, p.insurance_type, p.premium_monthly, p.coverage_amount,
                 pr.name as provider_name
          FROM applications a
          JOIN plans p ON a.plan_id = p.id
          JOIN users pr ON a.provider_id = pr.id
          WHERE a.user_id = ?
          ORDER BY a.created_at DESC
        `;
        
        const [rows] = await pool.query(query, [userId]);
        res.json(rows);
      } catch (err) {
        console.error('Error fetching user applications:', err);
        res.status(500).json({ message: 'Server error fetching applications.' });
      }
    },

    // [PROVIDER] Get all applications for the provider's plans
    getProviderApplications: async (req, res) => {
      try {
        const providerId = req.user.id;
        
        const query = `
          SELECT a.*, p.plan_name, p.insurance_type, p.premium_monthly,
                 ass.total_score, ass.max_score, ass.risk_level, ass.recommendations, ass.explanations
          FROM applications a
          JOIN plans p ON a.plan_id = p.id
          LEFT JOIN assessments ass ON a.assessment_id = ass.id
          WHERE a.provider_id = ?
          ORDER BY a.created_at DESC
        `;
        
        const [rows] = await pool.query(query, [providerId]);
        res.json(rows);
      } catch (err) {
        console.error('Error fetching provider applications:', err);
        res.status(500).json({ message: 'Server error fetching provider applications.' });
      }
    },

    // [INDIVIDUAL] Withdraw a pending application
    withdrawApplication: async (req, res) => {
      try {
        const userId = req.user.id;
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM applications WHERE id = ? AND user_id = ?', [id, userId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Application not found.' });
        if (rows[0].status !== 'pending') return res.status(400).json({ message: 'Only pending applications can be withdrawn.' });
        await pool.query('DELETE FROM applications WHERE id = ?', [id]);
        res.json({ message: 'Application withdrawn successfully.' });
      } catch (err) {
        console.error('Error withdrawing application:', err);
        res.status(500).json({ message: 'Server error withdrawing application.' });
      }
    },

    // [ADMIN] Get all applications across all providers
    getAllApplications: async (req, res) => {
      try {
        const [rows] = await pool.query(
          `SELECT a.*, p.plan_name, p.insurance_type, p.premium_monthly, p.coverage_amount,
                  u.name as applicant_name_user, u.email as applicant_email_user,
                  pr.name as provider_name,
                  ass.total_score, ass.max_score, ass.risk_level
           FROM applications a
           JOIN plans p ON a.plan_id = p.id
           JOIN users u ON a.user_id = u.id
           JOIN users pr ON a.provider_id = pr.id
           LEFT JOIN assessments ass ON a.assessment_id = ass.id
           ORDER BY a.created_at DESC`
        );
        res.json(rows);
      } catch (err) {
        console.error('Error fetching all applications:', err);
        res.status(500).json({ message: 'Server error fetching applications.' });
      }
    },

    // [INDIVIDUAL] Cancel an approved policy
    cancelPolicy: async (req, res) => {
      try {
        const userId = req.user.id;
        const { id } = req.params;

        const [rows] = await pool.query('SELECT * FROM applications WHERE id = ? AND user_id = ?', [id, userId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Application not found.' });
        if (rows[0].status !== 'approved') return res.status(400).json({ message: 'Only active (approved) policies can be cancelled.' });

        // Block cancellation if a pending claim exists for this application
        const [activeClaims] = await pool.query(
          `SELECT id FROM claims WHERE application_id = ? AND status = 'pending'`, [id]
        );
        if (activeClaims.length > 0) return res.status(400).json({ message: 'You have a pending claim on this policy. Resolve it before cancelling.' });

        await pool.query(
          `UPDATE applications SET status = 'cancelled', end_date = CURDATE() WHERE id = ?`, [id]
        );
        res.json({ message: 'Policy cancelled successfully.' });
      } catch (err) {
        console.error('Error cancelling policy:', err);
        res.status(500).json({ message: 'Server error cancelling policy.' });
      }
    },

    // [PROVIDER] Update application status (Approve/Reject)
    updateApplicationStatus: async (req, res) => {
      try {
        const providerId = req.user.id;
        const { id } = req.params;
        const { status, notes } = req.body;

        if (!['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
          return res.status(400).json({ message: 'Invalid status value.' });
        }

        // Verify the application actually belongs to this provider, and get user_id + plan_name for notification
        const [appRow] = await pool.query(
          `SELECT a.provider_id, a.user_id, p.plan_name
           FROM applications a JOIN plans p ON a.plan_id = p.id
           WHERE a.id = ?`,
          [id]
        );
        if (appRow.length === 0) {
          return res.status(404).json({ message: 'Application not found.' });
        }
        if (appRow[0].provider_id !== providerId && req.user.role !== 'admin') {
          return res.status(403).json({ message: 'Unauthorized to modify this application.' });
        }

        const dateFields = status === 'approved'
          ? ', start_date = CURDATE(), end_date = DATE_ADD(CURDATE(), INTERVAL 1 YEAR)'
          : '';
        await pool.query(`UPDATE applications SET status = ?, notes = ?${dateFields} WHERE id = ?`, [status, notes || null, id]);

        // Notify applicant of decision
        if (status === 'approved' || status === 'rejected') {
          try {
            const { user_id, plan_name } = appRow[0];
            const title = status === 'approved' ? 'Application Approved' : 'Application Rejected';
            const message = `Your application for ${plan_name} has been ${status}.${status === 'rejected' && notes ? ` Reason: ${notes}` : ''}`;
            await pool.query(
              'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
              [user_id, title, message]
            );
            // Email applicant
            const [[applicantUser]] = await pool.query('SELECT email, name FROM users WHERE id = ?', [user_id]);
            const [[providerUser]] = await pool.query('SELECT name FROM users WHERE id = ?', [providerId]);
            if (applicantUser) {
              applicationStatusEmail({
                to: applicantUser.email,
                applicantName: applicantUser.name,
                planName: plan_name,
                providerName: providerUser?.name || 'Provider',
                status,
                notes: notes || null
              });
            }
          } catch (notifErr) {
            console.error('Notification insert error (status update):', notifErr);
          }
        }

        res.json({ message: 'Application status updated successfully.' });
      } catch (err) {
        console.error('Error updating application status:', err);
        res.status(500).json({ message: 'Server error updating application.' });
      }
    }
  };
};

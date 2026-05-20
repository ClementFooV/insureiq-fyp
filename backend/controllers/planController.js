const { planStatusEmail } = require('../utils/emailHelper');

module.exports = (pool) => {
  return {
    // Provider: Add a new plan
    addPlan: async (req, res) => {
      try {
        const providerId = req.user.id;
        const { plan_name, insurance_type, coverage_amount, premium_monthly, min_age, max_age, description, features, exclusions } = req.body;

        // Basic validation
        if (!plan_name || !insurance_type || !coverage_amount || !premium_monthly) {
          return res.status(400).json({ message: 'Please fill in all required fields.' });
        }

        await pool.query(
          `INSERT INTO plans 
            (provider_id, plan_name, insurance_type, coverage_amount, premium_monthly, min_age, max_age, description, features, exclusions, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            providerId,
            plan_name,
            insurance_type,
            coverage_amount,
            premium_monthly,
            min_age || 18,
            max_age || 65,
            description || null,
            features ? JSON.stringify(features) : null,
            exclusions ? JSON.stringify(exclusions) : null
          ]
        );

        res.status(201).json({ message: 'Plan submitted for approval!' });
      } catch (err) {
        console.error('Add plan error:', err);
        res.status(500).json({ message: 'Server error while adding plan.' });
      }
    },

    // Provider: Get my submitted plans
    getMyPlans: async (req, res) => {
      try {
        const providerId = req.user.id;
        const [rows] = await pool.query(
          'SELECT * FROM plans WHERE provider_id = ? ORDER BY created_at DESC',
          [providerId]
        );
        res.json({ plans: rows });
      } catch (err) {
        console.error('Get my plans error:', err);
        res.status(500).json({ message: 'Server error fetching plans.' });
      }
    },

    // Provider: Get a single plan by ID (for editing)
    getPlanById: async (req, res) => {
      try {
        const providerId = req.user.id;
        const { id } = req.params;
        const [rows] = await pool.query(
          'SELECT * FROM plans WHERE id = ? AND provider_id = ?',
          [id, providerId]
        );
        if (rows.length === 0) {
          return res.status(404).json({ message: 'Plan not found or access denied.' });
        }
        res.json({ plan: rows[0] });
      } catch (err) {
        console.error('Get plan by ID error:', err);
        res.status(500).json({ message: 'Server error fetching plan.' });
      }
    },

    // Provider: Update a plan (resets status to pending)
    updatePlan: async (req, res) => {
      try {
        const providerId = req.user.id;
        const { id } = req.params;
        const { plan_name, insurance_type, coverage_amount, premium_monthly, min_age, max_age, description, features, exclusions } = req.body;

        const [existing] = await pool.query(
          'SELECT * FROM plans WHERE id = ? AND provider_id = ?',
          [id, providerId]
        );
        if (existing.length === 0) {
          return res.status(404).json({ message: 'Plan not found or access denied.' });
        }

        if (!plan_name || !insurance_type || !coverage_amount || !premium_monthly) {
          return res.status(400).json({ message: 'Please fill in all required fields.' });
        }

        await pool.query(
          `UPDATE plans SET
            plan_name = ?, insurance_type = ?, coverage_amount = ?, premium_monthly = ?,
            min_age = ?, max_age = ?, description = ?, features = ?, exclusions = ?,
            status = 'pending', rejection_reason = NULL
           WHERE id = ? AND provider_id = ?`,
          [
            plan_name, insurance_type, coverage_amount, premium_monthly,
            min_age || 18, max_age || 65,
            description || null,
            features ? JSON.stringify(features) : null,
            exclusions ? JSON.stringify(exclusions) : null,
            id, providerId
          ]
        );

        res.json({ message: 'Plan updated and resubmitted for approval.' });
      } catch (err) {
        console.error('Update plan error:', err);
        res.status(500).json({ message: 'Server error updating plan.' });
      }
    },

    // Admin: Get all plans (for approval queue)
    getAllPlans: async (req, res) => {
      try {
        const [rows] = await pool.query(
          `SELECT plans.*, users.name as provider_name 
           FROM plans 
           JOIN users ON plans.provider_id = users.id 
           ORDER BY created_at DESC`
        );
        res.json({ plans: rows });
      } catch (err) {
        console.error('Get all plans error:', err);
        res.status(500).json({ message: 'Server error fetching plans.' });
      }
    },

    // Admin: Approve or reject a plan
    updatePlanStatus: async (req, res) => {
      try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
          return res.status(400).json({ message: 'Status must be approved or rejected.' });
        }

        await pool.query(
          'UPDATE plans SET status = ?, rejection_reason = ? WHERE id = ?',
          [status, status === 'rejected' ? (rejection_reason || 'No reason provided') : null, id]
        );

        // Notify provider of plan decision
        try {
          const [[plan]] = await pool.query('SELECT provider_id, plan_name FROM plans WHERE id = ?', [id]);
          if (plan) {
            const title = status === 'approved' ? 'Plan Approved' : 'Plan Rejected';
            const message = status === 'approved'
              ? `Your plan "${plan.plan_name}" has been approved and is now live.`
              : `Your plan "${plan.plan_name}" was rejected.${rejection_reason ? ` Reason: ${rejection_reason}` : ''}`;
            await pool.query(
              'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
              [plan.provider_id, title, message]
            );
            // Email provider
            const [[providerUser]] = await pool.query('SELECT email, name FROM users WHERE id = ?', [plan.provider_id]);
            if (providerUser) {
              planStatusEmail({
                to: providerUser.email,
                providerName: providerUser.name,
                planName: plan.plan_name,
                status,
                rejectionReason: rejection_reason || null
              });
            }
          }
        } catch (notifErr) {
          console.error('Notification insert error (plan status):', notifErr);
        }

        res.json({ message: `Plan ${status} successfully.` });
      } catch (err) {
        console.error('Update plan status error:', err);
        res.status(500).json({ message: 'Server error updating plan.' });
      }
    },

    // Public: Get all approved plans (for individuals to browse)
    getApprovedPlans: async (req, res) => {
      try {
        const [rows] = await pool.query(
          `SELECT plans.*, users.name as provider_name
           FROM plans
           JOIN users ON plans.provider_id = users.id
           WHERE plans.status = 'approved'
           ORDER BY plans.insurance_type, plans.premium_monthly ASC`
        );
        res.json({ plans: rows });
      } catch (err) {
        console.error('Get approved plans error:', err);
        res.status(500).json({ message: 'Server error fetching approved plans.' });
      }
    },

    // Individual: Get plans matched to user's risk profile and recommendations
    getMatchedPlans: async (req, res) => {
      try {
        const userId = req.user.id;

        // Fetch user's profile + latest assessment in one query
        const [profileRows] = await pool.query(
          `SELECT p.age, p.monthly_income, p.num_dependents, p.employment_status,
                  p.health_status, p.smoker, p.savings, p.total_liabilities,
                  a.risk_level, a.total_score, a.recommendations, a.questionnaire_answers
           FROM profiles p
           INNER JOIN assessments a ON a.user_id = p.user_id
           WHERE p.user_id = ?
           ORDER BY a.created_at DESC
           LIMIT 1`,
          [userId]
        );

        if (profileRows.length === 0) {
          return res.status(404).json({
            error: 'incomplete_profile',
            message: 'Please complete your profile and risk assessment to see matched plans.'
          });
        }

        const profile = profileRows[0];

        // Parse JSON fields
        const recs = typeof profile.recommendations === 'string'
          ? JSON.parse(profile.recommendations)
          : profile.recommendations;
        const answers = typeof profile.questionnaire_answers === 'string'
          ? JSON.parse(profile.questionnaire_answers)
          : profile.questionnaire_answers;

        // Map plan insurance_type to recommended coverage amounts (exclude _score_breakdown)
        const { _score_breakdown, ...coverages } = recs;
        const REC_KEY_MAP = {
          life:              coverages.life_insurance      || null,
          medical:           coverages.medical_insurance   || null,
          critical_illness:  coverages.critical_illness    || null,
          personal_accident: coverages.personal_accident   || null,
          income_protection: coverages.income_protection   || null
        };

        // Map questionnaire answers to insurance types for gap detection
        const GAP_MAP = {
          life: answers.lifeInsurance,
          medical: answers.medicalInsurance,
          critical_illness: answers.criticalIllness
        };

        // Fetch all approved plans
        const [plans] = await pool.query(
          `SELECT plans.*, users.name as provider_name
           FROM plans
           JOIN users ON plans.provider_id = users.id
           WHERE plans.status = 'approved'
           ORDER BY plans.insurance_type, plans.premium_monthly ASC`
        );

        const affordabilityLimit = (profile.monthly_income || 0) * 0.15;
        const matchedPlans = [];

        for (const plan of plans) {
          let score = 0;
          const matchReasons = [];

          const recAmount = REC_KEY_MAP[plan.insurance_type];

          // Criterion 1: Coverage fit (+3)
          if (recAmount && recAmount > 0) {
            const lower = recAmount;
            const upper = recAmount * 1.5;
            if (plan.coverage_amount >= lower && plan.coverage_amount <= upper) {
              score += 3;
              matchReasons.push('Coverage amount matches your recommended level');
            }
          }

          // Criterion 2: Age eligibility (+2)
          if (profile.age >= plan.min_age && profile.age <= plan.max_age) {
            score += 2;
            matchReasons.push('You are within the eligible age range');
          }

          // Criterion 3: Affordability (+2)
          if (affordabilityLimit > 0 && plan.premium_monthly <= affordabilityLimit) {
            score += 2;
            matchReasons.push('Premium is within 15% of your monthly income');
          }

          // Criterion 4: Needs gap (+1)
          if (GAP_MAP[plan.insurance_type] === 'no') {
            score += 1;
            matchReasons.push('You currently do not have this type of coverage');
          }

          if (score >= 2) {
            // Parse features/exclusions JSON
            let features = [];
            let exclusions = [];
            try { features = plan.features ? JSON.parse(plan.features) : []; } catch (e) {}
            try { exclusions = plan.exclusions ? JSON.parse(plan.exclusions) : []; } catch (e) {}

            matchedPlans.push({
              ...plan,
              features,
              exclusions,
              match_score: score,
              match_reasons: matchReasons
            });
          }
        }

        matchedPlans.sort((a, b) => b.match_score - a.match_score);

        res.json({
          matched_plans: matchedPlans,
          profile_summary: {
            age: profile.age,
            monthly_income: profile.monthly_income,
            risk_level: profile.risk_level
          },
          total_matched: matchedPlans.length
        });
      } catch (err) {
        console.error('Get matched plans error:', err);
        res.status(500).json({ message: 'Server error fetching matched plans.' });
      }
    }
  };
};

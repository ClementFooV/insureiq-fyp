module.exports = (pool) => {
  return {
    // ===== ADMIN: Full Platform Dashboard Metrics =====
    getDashboardMetrics: async (req, res) => {
      try {
        // Query 1: Users by Role
        const [userRows] = await pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
        const usersByRole = { individual: 0, provider: 0, admin: 0 };
        userRows.forEach(row => {
          usersByRole[row.role] = row.count;
        });

        // Query 2: Plans by Status
        const [planRows] = await pool.query('SELECT status, COUNT(*) as count FROM plans GROUP BY status');
        const plansByStatus = { pending: 0, approved: 0, rejected: 0 };
        planRows.forEach(row => {
          if (plansByStatus[row.status] !== undefined) {
             plansByStatus[row.status] = row.count;
          }
        });

        // Query 3: Average Risk Score and assessment grouping
        const [scoreRows] = await pool.query('SELECT AVG(total_score) as avgScore, COUNT(*) as total FROM assessments');
        const [riskRows] = await pool.query('SELECT risk_level, COUNT(*) as count FROM assessments GROUP BY risk_level');
        const assessmentsByRisk = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        riskRows.forEach(row => {
          if (assessmentsByRisk[row.risk_level] !== undefined) {
             assessmentsByRisk[row.risk_level] = row.count;
          }
        });

        // Query 4: Applications by Status (NEW for charts)
        const [appRows] = await pool.query('SELECT status, COUNT(*) as count FROM applications GROUP BY status');
        const applicationsByStatus = { pending: 0, approved: 0, rejected: 0 };
        appRows.forEach(row => {
          if (applicationsByStatus[row.status] !== undefined) {
            applicationsByStatus[row.status] = row.count;
          }
        });

        res.json({
          metrics: {
            totalUsers: Object.values(usersByRole).reduce((a, b) => a + Number(b), 0),
            usersByRole,
            totalPlans: Object.values(plansByStatus).reduce((a, b) => a + Number(b), 0),
            plansByStatus,
            assessments: {
              total: Number(scoreRows[0]?.total || 0),
              avgScore: Math.round(Number(scoreRows[0]?.avgScore || 0)),
              byRisk: assessmentsByRisk
            },
            applications: {
              total: Object.values(applicationsByStatus).reduce((a, b) => a + Number(b), 0),
              byStatus: applicationsByStatus
            }
          }
        });
      } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ message: 'Server error fetching analytics' });
      }
    },

    // ===== PROVIDER: Analytics for Their Plans & Applications =====
    getProviderAnalytics: async (req, res) => {
      try {
        const providerId = req.user.id;

        // Applications by status for this provider
        const [appRows] = await pool.query(
          'SELECT status, COUNT(*) as count FROM applications WHERE provider_id = ? GROUP BY status',
          [providerId]
        );
        const applicationsByStatus = { pending: 0, approved: 0, rejected: 0 };
        appRows.forEach(row => {
          if (applicationsByStatus[row.status] !== undefined) {
            applicationsByStatus[row.status] = row.count;
          }
        });

        // Plans by status for this provider
        const [planRows] = await pool.query(
          'SELECT status, COUNT(*) as count FROM plans WHERE provider_id = ? GROUP BY status',
          [providerId]
        );
        const plansByStatus = { pending: 0, approved: 0, rejected: 0 };
        planRows.forEach(row => {
          if (plansByStatus[row.status] !== undefined) {
            plansByStatus[row.status] = row.count;
          }
        });

        // Average risk score of applicants for this provider
        const [avgRow] = await pool.query(
          `SELECT AVG(ass.total_score) as avgScore 
           FROM applications a 
           JOIN assessments ass ON a.assessment_id = ass.id 
           WHERE a.provider_id = ?`,
          [providerId]
        );

        res.json({
          applications: {
            total: Object.values(applicationsByStatus).reduce((a, b) => a + Number(b), 0),
            byStatus: applicationsByStatus
          },
          plans: {
            total: Object.values(plansByStatus).reduce((a, b) => a + Number(b), 0),
            byStatus: plansByStatus
          },
          avgApplicantRiskScore: Math.round(Number(avgRow[0]?.avgScore || 0))
        });
      } catch (err) {
        console.error('Provider analytics error:', err);
        res.status(500).json({ message: 'Server error fetching provider analytics' });
      }
    },

    // ===== INDIVIDUAL: Personal Risk Analytics =====
    getIndividualAnalytics: async (req, res) => {
      try {
        const userId = req.user.id;

        // Score history over time (all assessments)
        const [historyRows] = await pool.query(
          'SELECT total_score, risk_level, recommendations, created_at FROM assessments WHERE user_id = ? ORDER BY created_at ASC',
          [userId]
        );

        const scoreHistory = historyRows.map(row => ({
          score: row.total_score,
          riskLevel: row.risk_level,
          date: row.created_at
        }));

        // Latest assessment breakdown for radar chart
        let latestBreakdown = null;
        if (historyRows.length > 0) {
          const latest = historyRows[historyRows.length - 1];
          const recs = typeof latest.recommendations === 'string'
            ? JSON.parse(latest.recommendations)
            : latest.recommendations;
          latestBreakdown = recs?._score_breakdown || null;
        }

        // Application status counts
        const [appRows] = await pool.query(
          'SELECT status, COUNT(*) as count FROM applications WHERE user_id = ? GROUP BY status',
          [userId]
        );
        const applicationsByStatus = { pending: 0, approved: 0, rejected: 0 };
        appRows.forEach(row => {
          if (applicationsByStatus[row.status] !== undefined) {
            applicationsByStatus[row.status] = row.count;
          }
        });

        res.json({
          scoreHistory,
          latestBreakdown,
          applications: {
            total: Object.values(applicationsByStatus).reduce((a, b) => a + Number(b), 0),
            byStatus: applicationsByStatus
          }
        });
      } catch (err) {
        console.error('Individual analytics error:', err);
        res.status(500).json({ message: 'Server error fetching individual analytics' });
      }
    }
  };
};

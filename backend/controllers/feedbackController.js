module.exports = (pool) => {
  return {

    // POST /api/feedback — individual submits rating
    submitFeedback: async (req, res) => {
      try {
        const userId = req.user.id;
        const { assessment_id, rating, comment } = req.body;

        if (!assessment_id || !rating || rating < 1 || rating > 5) {
          return res.status(400).json({ message: 'A rating between 1 and 5 is required.' });
        }

        await pool.query(
          `INSERT INTO feedback (user_id, assessment_id, rating, comment)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
          [userId, assessment_id, rating, comment || null]
        );

        res.json({ message: 'Feedback submitted successfully.' });
      } catch (err) {
        console.error('submitFeedback error:', err);
        res.status(500).json({ message: 'Server error submitting feedback.' });
      }
    },

    // GET /api/feedback/my?assessment_id=X — check if already rated
    getMyFeedback: async (req, res) => {
      try {
        const userId = req.user.id;
        const { assessment_id } = req.query;
        if (!assessment_id) return res.json({ feedback: null });

        const [rows] = await pool.query(
          'SELECT * FROM feedback WHERE user_id = ? AND assessment_id = ?',
          [userId, assessment_id]
        );
        res.json({ feedback: rows[0] || null });
      } catch (err) {
        console.error('getMyFeedback error:', err);
        res.status(500).json({ message: 'Server error.' });
      }
    },

    // GET /api/feedback/admin — all feedback with stats
    getAdminFeedback: async (req, res) => {
      try {
        const [rows] = await pool.query(
          `SELECT f.id, f.rating, f.comment, f.created_at,
                  u.name as user_name, u.email as user_email,
                  a.total_score, a.risk_level, a.created_at as assessment_date
           FROM feedback f
           JOIN users u ON f.user_id = u.id
           LEFT JOIN assessments a ON f.assessment_id = a.id
           ORDER BY f.created_at DESC`
        );
        const [[stats]] = await pool.query(
          'SELECT ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as total FROM feedback'
        );
        res.json({ feedback: rows, avg_rating: stats.avg_rating || 0, total: stats.total });
      } catch (err) {
        console.error('getAdminFeedback error:', err);
        res.status(500).json({ message: 'Server error fetching feedback.' });
      }
    },

    // GET /api/feedback/provider — avg rating from applicants to this provider
    getProviderFeedback: async (req, res) => {
      try {
        const providerId = req.user.id;
        const [[stats]] = await pool.query(
          `SELECT ROUND(AVG(f.rating), 1) as avg_rating, COUNT(DISTINCT f.id) as total
           FROM feedback f
           JOIN applications a ON f.assessment_id = a.assessment_id
           WHERE a.provider_id = ?`,
          [providerId]
        );
        const [recent] = await pool.query(
          `SELECT f.rating, f.comment, f.created_at
           FROM feedback f
           JOIN applications a ON f.assessment_id = a.assessment_id
           WHERE a.provider_id = ? AND f.comment IS NOT NULL AND f.comment != ''
           ORDER BY f.created_at DESC LIMIT 5`,
          [providerId]
        );
        res.json({ avg_rating: stats.avg_rating || 0, total: stats.total || 0, recent });
      } catch (err) {
        console.error('getProviderFeedback error:', err);
        res.status(500).json({ message: 'Server error fetching provider feedback.' });
      }
    }

  };
};

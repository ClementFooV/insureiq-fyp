module.exports = (pool) => {
  function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function toCSV(columns, rows) {
    const header = columns.map(c => c.label).join(',');
    const lines = rows.map(row =>
      columns.map(c => escapeCSV(row[c.key])).join(',')
    );
    return header + '\n' + lines.join('\n');
  }

  function sendCSV(res, filename, csv) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  return {
    exportUsers: async (req, res) => {
      try {
        const [rows] = await pool.query(
          'SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC'
        );
        const columns = [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role' },
          { key: 'status', label: 'Status' },
          { key: 'created_at', label: 'Created At' }
        ];
        sendCSV(res, 'insureiq_users_export.csv', toCSV(columns, rows));
      } catch (err) {
        console.error('Export users error:', err);
        res.status(500).json({ message: 'Server error exporting users.' });
      }
    },

    exportAssessments: async (req, res) => {
      try {
        const [rows] = await pool.query(
          `SELECT a.id, u.name, u.email, a.total_score, a.risk_level, a.created_at
           FROM assessments a JOIN users u ON a.user_id = u.id
           ORDER BY a.created_at DESC`
        );
        const columns = [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'User Name' },
          { key: 'email', label: 'Email' },
          { key: 'total_score', label: 'Total Score' },
          { key: 'risk_level', label: 'Risk Level' },
          { key: 'created_at', label: 'Created At' }
        ];
        sendCSV(res, 'insureiq_assessments_export.csv', toCSV(columns, rows));
      } catch (err) {
        console.error('Export assessments error:', err);
        res.status(500).json({ message: 'Server error exporting assessments.' });
      }
    },

    exportApplications: async (req, res) => {
      try {
        const [rows] = await pool.query(
          `SELECT app.id, u.name as applicant, p.plan_name, p.insurance_type, app.status, app.created_at
           FROM applications app
           JOIN users u ON app.user_id = u.id
           JOIN plans p ON app.plan_id = p.id
           ORDER BY app.created_at DESC`
        );
        const columns = [
          { key: 'id', label: 'ID' },
          { key: 'applicant', label: 'Applicant' },
          { key: 'plan_name', label: 'Plan Name' },
          { key: 'insurance_type', label: 'Insurance Type' },
          { key: 'status', label: 'Status' },
          { key: 'created_at', label: 'Created At' }
        ];
        sendCSV(res, 'insureiq_applications_export.csv', toCSV(columns, rows));
      } catch (err) {
        console.error('Export applications error:', err);
        res.status(500).json({ message: 'Server error exporting applications.' });
      }
    },

    exportFeedback: async (req, res) => {
      try {
        const [rows] = await pool.query(
          `SELECT f.id, u.name, f.rating, f.comment, f.created_at
           FROM feedback f JOIN users u ON f.user_id = u.id
           ORDER BY f.created_at DESC`
        );
        const columns = [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'User Name' },
          { key: 'rating', label: 'Rating' },
          { key: 'comment', label: 'Comment' },
          { key: 'created_at', label: 'Created At' }
        ];
        sendCSV(res, 'insureiq_feedback_export.csv', toCSV(columns, rows));
      } catch (err) {
        console.error('Export feedback error:', err);
        res.status(500).json({ message: 'Server error exporting feedback.' });
      }
    }
  };
};

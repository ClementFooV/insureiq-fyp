module.exports = (pool) => {
  return {
    // Save or update profile
    saveProfile: async (req, res) => {
      try {
        const userId = req.user.id;
        const {
          age,
          gender,
          employment_status,
          monthly_income,
          num_dependents,
          total_liabilities,
          health_status,
          smoker,
          savings
        } = req.body;

        // Basic server-side validation
        if (!age || !gender || !employment_status || !health_status) {
          return res.status(400).json({ message: 'Please fill in all required fields.' });
        }

        if (age < 1 || age > 120) {
          return res.status(400).json({ message: 'Age must be between 1 and 120.' });
        }

        // Upsert — insert if new, update if exists
        await pool.query(
          `INSERT INTO profiles 
            (user_id, age, gender, employment_status, monthly_income, num_dependents, total_liabilities, health_status, smoker, savings)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            age = VALUES(age),
            gender = VALUES(gender),
            employment_status = VALUES(employment_status),
            monthly_income = VALUES(monthly_income),
            num_dependents = VALUES(num_dependents),
            total_liabilities = VALUES(total_liabilities),
            health_status = VALUES(health_status),
            smoker = VALUES(smoker),
            savings = VALUES(savings)`,
          [
            userId,
            age,
            gender,
            employment_status,
            monthly_income || 0,
            num_dependents || 0,
            total_liabilities || 0,
            health_status,
            smoker ? 1 : 0,
            savings || 0
          ]
        );

        res.status(201).json({ message: 'Profile saved successfully.' });
      } catch (err) {
        console.error('Save profile error:', err);
        res.status(500).json({ message: 'Server error while saving profile.' });
      }
    },

    // Get current user's profile
    getProfile: async (req, res) => {
      try {
        const userId = req.user.id;
        const [rows] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);

        if (rows.length === 0) {
          return res.status(404).json({ message: 'Profile not found.' });
        }

        res.json({ profile: rows[0] });
      } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ message: 'Server error while fetching profile.' });
      }
    }
  };
};

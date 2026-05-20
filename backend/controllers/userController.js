const bcrypt = require('bcryptjs');

module.exports = (pool) => {
  return {
    // GET all users (Admin only)
    getAllUsers: async (req, res) => {
      try {
        const [rows] = await pool.query(
          'SELECT id, name, email, role, status, google_id, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ users: rows });
      } catch (err) {
        console.error('Get all users error:', err);
        res.status(500).json({ message: 'Server error fetching users.' });
      }
    },

    // GET a single user's profile data (Admin only)
    getUserProfile: async (req, res) => {
      try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [id]);
        if (rows.length === 0) {
          return res.json({ profile: null });
        }
        res.json({ profile: rows[0] });
      } catch (err) {
        console.error('Get user profile error:', err);
        res.status(500).json({ message: 'Server error fetching user profile.' });
      }
    },

    // OVERRIDE a single user's profile data (Admin only)
    adminUpdateUserProfile: async (req, res) => {
      try {
        const { id } = req.params;
        const { age, gender, employment_status, monthly_income, num_dependents, total_liabilities, health_status, smoker, savings } = req.body;

        if (!age || !gender || !employment_status || !health_status) {
          return res.status(400).json({ message: 'Please fill in all required fields.' });
        }

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
            id,
            age, gender, employment_status,
            monthly_income || 0, num_dependents || 0, total_liabilities || 0,
            health_status, smoker ? 1 : 0, savings || 0
          ]
        );

        res.json({ message: 'User profile updated successfully.' });
      } catch (err) {
        console.error('Admin update profile error:', err);
        res.status(500).json({ message: 'Server error updating profile.' });
      }
    },


    // CREATE provider account (Admin only)
    createProvider: async (req, res) => {
      try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
          return res.status(400).json({ message: 'Name, email, and password are required.' });
        }

        // Check if email already exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
          return res.status(400).json({ message: 'A user with this email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query(
          'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
          [name, email, hashedPassword, 'provider']
        );

        res.status(201).json({ message: 'Provider account created successfully.' });
      } catch (err) {
        console.error('Create provider error:', err);
        res.status(500).json({ message: 'Server error creating provider.' });
      }
    },

    // UPDATE user — only name and password (Admin only)
    updateUser: async (req, res) => {
      try {
        const { id } = req.params;
        const { name, password } = req.body;

        // Build dynamic query — only name and password allowed
        const fields = [];
        const values = [];
        if (name) { fields.push('name = ?'); values.push(name); }
        if (password) {
          const salt = await bcrypt.genSalt(10);
          const hashed = await bcrypt.hash(password, salt);
          fields.push('password = ?');
          values.push(hashed);
        }

        if (fields.length === 0) {
          return res.status(400).json({ message: 'No fields to update.' });
        }

        values.push(id);
        await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

        res.json({ message: 'User updated successfully.' });
      } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ message: 'Server error updating user.' });
      }
    },

    // TOGGLE user status (active/suspended) (Admin only)
    toggleStatus: async (req, res) => {
      try {
        const { id } = req.params;
        const adminId = req.user.id;

        // Prevent suspending yourself
        if (Number(id) === adminId) {
          return res.status(400).json({ message: 'You cannot suspend your own account.' });
        }

        // Prevent suspending other admins
        const [target] = await pool.query('SELECT role, status FROM users WHERE id = ?', [id]);
        if (target.length === 0) {
          return res.status(404).json({ message: 'User not found.' });
        }
        if (target[0].role === 'admin') {
          return res.status(400).json({ message: 'Cannot suspend another admin.' });
        }

        const newStatus = target[0].status === 'active' ? 'suspended' : 'active';
        await pool.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, id]);

        res.json({ message: `User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully.`, status: newStatus });
      } catch (err) {
        console.error('Toggle status error:', err);
        res.status(500).json({ message: 'Server error toggling status.' });
      }
    },

    // DELETE user (Admin only)
    deleteUser: async (req, res) => {
      try {
        const { id } = req.params;
        const adminId = req.user.id;

        // Prevent self-delete
        if (Number(id) === adminId) {
          return res.status(400).json({ message: 'You cannot delete your own account.' });
        }

        // Prevent deleting other admins
        const [target] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
        if (target.length === 0) {
          return res.status(404).json({ message: 'User not found.' });
        }
        if (target[0].role === 'admin') {
          return res.status(400).json({ message: 'Cannot delete another admin account.' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully.' });
      } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ message: 'Server error deleting user.' });
      }
    }
  };
};

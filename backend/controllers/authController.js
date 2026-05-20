const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { sendEmail } = require('../utils/emailHelper');

module.exports = (pool) => {
  const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  return {
    register: async (req, res) => {
      try {
        const { name, password } = req.body;
        const email = req.body.email?.toLowerCase().trim();

        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
          return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query(
          'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
          [name, email, hashedPassword]
        );

        res.status(201).json({ message: 'User registered successfully' });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during registration' });
      }
    },

    login: async (req, res) => {
      try {
        const { password } = req.body;
        const email = req.body.email?.toLowerCase().trim();

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
          return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        if (user.status === 'suspended') {
          return res.status(403).json({ message: 'Your account has been suspended. Please contact the administrator.' });
        }

        if (!user.password) {
          return res.status(400).json({ message: 'This account uses Google Login. Please sign in with Google.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { id: user.id, name: user.name, email: user.email, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during login' });
      }
    },

    googleLogin: async (req, res) => {
      try {
        const { credential } = req.body;

        if (!credential) {
          return res.status(400).json({ message: 'Google credential token is required.' });
        }

        // Verify the ID token with Google — prevents spoofed identity
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();

        if (!payload.email_verified) {
          return res.status(400).json({ message: 'Google account email is not verified.' });
        }

        const email = payload.email;
        const name = payload.name;
        const googleId = payload.sub;

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        let user;
        if (users.length === 0) {
          const [result] = await pool.query(
            'INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)',
            [name, email, googleId]
          );

          const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
          user = newUsers[0];
        } else {
          user = users[0];
          if (!user.google_id) {
             await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, user.id]);
          }
        }

        if (user.status === 'suspended') {
          return res.status(403).json({ message: 'Your account has been suspended. Please contact the administrator.' });
        }

        const jwtToken = jwt.sign(
          { id: user.id, name: user.name, email: user.email, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        res.json({ token: jwtToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
      } catch (err) {
        console.error(err);
        res.status(401).json({ message: 'Invalid Google Token' });
      }
    },

    forgotPassword: async (req, res) => {
      try {
        const email = req.body.email?.toLowerCase().trim();
        if (!email) {
          return res.status(400).json({ message: 'Email is required.' });
        }

        // Always return generic success (prevents email enumeration)
        const [users] = await pool.query('SELECT id, password FROM users WHERE email = ?', [email]);
        if (users.length === 0 || !users[0].password) {
          return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
        }

        const user = users[0];

        // Invalidate existing tokens
        await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = ? AND used = FALSE', [user.id]);

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await pool.query(
          'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
          [user.id, token, expiresAt]
        );

        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetLink = `${frontendURL}/reset-password?token=${token}`;

        await sendEmail({
          to: email,
          subject: 'InsureIQ — Reset Your Password',
          html: `
            <h2>Password Reset Request</h2>
            <p>Click the link below to reset your password. This link expires in 1 hour.</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>If you did not request this, please ignore this email.</p>
          `
        });

        res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
      } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ message: 'Server error processing request.' });
      }
    },

    resetPassword: async (req, res) => {
      try {
        const { token, password } = req.body;

        if (!token || !password) {
          return res.status(400).json({ message: 'Token and new password are required.' });
        }

        const [tokens] = await pool.query(
          'SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE AND expires_at > NOW()',
          [token]
        );

        if (tokens.length === 0) {
          return res.status(400).json({ message: 'Invalid or expired reset token.' });
        }

        const resetRecord = tokens[0];

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, resetRecord.user_id]);
        await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = ?', [resetRecord.id]);

        res.json({ message: 'Password reset successfully. You can now log in.' });
      } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Server error resetting password.' });
      }
    },

    changePassword: async (req, res) => {
      try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
          return res.status(400).json({ message: 'Current and new password are required.' });
        }
        if (newPassword.length < 8) {
          return res.status(400).json({ message: 'New password must be at least 8 characters.' });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found.' });

        const user = users[0];
        if (!user.password) {
          return res.status(400).json({ message: 'This account uses Google Login and has no password to change.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

        res.json({ message: 'Password changed successfully.' });
      } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ message: 'Server error.' });
      }
    }
  };
};

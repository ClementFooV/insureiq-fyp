require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());


const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, db: 'error', message: err.message });
  }
});

const authRoutes = require('./routes/authRoutes')(pool);
app.use('/api', authRoutes);

const profileRoutes = require('./routes/profileRoutes')(pool);
app.use('/api', profileRoutes);

const assessmentRoutes = require('./routes/assessmentRoutes')(pool);
app.use('/api/assessment', assessmentRoutes);

const planRoutes = require('./routes/planRoutes')(pool);
app.use('/api/plans', planRoutes);

const userRoutes = require('./routes/userRoutes')(pool);
app.use('/api/users', userRoutes);

const analyticsRoutes = require('./routes/analyticsRoutes')(pool);
app.use('/api/analytics', analyticsRoutes);

const applicationRoutes = require('./routes/applicationRoutes')(pool);
app.use('/api/applications', applicationRoutes);

const notificationRoutes = require('./routes/notificationRoutes')(pool);
app.use('/api/notifications', notificationRoutes);

const scoringConfigRoutes = require('./routes/scoringConfigRoutes')(pool);
app.use('/api/scoring', scoringConfigRoutes);

const feedbackRoutes = require('./routes/feedbackRoutes')(pool);
app.use('/api/feedback', feedbackRoutes);

const exportRoutes = require('./routes/exportRoutes')(pool);
app.use('/api/export', exportRoutes);

const claimRoutes = require('./routes/claimRoutes')(pool);
app.use('/api/claims', claimRoutes);

const chunkRoutes = require('./routes/chunkRoutes')(pool);
app.use('/api', chunkRoutes);

const ragRoutes = require('./routes/ragRoutes')(pool);
app.use('/api/rag', ragRoutes);

app.use('/uploads', require('express').static(require('path').join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const mysql = require('mysql2/promise');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  
  // 1. Manually craft a JWT token for the admin
  const [adminRows] = await pool.query('SELECT id, email, role FROM users WHERE role="admin" LIMIT 1');
  const admin = adminRows[0];
  const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  // 2. Fetch via HTTP
  try {
    const res = await fetch('http://localhost:5000/api/analytics/dashboard', { headers: { Authorization: `Bearer ${token}` }});
    const txt = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', txt);
  } catch (err) { console.error(err); }
  process.exit(0);
}
run();

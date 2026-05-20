const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });
  
  try {
    const [userRows] = await pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    console.log('users:', userRows);
    const [planRows] = await pool.query('SELECT status, COUNT(*) as count FROM plans GROUP BY status');
    console.log('plans:', planRows);
    const [scoreRows] = await pool.query('SELECT AVG(total_score) as avgScore, COUNT(*) as total FROM assessments');
    console.log('scoreRows:', scoreRows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();

const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await pool.query(`ALTER TABLE documents ADD COLUMN raw_content LONGTEXT NULL AFTER title`);
    console.log('> Column "raw_content" added to documents table successfully!');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('> Column "raw_content" already exists. Skipping.');
    } else {
      console.error('Error:', e.message);
    }
  } finally {
    process.exit();
  }
}

run();

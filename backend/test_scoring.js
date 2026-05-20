require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Create test user
  const hash = await bcrypt.hash('TestPass123!', 10);
  await pool.execute(
    'INSERT IGNORE INTO users (id, name, email, password, role) VALUES (9999, ?, ?, ?, ?)',
    ['Test User', 'scoretest@test.com', hash, 'individual']
  );

  // Create test profile
  await pool.execute('DELETE FROM profiles WHERE user_id = 9999');
  await pool.execute(
    `INSERT INTO profiles (user_id, age, smoker, health_status, num_dependents, monthly_income, total_liabilities, savings, employment_status)
     VALUES (9999, 30, 1, 'Fair', 2, 5000, 120000, 8000, 'Self-employed')`
  );

  // Generate JWT for test user
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: 9999, email: 'scoretest@test.com', role: 'individual' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Submit assessment via the actual controller logic
  const testAnswers = {
    lifeInsurance: 'no',
    medicalInsurance: 'no',
    criticalIllness: 'no',
    emergencyFund: 'no',
    mortgage: 'yes',
    occupation: 'manual',
    familyHistory: 'yes',
    travel: 'yes'
  };

  // Call the API
  const res = await fetch(`http://localhost:5000/api/assessment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(testAnswers)
  });

  const data = await res.json();
  console.log('\n========== SCORE VERIFICATION ==========');
  console.log('Total Score:', data.result.totalScore);
  console.log('Risk Level:', data.result.riskLevel);
  console.log('\nBreakdown:');
  const bd = data.result.recommendations._score_breakdown;
  Object.entries(bd).forEach(([cat, score]) => console.log(`  ${cat}: ${score}`));
  console.log('\nRecommendations:');
  const { _score_breakdown, ...coverages } = data.result.recommendations;
  Object.entries(coverages).forEach(([type, amt]) => console.log(`  ${type}: RM ${amt.toLocaleString()}`));
  console.log('\nExplanations:');
  data.result.explanations.forEach((e, i) => console.log(`  ${i+1}. ${e}`));

  console.log('\n========== EXPECTED VALUES ==========');
  console.log('Expected Total: 173');
  console.log('Expected Risk:  MEDIUM');
  console.log('Expected Breakdown:');
  console.log('  Age & Health: 43');
  console.log('  Financial Resilience: 45');
  console.log('  Insurance Gaps: 50');
  console.log('  Lifestyle Risks: 35');
  console.log('\nExpected Recommendations:');
  console.log('  life_insurance: RM 750,000');
  console.log('  medical_insurance: RM 150,000');
  console.log('  critical_illness: RM 180,000');
  console.log('  personal_accident: RM 250,000');
  console.log('  income_protection: RM 90,000');

  const match = data.result.totalScore === 173 && data.result.riskLevel === 'MEDIUM';
  console.log(`\n${match ? '✅ ALL SCORES MATCH!' : '❌ MISMATCH DETECTED — review above'}`);

  // Cleanup
  await pool.execute('DELETE FROM assessments WHERE user_id = 9999');
  await pool.execute('DELETE FROM profiles WHERE user_id = 9999');
  await pool.execute('DELETE FROM users WHERE id = 9999');
  console.log('\n(Test data cleaned up)');

  await pool.end();
})();

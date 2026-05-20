module.exports = (pool) => {
  
  // Helper to calculate Life Insurance (uses DB-driven parameters)
  const calculateLifeInsurance = (income, liabilities, dependents, riskLevel, W) => {
    const multLow    = W['rec_life_mult_low']      ?? 5;
    const multMed    = W['rec_life_mult_medium']   ?? 8;
    const multHigh   = W['rec_life_mult_high']     ?? 10;
    const perDep     = W['rec_life_per_dependent'] ?? 75000;
    const minCov     = W['rec_life_min']           ?? 100000;
    const maxCov     = W['rec_life_max']           ?? 2000000;

    const multiplier = riskLevel === 'HIGH' ? multHigh : riskLevel === 'MEDIUM' ? multMed : multLow;
    let target = (income * 12 * multiplier) + liabilities + (dependents * perDep);
    if (target < minCov) target = minCov;
    if (target > maxCov) target = maxCov;
    return target;
  };

  return {
    submitAssessment: async (req, res) => {
      const userId = req.user.id;
      const answers = req.body;

      try {
        // Fetch profile
        const [profiles] = await pool.execute('SELECT * FROM profiles WHERE user_id = ?', [userId]);
        if (profiles.length === 0) {
          return res.status(400).json({ message: 'Profile not found. Please complete profile first.' });
        }
        const profile = profiles[0];

        // Load scoring weights from DB
        const [weightRows] = await pool.query('SELECT weight_key, points FROM scoring_weights');
        const W = {};
        for (const row of weightRows) W[row.weight_key] = row.points;
        const w = (key, fallback = 0) => (W[key] !== undefined ? W[key] : fallback);

        // Load active questionnaire options for scoring
        const [optionRows] = await pool.query(
          `SELECT aq.question_key, aqs.option_value, aqs.score_points, aq.category
           FROM assessment_question_options aqs
           JOIN assessment_questions aq ON aqs.question_id = aq.id
           WHERE aq.is_active = TRUE`
        );
        const optionScoreMap = {}; // { question_key: { option_value: { points, category } } }
        for (const row of optionRows) {
          if (!optionScoreMap[row.question_key]) optionScoreMap[row.question_key] = {};
          optionScoreMap[row.question_key][row.option_value] = { points: row.score_points, category: row.category };
        }

        let breakdown = { 'Age & Health': 0, 'Financial Resilience': 0, 'Insurance Gaps': 0, 'Lifestyle Risks': 0 };
        const explanations = [];

        // --- PART A: PROFILE SCORING (weights from DB) ---

        // Age
        if (profile.age >= 56) breakdown['Age & Health'] += w('age_56_plus', 20);
        else if (profile.age >= 46) breakdown['Age & Health'] += w('age_46_55', 16);
        else if (profile.age >= 36) breakdown['Age & Health'] += w('age_36_45', 12);
        else if (profile.age >= 26) breakdown['Age & Health'] += w('age_26_35', 8);
        else breakdown['Age & Health'] += w('age_under_26', 5);

        // Smoker
        if (profile.smoker === 1) {
          breakdown['Age & Health'] += w('smoker_yes', 20);
          explanations.push('Smoking significantly increases health and critical illness risks.');
        }

        // Health status
        if (profile.health_status === 'Poor') { breakdown['Age & Health'] += w('health_poor', 25); explanations.push('Poor health status indicates an immediate need for solid medical buffers.'); }
        else if (profile.health_status === 'Fair') { breakdown['Age & Health'] += w('health_fair', 15); explanations.push('Fair health status means you are at higher risk for future medical complications.'); }
        else if (profile.health_status === 'Good') breakdown['Age & Health'] += w('health_good', 5);

        // Dependents
        const dependents = Number(profile.num_dependents) || 0;
        if (dependents >= 4) { breakdown['Financial Resilience'] += w('dependents_4plus', 20); explanations.push('You have multiple dependents relying entirely on your income.'); }
        else if (dependents === 3) breakdown['Financial Resilience'] += w('dependents_3', 15);
        else if (dependents === 2) breakdown['Financial Resilience'] += w('dependents_2', 10);
        else if (dependents === 1) breakdown['Financial Resilience'] += w('dependents_1', 5);

        // DTI
        let dti = 0;
        if (profile.monthly_income > 0) dti = profile.total_liabilities / profile.monthly_income;
        else if (profile.total_liabilities > 0) dti = 100;
        if (dti > 60) { breakdown['Financial Resilience'] += w('dti_over_60', 20); explanations.push('Your Debt-to-Income ratio is extremely high, placing you at severe financial risk.'); }
        else if (dti >= 40) { breakdown['Financial Resilience'] += w('dti_40_60', 15); explanations.push('Your Debt-to-Income ratio is high. Most of your income goes to liabilities.'); }
        else if (dti >= 20) breakdown['Financial Resilience'] += w('dti_20_40', 10);
        else breakdown['Financial Resilience'] += w('dti_under_20', 5);

        // Employment
        const emp = profile.employment_status;
        if (emp === 'Unemployed') { breakdown['Financial Resilience'] += w('emp_unemployed', 15); explanations.push('Being unemployed removes your primary income safety net.'); }
        else if (emp === 'Part-time/Contract') breakdown['Financial Resilience'] += w('emp_parttime', 12);
        else if (emp === 'Self-employed') { breakdown['Financial Resilience'] += w('emp_selfemployed', 10); explanations.push('As self-employed, you lack corporate medical and income protections.'); }
        else if (emp === 'Retired') breakdown['Financial Resilience'] += w('emp_retired', 8);
        else breakdown['Financial Resilience'] += w('emp_employed', 5);

        // Income
        const inc = profile.monthly_income;
        if (inc < 2500) { breakdown['Financial Resilience'] += w('income_under_2500', 15); explanations.push('A lower income means a much smaller financial buffer against emergencies.'); }
        else if (inc < 4000) breakdown['Financial Resilience'] += w('income_2500_4000', 10);
        else if (inc < 7000) breakdown['Financial Resilience'] += w('income_4000_7000', 5);

        // Savings
        const savings = profile.savings;
        if (savings < 5000) { breakdown['Financial Resilience'] += w('savings_under_5k', 15); explanations.push('Your liquid savings are very low, making you vulnerable to sudden shocks.'); }
        else if (savings < 20000) breakdown['Financial Resilience'] += w('savings_5k_20k', 10);
        else if (savings < 50000) breakdown['Financial Resilience'] += w('savings_20k_50k', 5);

        // --- PART B: QUESTIONNAIRE SCORING (from DB) ---
        for (const [qKey, optionValue] of Object.entries(answers)) {
          const qMap = optionScoreMap[qKey];
          if (!qMap || !qMap[optionValue]) continue;
          const { points, category } = qMap[optionValue];
          if (points > 0 && breakdown[category] !== undefined) {
            breakdown[category] += points;
            // Explanations for questionnaire answers (kept hardcoded for UX — they're descriptive text, not scores)
            if (qKey === 'lifeInsurance' && optionValue === 'no') explanations.push('You do not have Life Insurance to protect your family from your liabilities.');
            if (qKey === 'medicalInsurance' && optionValue === 'no') explanations.push('You have no Medical Insurance, exposing you to catastrophic hospital bills.');
            if (qKey === 'mortgage' && optionValue === 'yes') explanations.push('An active mortgage creates a massive liability that requires income protection.');
            if (qKey === 'occupation' && optionValue === 'high-risk') explanations.push('Your high-risk occupation makes Personal Accident coverage crucial.');
            if (qKey === 'familyHistory' && optionValue === 'yes') explanations.push('A family history of serious illness elevates your long-term Critical Illness risk.');
            if (qKey === 'emergencyFund' && optionValue === 'no') explanations.push('You lack a 6-month emergency fund, severely increasing your financial exposure.');
          }
        }

        // --- TOTAL SCORE & RISK LEVEL ---
        const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0);

        // Read thresholds from DB (fallback to defaults if missing)
        const [tRows] = await pool.query(
          "SELECT weight_key, points FROM scoring_weights WHERE weight_key IN ('risk_threshold_medium','risk_threshold_high')"
        );
        const mediumThreshold = tRows.find(r => r.weight_key === 'risk_threshold_medium')?.points ?? 91;
        const highThreshold   = tRows.find(r => r.weight_key === 'risk_threshold_high')?.points ?? 181;

        let riskLevel = 'LOW';
        if (totalScore >= highThreshold) riskLevel = 'HIGH';
        else if (totalScore >= mediumThreshold) riskLevel = 'MEDIUM';

        // --- COMPUTE MAX POSSIBLE SCORE (stored so it doesn't change if admin updates config later) ---
        const maxGroup = (keys) => Math.max(0, ...keys.map(k => W[k] || 0));
        const maxProfileScore =
          maxGroup(['age_under_26','age_26_35','age_36_45','age_46_55','age_56_plus']) +
          w('smoker_yes') +
          maxGroup(['health_good','health_fair','health_poor']) +
          maxGroup(['dependents_1','dependents_2','dependents_3','dependents_4plus']) +
          maxGroup(['dti_under_20','dti_20_40','dti_40_60','dti_over_60']) +
          maxGroup(['emp_employed','emp_retired','emp_selfemployed','emp_parttime','emp_unemployed']) +
          maxGroup(['income_4000_7000','income_2500_4000','income_under_2500']) +
          maxGroup(['savings_20k_50k','savings_5k_20k','savings_under_5k']);
        const questionMaxMap = {};
        for (const row of optionRows) {
          if (!(row.question_key in questionMaxMap) || row.score_points > questionMaxMap[row.question_key]) {
            questionMaxMap[row.question_key] = row.score_points;
          }
        }
        const maxScore = maxProfileScore + Object.values(questionMaxMap).reduce((a, b) => a + b, 0);


        // --- RECOMMENDATIONS GENERATION (Using exact requested formulas) ---
        const liabilities = Number(profile.total_liabilities) || 0;
        const incomeNum = Number(inc) || 0;
        const dependentsNum = Number(profile.num_dependents) || 0;

        // Coverage recommendation parameters from DB (with hardcoded fallbacks)
        const medicalCap = riskLevel === 'HIGH' ? (W['rec_medical_high'] ?? 250000)
                         : riskLevel === 'MEDIUM' ? (W['rec_medical_medium'] ?? 150000)
                         : (W['rec_medical_low'] ?? 100000);

        const paCap = answers.occupation === 'high-risk' ? (W['rec_pa_high_risk'] ?? 400000)
                    : answers.occupation === 'manual'    ? (W['rec_pa_manual']    ?? 250000)
                    : (W['rec_pa_desk'] ?? 150000);

        const ciMult = riskLevel === 'HIGH' ? (W['rec_ci_mult_high'] ?? 5)
                     : riskLevel === 'MEDIUM' ? (W['rec_ci_mult_medium'] ?? 3)
                     : (W['rec_ci_mult_low'] ?? 2);

        const ipRate   = (W['rec_ip_rate'] ?? 75) / 100;
        const ipMonths = riskLevel === 'LOW' ? (W['rec_ip_months_low'] ?? 12) : (W['rec_ip_months_high'] ?? 24);

        const recs = {
          life_insurance:    calculateLifeInsurance(incomeNum, liabilities, dependentsNum, riskLevel, W),
          medical_insurance: medicalCap,
          critical_illness:  incomeNum * 12 * ciMult,
          personal_accident: paCap,
          income_protection: incomeNum * ipRate * ipMonths,
          _score_breakdown:  breakdown
        };

        // Keep explanations to top 3-4 most critical reasons to not overwhelm the UI
        const finalExplanations = explanations.slice(0, 4);
        if (finalExplanations.length === 0) finalExplanations.push('You have a strong financial safety net with minimal risks detected.');

        // --- SAVE TO DATABASE ---
        await pool.execute(
          `INSERT INTO assessments
           (user_id, questionnaire_answers, total_score, max_score, risk_level, recommendations, explanations)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            JSON.stringify(answers),
            totalScore,
            maxScore,
            riskLevel,
            JSON.stringify(recs),
            JSON.stringify(finalExplanations)
          ]
        );

        res.json({ message: 'Assessment completed!', result: { totalScore, maxScore, riskLevel, mediumThreshold, highThreshold, recommendations: recs, explanations: finalExplanations } });

      } catch (err) {
        console.error('Error submitting assessment:', err);
        res.status(500).json({ message: 'Server error calculating risk' });
      }
    },

    getLatestAssessment: async (req, res) => {
      try {
        const [rows] = await pool.execute('SELECT * FROM assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'No assessment found' });
        res.json(rows[0]);
      } catch (err) {
        console.error('Error fetching assessment:', err);
        res.status(500).json({ message: 'Server error fetching assessment' });
      }
    },

    getAssessmentHistory: async (req, res) => {
      try {
        const [rows] = await pool.execute(
          'SELECT id, total_score, max_score, risk_level, recommendations, explanations, created_at FROM assessments WHERE user_id = ? ORDER BY created_at DESC',
          [req.user.id]
        );
        const history = rows.map(row => {
          const parsed = typeof row.recommendations === 'string' ? JSON.parse(row.recommendations) : row.recommendations;
          const { _score_breakdown, ...coverages } = parsed;
          const parsedExplanations = typeof row.explanations === 'string' ? JSON.parse(row.explanations) : row.explanations;
          return {
            id: row.id,
            total_score: row.total_score,
            max_score: row.max_score || 240,
            risk_level: row.risk_level,
            created_at: row.created_at,
            ...coverages,
            score_breakdown: _score_breakdown,
            explanations: parsedExplanations
          };
        });
        res.json(history);
      } catch (err) {
        console.error('Error fetching assessment history:', err);
        res.status(500).json({ message: 'Server error fetching assessment history' });
      }
    },

    getAssessmentById: async (req, res) => {
      try {
        const [rows] = await pool.execute(
          'SELECT * FROM assessments WHERE id = ?',
          [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Assessment not found' });
        const assessment = rows[0];
        if (assessment.user_id !== req.user.id) return res.status(403).json({ message: 'Access denied' });
        res.json({
          ...assessment,
          questionnaire_answers: typeof assessment.questionnaire_answers === 'string' ? JSON.parse(assessment.questionnaire_answers) : assessment.questionnaire_answers,
          recommendations: typeof assessment.recommendations === 'string' ? JSON.parse(assessment.recommendations) : assessment.recommendations,
          explanations: typeof assessment.explanations === 'string' ? JSON.parse(assessment.explanations) : assessment.explanations
        });
      } catch (err) {
        console.error('Error fetching assessment by ID:', err);
        res.status(500).json({ message: 'Server error fetching assessment' });
      }
    },

    // [ADMIN] Get all assessments across all users
    getAllAssessments: async (req, res) => {
      try {
        const [rows] = await pool.execute(
          `SELECT a.id, a.total_score, a.max_score, a.risk_level, a.recommendations, a.explanations, a.created_at,
                  u.id as user_id, u.name as user_name, u.email as user_email
           FROM assessments a
           JOIN users u ON a.user_id = u.id
           ORDER BY a.created_at DESC`
        );
        const assessments = rows.map(row => {
          const parsed = typeof row.recommendations === 'string' ? JSON.parse(row.recommendations) : row.recommendations;
          const { _score_breakdown, ...coverages } = parsed || {};
          return {
            id: row.id,
            total_score: row.total_score,
            max_score: row.max_score || 240,
            risk_level: row.risk_level,
            created_at: row.created_at,
            user_id: row.user_id,
            user_name: row.user_name,
            user_email: row.user_email,
            score_breakdown: _score_breakdown || null,
            explanations: typeof row.explanations === 'string' ? JSON.parse(row.explanations) : row.explanations,
            ...coverages
          };
        });
        res.json({ assessments });
      } catch (err) {
        console.error('Error fetching all assessments:', err);
        res.status(500).json({ message: 'Server error fetching assessments' });
      }
    },

    // [ADMIN] Delete a specific assessment
    deleteAssessment: async (req, res) => {
      try {
        const { id } = req.params;
        const [rows] = await pool.execute('SELECT id FROM assessments WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Assessment not found' });
        await pool.execute('DELETE FROM assessments WHERE id = ?', [id]);
        res.json({ message: 'Assessment deleted successfully.' });
      } catch (err) {
        console.error('Error deleting assessment:', err);
        res.status(500).json({ message: 'Server error deleting assessment' });
      }
    }
  };
};

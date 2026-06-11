module.exports = (pool) => {
  return {

    // GET /api/scoring/questions — all active questions + options (ordered)
    getQuestions: async (req, res) => {
      try {
        const [questions] = await pool.query(
          'SELECT * FROM assessment_questions WHERE is_active = TRUE ORDER BY display_order ASC'
        );
        for (const q of questions) {
          const [options] = await pool.query(
            'SELECT * FROM assessment_question_options WHERE question_id = ? ORDER BY id ASC',
            [q.id]
          );
          q.options = options;
        }
        res.json({ questions });
      } catch (err) {
        console.error('getQuestions error:', err);
        res.status(500).json({ message: 'Server error fetching questions.' });
      }
    },

    // GET /api/scoring/questions/all — all questions including inactive (admin only)
    getAllQuestions: async (req, res) => {
      try {
        const [questions] = await pool.query(
          'SELECT * FROM assessment_questions ORDER BY display_order ASC'
        );
        for (const q of questions) {
          const [options] = await pool.query(
            'SELECT * FROM assessment_question_options WHERE question_id = ? ORDER BY id ASC',
            [q.id]
          );
          q.options = options;
        }
        res.json({ questions });
      } catch (err) {
        console.error('getAllQuestions error:', err);
        res.status(500).json({ message: 'Server error fetching questions.' });
      }
    },

    // POST /api/scoring/questions — create new question with options
    createQuestion: async (req, res) => {
      try {
        const { question_key, title, description, category, options } = req.body;
        if (!question_key || !title || !category || !options || options.length < 2) {
          return res.status(400).json({ message: 'question_key, title, category, and at least 2 options are required.' });
        }

        // Get next display_order
        const [[{ maxOrder }]] = await pool.query('SELECT MAX(display_order) as maxOrder FROM assessment_questions');
        const newOrder = (maxOrder || 0) + 1;

        const [result] = await pool.query(
          'INSERT INTO assessment_questions (question_key, title, description, category, display_order) VALUES (?,?,?,?,?)',
          [question_key, title, description || '', category, newOrder]
        );
        for (const opt of options) {
          await pool.query(
            'INSERT INTO assessment_question_options (question_id, option_value, option_label, score_points) VALUES (?,?,?,?)',
            [result.insertId, opt.option_value, opt.option_label, opt.score_points || 0]
          );
        }
        res.status(201).json({ message: 'Question created successfully.', id: result.insertId });
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'A question with this key already exists.' });
        console.error('createQuestion error:', err);
        res.status(500).json({ message: 'Server error creating question.' });
      }
    },

    // PUT /api/scoring/questions/:id — update question + replace its options
    updateQuestion: async (req, res) => {
      try {
        const { id } = req.params;
        const { title, description, category, is_active, options } = req.body;

        await pool.query(
          'UPDATE assessment_questions SET title=?, description=?, category=?, is_active=? WHERE id=?',
          [title, description || '', category, is_active !== undefined ? is_active : true, id]
        );

        if (options && options.length >= 2) {
          await pool.query('DELETE FROM assessment_question_options WHERE question_id = ?', [id]);
          for (const opt of options) {
            await pool.query(
              'INSERT INTO assessment_question_options (question_id, option_value, option_label, score_points) VALUES (?,?,?,?)',
              [id, opt.option_value, opt.option_label, opt.score_points || 0]
            );
          }
        }
        res.json({ message: 'Question updated successfully.' });
      } catch (err) {
        console.error('updateQuestion error:', err);
        res.status(500).json({ message: 'Server error updating question.' });
      }
    },

    // DELETE /api/scoring/questions/:id — soft delete (set is_active = false)
    deleteQuestion: async (req, res) => {
      try {
        const { id } = req.params;
        await pool.query('UPDATE assessment_questions SET is_active = FALSE WHERE id = ?', [id]);
        res.json({ message: 'Question deactivated successfully.' });
      } catch (err) {
        console.error('deleteQuestion error:', err);
        res.status(500).json({ message: 'Server error deleting question.' });
      }
    },

    // PUT /api/scoring/questions/reorder — update display_order for list of {id, display_order}
    reorderQuestions: async (req, res) => {
      try {
        const { order } = req.body; // array of { id, display_order }
        for (const item of order) {
          await pool.query('UPDATE assessment_questions SET display_order = ? WHERE id = ?', [item.display_order, item.id]);
        }
        res.json({ message: 'Questions reordered successfully.' });
      } catch (err) {
        console.error('reorderQuestions error:', err);
        res.status(500).json({ message: 'Server error reordering questions.' });
      }
    },

    // GET /api/scoring/thresholds — public threshold values for RiskMatrix display
    getThresholds: async (req, res) => {
      try {
        const [rows] = await pool.query(
          "SELECT weight_key, points FROM scoring_weights WHERE weight_key IN ('risk_threshold_medium','risk_threshold_high')"
        );
        const medium = rows.find(r => r.weight_key === 'risk_threshold_medium')?.points ?? 91;
        const high   = rows.find(r => r.weight_key === 'risk_threshold_high')?.points ?? 181;
        res.json({ medium_threshold: medium, high_threshold: high });
      } catch (err) {
        res.status(500).json({ message: 'Server error fetching thresholds.' });
      }
    },

    // GET /api/scoring/weights — all weights grouped by category
    getWeights: async (req, res) => {
      try {
        const [rows] = await pool.query('SELECT * FROM scoring_weights ORDER BY category, id ASC');
        const grouped = {};
        for (const row of rows) {
          if (!grouped[row.category]) grouped[row.category] = [];
          grouped[row.category].push(row);
        }
        res.json({ weights: grouped });
      } catch (err) {
        console.error('getWeights error:', err);
        res.status(500).json({ message: 'Server error fetching weights.' });
      }
    },

    // GET /api/scoring/max-score — compute current maximum possible score per category
    getMaxScore: async (req, res) => {
      try {
        const [weightRows] = await pool.query('SELECT weight_key, points FROM scoring_weights');
        const W = {};
        for (const row of weightRows) W[row.weight_key] = row.points;
        const w = (key) => W[key] || 0;
        const maxGroup = (keys) => Math.max(0, ...keys.map(k => W[k] || 0));

        const ageHealthMax =
          maxGroup(['age_under_26', 'age_26_35', 'age_36_45', 'age_46_55', 'age_56_plus']) +
          w('smoker_yes') +
          maxGroup(['health_good', 'health_fair', 'health_poor']);

        const financialMax =
          maxGroup(['dependents_1', 'dependents_2', 'dependents_3', 'dependents_4plus']) +
          maxGroup(['dti_under_20', 'dti_20_40', 'dti_40_60', 'dti_over_60']) +
          maxGroup(['emp_employed', 'emp_retired', 'emp_selfemployed', 'emp_parttime', 'emp_unemployed']) +
          maxGroup(['income_4000_7000', 'income_2500_4000', 'income_under_2500']) +
          maxGroup(['savings_20k_50k', 'savings_5k_20k', 'savings_under_5k']);

        const [optionRows] = await pool.query(
          `SELECT aq.category, MAX(aqs.score_points) as max_pts
           FROM assessment_questions aq
           JOIN assessment_question_options aqs ON aqs.question_id = aq.id
           WHERE aq.is_active = TRUE
           GROUP BY aq.id, aq.category`
        );
        const questionCatMax = {};
        for (const row of optionRows) {
          questionCatMax[row.category] = (questionCatMax[row.category] || 0) + Number(row.max_pts);
        }

        const insuranceGapsMax = questionCatMax['Insurance Gaps'] || 0;
        const lifestyleRisksMax = questionCatMax['Lifestyle Risks'] || 0;

        res.json({
          breakdown: {
            'Age & Health': ageHealthMax,
            'Financial Resilience': financialMax,
            'Insurance Gaps': insuranceGapsMax,
            'Lifestyle Risks': lifestyleRisksMax,
          },
          total: ageHealthMax + financialMax + insuranceGapsMax + lifestyleRisksMax
        });
      } catch (err) {
        console.error('getMaxScore error:', err);
        res.status(500).json({ message: 'Server error computing max score.' });
      }
    },

    // PUT /api/scoring/weights/:key — update a single weight's points
    updateWeight: async (req, res) => {
      try {
        const { key } = req.params;
        const { points } = req.body;
        if (points === undefined || points === null || isNaN(Number(points)) || Number(points) < 0) {
          return res.status(400).json({ message: 'Points must be a non-negative number.' });
        }
        const pts = Number(points);

        // Threshold-specific cross-field validation
        if (key === 'risk_threshold_medium' || key === 'risk_threshold_high') {
          if (!Number.isInteger(pts) || pts < 1) {
            return res.status(400).json({ message: 'Risk threshold must be a positive integer.' });
          }
          const otherKey = key === 'risk_threshold_medium' ? 'risk_threshold_high' : 'risk_threshold_medium';
          const [[other]] = await pool.query('SELECT points FROM scoring_weights WHERE weight_key = ?', [otherKey]);
          const otherPts = other?.points ?? (key === 'risk_threshold_medium' ? 181 : 91);
          if (key === 'risk_threshold_medium' && pts >= otherPts) {
            return res.status(400).json({ message: `Medium Risk threshold (${pts}) must be less than High Risk threshold (${otherPts}).` });
          }
          if (key === 'risk_threshold_high' && pts <= otherPts) {
            return res.status(400).json({ message: `High Risk threshold (${pts}) must be greater than Medium Risk threshold (${otherPts}).` });
          }
        }

        await pool.query('UPDATE scoring_weights SET points = ? WHERE weight_key = ?', [pts, key]);
        res.json({ message: 'Weight updated successfully.' });
      } catch (err) {
        console.error('updateWeight error:', err);
        res.status(500).json({ message: 'Server error updating weight.' });
      }
    },

  };
};

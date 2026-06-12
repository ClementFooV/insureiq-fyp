const mysql = require('mysql2/promise');
require('dotenv').config();

const run = async () => {
  const p = mysql.createPool({
    host: process.env.DB_HOST, 
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME
  });

  try {
    const query = `
      CREATE TABLE IF NOT EXISTS applications (
        id INT AUTO_INCREMENT PRIMARY KEY, 
        user_id INT NOT NULL, 
        plan_id INT NOT NULL, 
        provider_id INT NOT NULL, 
        assessment_id INT NOT NULL,
        applicant_name VARCHAR(100) NOT NULL, 
        applicant_email VARCHAR(100) NOT NULL, 
        applicant_phone VARCHAR(20) NOT NULL, 
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending', 
        notes TEXT, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, 
        FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE, 
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
      );
    `;
    await p.query(query);
    console.log('Applications table created successfully!');

    const notificationsQuery = `
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;
    await p.query(notificationsQuery);
    console.log('Notifications table created successfully!');

    // Scoring engine tables
    await p.query(`
      CREATE TABLE IF NOT EXISTS assessment_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_key VARCHAR(100) NOT NULL UNIQUE,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        category ENUM('Insurance Gaps','Lifestyle Risks') NOT NULL,
        display_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS assessment_question_options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_id INT NOT NULL,
        option_value VARCHAR(100) NOT NULL,
        option_label VARCHAR(500) NOT NULL,
        score_points INT NOT NULL DEFAULT 0,
        FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE
      );
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS scoring_weights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        weight_key VARCHAR(100) NOT NULL UNIQUE,
        label VARCHAR(200) NOT NULL,
        category VARCHAR(100) NOT NULL,
        points INT NOT NULL DEFAULT 0
      );
    `);
    console.log('Scoring engine tables created successfully!');

    // Seed questions (only if table is empty)
    const [existingQ] = await p.query('SELECT COUNT(*) as cnt FROM assessment_questions');
    if (existingQ[0].cnt === 0) {
      const seedQuestions = [
        { key: 'lifeInsurance',    title: 'Do you currently have Life Insurance?',                          desc: 'Life insurance provides a lump sum to your dependents if something were to happen to you.',                                     category: 'Insurance Gaps',  order: 1 },
        { key: 'medicalInsurance', title: 'Do you have Medical or Health Insurance?',                       desc: 'This covers hospitalisation and surgical costs in the event of illness or accidents.',                                         category: 'Insurance Gaps',  order: 2 },
        { key: 'criticalIllness',  title: 'Do you have Critical Illness coverage?',                         desc: 'This pays out a lump sum if you are diagnosed with a major illness like cancer, heart attack, or stroke.',                    category: 'Insurance Gaps',  order: 3 },
        { key: 'emergencyFund',    title: 'Do you have a 6-month Emergency Fund?',                          desc: 'Enough liquid cash savings to cover all your living expenses for 6 months if you lose your income.',                          category: 'Insurance Gaps',  order: 4 },
        { key: 'mortgage',         title: 'Do you have an active mortgage or housing loan?',                desc: 'Housing loans are often the largest liability for individuals.',                                                               category: 'Lifestyle Risks', order: 5 },
        { key: 'occupation',       title: 'Which best describes your daily occupation?',                    desc: 'Your daily environment impacts your likelihood of physical injury.',                                                          category: 'Lifestyle Risks', order: 6 },
        { key: 'familyHistory',    title: 'Is there a history of serious illness in your immediate family?',desc: 'Such as cancer, heart disease, or stroke among parents or siblings.',                                                        category: 'Lifestyle Risks', order: 7 },
        { key: 'travel',           title: 'Do you travel internationally 3 or more times per year?',        desc: 'Frequent travel can increase exposure to accidents or illnesses abroad.',                                                     category: 'Lifestyle Risks', order: 8 },
      ];
      const seedOptions = {
        lifeInsurance:    [{ value: 'yes', label: 'Yes, I have it covered',                          pts: 0  }, { value: 'no',        label: 'No, I don\'t have one',                              pts: 15 }],
        medicalInsurance: [{ value: 'yes', label: 'Yes, I have medical insurance',                   pts: 0  }, { value: 'no',        label: 'No, I rely on public healthcare or savings',          pts: 15 }],
        criticalIllness:  [{ value: 'yes', label: 'Yes, I am covered',                               pts: 0  }, { value: 'no',        label: 'No, I am not covered',                               pts: 10 }],
        emergencyFund:    [{ value: 'yes', label: 'Yes, I have a solid emergency fund',              pts: 0  }, { value: 'no',        label: 'No, I do not have 6 months of savings',              pts: 10 }],
        mortgage:         [{ value: 'yes', label: 'Yes, I am paying off a home loan',               pts: 10 }, { value: 'no',        label: 'No, I rent or own my home outright',                 pts: 0  }],
        occupation:       [{ value: 'desk',label: 'Desk / Office-based (Low physical risk)',         pts: 0  }, { value: 'manual',    label: 'Manual Labour (Moderate physical risk)',              pts: 10 }, { value: 'high-risk', label: 'High-Risk (Construction, Mining, Heights, etc.)', pts: 15 }],
        familyHistory:    [{ value: 'yes', label: 'Yes, there is a history',                         pts: 10 }, { value: 'no',        label: 'No family history known',                            pts: 0  }],
        travel:           [{ value: 'yes', label: 'Yes, I travel frequently',                        pts: 5  }, { value: 'no',        label: 'No, I rarely travel abroad',                         pts: 0  }],
      };
      for (const q of seedQuestions) {
        const [res] = await p.query(
          'INSERT INTO assessment_questions (question_key, title, description, category, display_order) VALUES (?,?,?,?,?)',
          [q.key, q.title, q.desc, q.category, q.order]
        );
        for (const opt of seedOptions[q.key]) {
          await p.query(
            'INSERT INTO assessment_question_options (question_id, option_value, option_label, score_points) VALUES (?,?,?,?)',
            [res.insertId, opt.value, opt.label, opt.pts]
          );
        }
      }
      console.log('Questions seeded successfully!');
    }

    // Seed scoring weights (only if table is empty)
    const [existingW] = await p.query('SELECT COUNT(*) as cnt FROM scoring_weights');
    if (existingW[0].cnt === 0) {
      const weights = [
        // Age & Health
        { key: 'age_56_plus',       label: 'Age ≥ 56',              category: 'Age & Health',         points: 20 },
        { key: 'age_46_55',         label: 'Age 46–55',             category: 'Age & Health',         points: 16 },
        { key: 'age_36_45',         label: 'Age 36–45',             category: 'Age & Health',         points: 12 },
        { key: 'age_26_35',         label: 'Age 26–35',             category: 'Age & Health',         points: 8  },
        { key: 'age_under_26',      label: 'Age < 26',              category: 'Age & Health',         points: 5  },
        { key: 'smoker_yes',        label: 'Smoker',                category: 'Age & Health',         points: 20 },
        { key: 'health_poor',       label: 'Health: Poor',          category: 'Age & Health',         points: 25 },
        { key: 'health_fair',       label: 'Health: Fair',          category: 'Age & Health',         points: 15 },
        { key: 'health_good',       label: 'Health: Good',          category: 'Age & Health',         points: 5  },
        // Financial Resilience
        { key: 'dependents_4plus',  label: 'Dependents ≥ 4',        category: 'Financial Resilience', points: 20 },
        { key: 'dependents_3',      label: 'Dependents = 3',        category: 'Financial Resilience', points: 15 },
        { key: 'dependents_2',      label: 'Dependents = 2',        category: 'Financial Resilience', points: 10 },
        { key: 'dependents_1',      label: 'Dependents = 1',        category: 'Financial Resilience', points: 5  },
        { key: 'dti_over_60',       label: 'DTI > 60%',             category: 'Financial Resilience', points: 20 },
        { key: 'dti_40_60',         label: 'DTI 40–60%',            category: 'Financial Resilience', points: 15 },
        { key: 'dti_20_40',         label: 'DTI 20–40%',            category: 'Financial Resilience', points: 10 },
        { key: 'dti_under_20',      label: 'DTI < 20%',             category: 'Financial Resilience', points: 5  },
        { key: 'emp_unemployed',    label: 'Employment: Unemployed', category: 'Financial Resilience', points: 15 },
        { key: 'emp_parttime',      label: 'Employment: Part-time/Contract', category: 'Financial Resilience', points: 12 },
        { key: 'emp_selfemployed',  label: 'Employment: Self-employed',      category: 'Financial Resilience', points: 10 },
        { key: 'emp_retired',       label: 'Employment: Retired',   category: 'Financial Resilience', points: 8  },
        { key: 'emp_employed',      label: 'Employment: Employed',  category: 'Financial Resilience', points: 5  },
        { key: 'income_under_2500', label: 'Income < RM2,500',      category: 'Financial Resilience', points: 15 },
        { key: 'income_2500_4000',  label: 'Income RM2,500–4,000',  category: 'Financial Resilience', points: 10 },
        { key: 'income_4000_7000',  label: 'Income RM4,000–7,000',  category: 'Financial Resilience', points: 5  },
        { key: 'income_7000_plus',  label: 'Income ≥ RM7,000',      category: 'Financial Resilience', points: 0  },
        { key: 'savings_under_5k',  label: 'Savings < RM5,000',     category: 'Financial Resilience', points: 15 },
        { key: 'savings_5k_20k',    label: 'Savings RM5,000–20,000',category: 'Financial Resilience', points: 10 },
        { key: 'savings_20k_50k',   label: 'Savings RM20,000–50,000',category: 'Financial Resilience',points: 5  },
        { key: 'savings_50k_plus',  label: 'Savings ≥ RM50,000',    category: 'Financial Resilience', points: 0  },
      ];
      for (const w of weights) {
        await p.query(
          'INSERT INTO scoring_weights (weight_key, label, category, points) VALUES (?,?,?,?)',
          [w.key, w.label, w.category, w.points]
        );
      }
      console.log('Scoring weights seeded successfully!');
    }

    // Add max_score to assessments if not already present (safe for re-runs)
    const [maxScoreCol] = await p.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'assessments' AND COLUMN_NAME = 'max_score'`,
      [process.env.DB_NAME]
    );
    if (maxScoreCol.length === 0) {
      await p.query('ALTER TABLE assessments ADD COLUMN max_score INT NOT NULL DEFAULT 240 AFTER total_score');
      console.log('Added max_score column to assessments table!');
    }

    // Add risk thresholds to scoring_weights if not already present
    const [thresholdCheck] = await p.query(
      "SELECT COUNT(*) as cnt FROM scoring_weights WHERE category = 'Risk Thresholds'"
    );
    if (thresholdCheck[0].cnt === 0) {
      await p.query('INSERT INTO scoring_weights (weight_key, label, category, points) VALUES (?,?,?,?)',
        ['risk_threshold_medium', 'Medium Risk \u2014 starts at score', 'Risk Thresholds', 91]);
      await p.query('INSERT INTO scoring_weights (weight_key, label, category, points) VALUES (?,?,?,?)',
        ['risk_threshold_high', 'High Risk \u2014 starts at score', 'Risk Thresholds', 181]);
      console.log('Risk threshold weights seeded!');
    }

    // Add coverage recommendation parameters if not already present
    const [covCheck] = await p.query(
      "SELECT COUNT(*) as cnt FROM scoring_weights WHERE weight_key LIKE 'rec_%'"
    );
    if (covCheck[0].cnt === 0) {
      const covParams = [
        // Life Insurance
        { key: 'rec_life_mult_low',       label: 'LOW risk multiplier (x annual income)',    cat: 'Life Insurance',    points: 5       },
        { key: 'rec_life_mult_medium',    label: 'MEDIUM risk multiplier (x annual income)', cat: 'Life Insurance',    points: 8       },
        { key: 'rec_life_mult_high',      label: 'HIGH risk multiplier (x annual income)',   cat: 'Life Insurance',    points: 10      },
        { key: 'rec_life_per_dependent',  label: 'Per-dependent add-on (RM)',                cat: 'Life Insurance',    points: 75000   },
        { key: 'rec_life_min',            label: 'Minimum coverage (RM)',                    cat: 'Life Insurance',    points: 100000  },
        { key: 'rec_life_max',            label: 'Maximum coverage (RM)',                    cat: 'Life Insurance',    points: 2000000 },
        // Medical Insurance
        { key: 'rec_medical_low',         label: 'LOW risk cap (RM)',                        cat: 'Medical Insurance', points: 100000 },
        { key: 'rec_medical_medium',      label: 'MEDIUM risk cap (RM)',                     cat: 'Medical Insurance', points: 150000 },
        { key: 'rec_medical_high',        label: 'HIGH risk cap (RM)',                       cat: 'Medical Insurance', points: 250000 },
        // Critical Illness
        { key: 'rec_ci_mult_low',         label: 'LOW risk multiplier (x annual income)',    cat: 'Critical Illness',  points: 2 },
        { key: 'rec_ci_mult_medium',      label: 'MEDIUM risk multiplier (x annual income)', cat: 'Critical Illness',  points: 3 },
        { key: 'rec_ci_mult_high',        label: 'HIGH risk multiplier (x annual income)',   cat: 'Critical Illness',  points: 5 },
        // Personal Accident
        { key: 'rec_pa_desk',             label: 'Desk occupation (RM)',                     cat: 'Personal Accident', points: 150000 },
        { key: 'rec_pa_manual',           label: 'Manual occupation (RM)',                   cat: 'Personal Accident', points: 250000 },
        { key: 'rec_pa_high_risk',        label: 'High-risk occupation (RM)',                cat: 'Personal Accident', points: 400000 },
        // Income Protection
        { key: 'rec_ip_rate',             label: 'Monthly income rate (%)',                  cat: 'Income Protection', points: 75 },
        { key: 'rec_ip_months_low',       label: 'LOW risk duration (months)',               cat: 'Income Protection', points: 12 },
        { key: 'rec_ip_months_high',      label: 'HIGH/MEDIUM risk duration (months)',       cat: 'Income Protection', points: 24 },
      ];
      for (const p2 of covParams) {
        await p.query('INSERT INTO scoring_weights (weight_key, label, category, points) VALUES (?,?,?,?)',
          [p2.key, p2.label, p2.cat, p2.points]);
      }
      console.log('Coverage parameter weights seeded!');
    }

    // Migration: rename old 'Coverage Parameters' category rows to per-type categories
    await p.query("UPDATE scoring_weights SET category = 'Life Insurance'    WHERE weight_key LIKE 'rec_life_%'    AND category = 'Coverage Parameters'");
    await p.query("UPDATE scoring_weights SET category = 'Medical Insurance' WHERE weight_key LIKE 'rec_medical_%' AND category = 'Coverage Parameters'");
    await p.query("UPDATE scoring_weights SET category = 'Critical Illness'  WHERE weight_key LIKE 'rec_ci_%'      AND category = 'Coverage Parameters'");
    await p.query("UPDATE scoring_weights SET category = 'Personal Accident' WHERE weight_key LIKE 'rec_pa_%'      AND category = 'Coverage Parameters'");
    await p.query("UPDATE scoring_weights SET category = 'Income Protection' WHERE weight_key LIKE 'rec_ip_%'      AND category = 'Coverage Parameters'");

    await p.query(`
      CREATE TABLE IF NOT EXISTS claims (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        user_id INT NOT NULL,
        provider_id INT NOT NULL,
        plan_id INT NOT NULL,
        claim_type ENUM('medical','accident','death','disability','critical_illness','property','other') NOT NULL,
        incident_date DATE NOT NULL,
        description TEXT NOT NULL,
        claimed_amount DECIMAL(12,2) NOT NULL,
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        settlement_amount DECIMAL(12,2) DEFAULT NULL,
        provider_notes TEXT DEFAULT NULL,
        documents JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
      );
    `);
    console.log('Claims table created successfully!');

    // Add documents column if it doesn't exist yet (compatible with older MySQL)
    const [docCols] = await p.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'claims' AND COLUMN_NAME = 'documents'`);
    if (docCols.length === 0) {
      await p.query(`ALTER TABLE claims ADD COLUMN documents JSON DEFAULT NULL`);
      console.log('Claims documents column added!');
    } else {
      console.log('Claims documents column already exists.');
    }

    await p.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        assessment_id INT NOT NULL,
        rating INT NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_assessment (user_id, assessment_id)
      );
    `);
    console.log('Feedback table created successfully!');

    await p.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
      console.log('Password reset tokens table created successfully!');

    // Migration: add start_date, end_date, and cancelled status to applications
    const [startDateCol] = await p.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications' AND COLUMN_NAME = 'start_date'`
    );
    if (startDateCol.length === 0) {
      await p.query(`ALTER TABLE applications ADD COLUMN start_date DATE DEFAULT NULL AFTER notes`);
      await p.query(`ALTER TABLE applications ADD COLUMN end_date DATE DEFAULT NULL AFTER start_date`);
      console.log('Added start_date and end_date columns to applications table!');
    }
    await p.query(`ALTER TABLE applications MODIFY COLUMN status ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending'`);
    console.log('Applications status ENUM updated to include cancelled!');

    // Documents and Chunks tables
    await p.query(`
      CREATE TABLE IF NOT EXISTS documents (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          title VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Documents table created successfully!');

    await p.query(`
      CREATE TABLE IF NOT EXISTS chunks (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          doc_id BIGINT UNSIGNED NOT NULL,
          content TEXT NOT NULL,
          
          -- Binary storage for the 768-dimension Gemini Embedding 2 vector
          embedding BLOB NOT NULL, 
          
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(255),
          
          -- Relationship: Ensures chunks are deleted if the document is removed
          CONSTRAINT fk_chunks_doc_id 
              FOREIGN KEY (doc_id) REFERENCES documents(id) 
              ON DELETE CASCADE,
          
          -- Enables keyword-based search alongside your vector search
          FULLTEXT KEY ft_content (content)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Chunks table created successfully!');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    process.exit(0);
  }
};

run();

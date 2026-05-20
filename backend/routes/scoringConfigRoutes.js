const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

module.exports = (pool) => {
  const router = express.Router();
  const c = require('../controllers/scoringConfigController')(pool);

  // Questions — authenticated users can read (for assessment page)
  router.get('/questions', authMiddleware, c.getQuestions);

  // Questions — admin only
  router.get('/questions/all', authMiddleware, requireRole('admin'), c.getAllQuestions);
  router.post('/questions', authMiddleware, requireRole('admin'), c.createQuestion);
  router.put('/questions/reorder', authMiddleware, requireRole('admin'), c.reorderQuestions);
  router.put('/questions/:id', authMiddleware, requireRole('admin'), c.updateQuestion);
  router.delete('/questions/:id', authMiddleware, requireRole('admin'), c.deleteQuestion);

  // Max score summary — admin only
  router.get('/max-score', authMiddleware, requireRole('admin'), c.getMaxScore);

  // Weights — admin only
  router.get('/weights', authMiddleware, requireRole('admin'), c.getWeights);
  router.put('/weights/:key', authMiddleware, requireRole('admin'), c.updateWeight);

  return router;
};

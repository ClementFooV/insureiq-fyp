const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

module.exports = (pool) => {
  const router = express.Router();
  const c = require('../controllers/exportController')(pool);

  router.get('/users', authMiddleware, requireRole('admin'), c.exportUsers);
  router.get('/assessments', authMiddleware, requireRole('admin'), c.exportAssessments);
  router.get('/applications', authMiddleware, requireRole('admin'), c.exportApplications);
  router.get('/feedback', authMiddleware, requireRole('admin'), c.exportFeedback);

  return router;
};

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

module.exports = (pool) => {
  const router = express.Router();
  const c = require('../controllers/feedbackController')(pool);

  router.post('/', authMiddleware, requireRole('individual'), c.submitFeedback);
  router.get('/my', authMiddleware, requireRole('individual'), c.getMyFeedback);
  router.get('/admin', authMiddleware, requireRole('admin'), c.getAdminFeedback);
  router.get('/provider', authMiddleware, requireRole('provider'), c.getProviderFeedback);

  return router;
};

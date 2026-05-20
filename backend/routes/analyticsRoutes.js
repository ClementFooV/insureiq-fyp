const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

module.exports = (pool) => {
  const router = express.Router();
  const analyticsController = require('../controllers/analyticsController')(pool);

  // Admin — full platform analytics
  router.get('/dashboard', authMiddleware, requireRole('admin'), analyticsController.getDashboardMetrics);

  // Provider — their plans & applications analytics
  router.get('/provider', authMiddleware, requireRole('provider', 'admin'), analyticsController.getProviderAnalytics);

  // Individual — personal risk analytics  
  router.get('/individual', authMiddleware, requireRole('individual'), analyticsController.getIndividualAnalytics);

  return router;
};

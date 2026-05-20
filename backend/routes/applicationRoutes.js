const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

module.exports = (pool) => {
  const router = express.Router();
  const applicationController = require('../controllers/applicationController')(pool);

  // [INDIVIDUAL] Submit a new application
  router.post('/apply', authMiddleware, requireRole('individual'), applicationController.applyForPlan);

  // [INDIVIDUAL] View own applications
  router.get('/my-applications', authMiddleware, requireRole('individual'), applicationController.getMyApplications);

  // [INDIVIDUAL] Withdraw a pending application
  router.delete('/:id/withdraw', authMiddleware, requireRole('individual'), applicationController.withdrawApplication);

  // [INDIVIDUAL] Cancel an approved policy
  router.put('/:id/cancel', authMiddleware, requireRole('individual'), applicationController.cancelPolicy);

  // [ADMIN] Get all applications
  router.get('/admin/all', authMiddleware, requireRole('admin'), applicationController.getAllApplications);

  // [PROVIDER] View applications for their plans
  router.get('/provider-queue', authMiddleware, requireRole('provider', 'admin'), applicationController.getProviderApplications);

  // [PROVIDER] Update status of an application
  router.put('/:id/status', authMiddleware, requireRole('provider', 'admin'), applicationController.updateApplicationStatus);

  return router;
};

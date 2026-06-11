const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');
const { planValidationRules, validateRequest } = require('../middleware/validationMiddleware');

module.exports = (pool) => {
  const router = express.Router();
  const planController = require('../controllers/planController')(pool);

  // Provider routes
  router.post('/', authMiddleware, requireRole('provider'), planValidationRules, validateRequest, planController.addPlan);
  router.get('/my-plans', authMiddleware, requireRole('provider'), planController.getMyPlans);

  // Admin routes
  router.get('/all', authMiddleware, requireRole('admin'), planController.getAllPlans);
  router.put('/:id/status', authMiddleware, requireRole('admin'), planController.updatePlanStatus);

  // Any authenticated user can view approved plans
  router.get('/approved', authMiddleware, planController.getApprovedPlans);

  // Individual: Get plans matched to their risk profile
  router.get('/matched', authMiddleware, requireRole('individual'), planController.getMatchedPlans);

  // Provider: Get single plan (for editing) — must be after all literal routes
  router.get('/:id', authMiddleware, requireRole('provider'), planController.getPlanById);
  router.put('/:id', authMiddleware, requireRole('provider'), planValidationRules, validateRequest, planController.updatePlan);
  router.delete('/:id', authMiddleware, requireRole('provider'), planController.deletePlan);

  return router;
};

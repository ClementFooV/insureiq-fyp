const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');
const { assessmentValidationRules, validateRequest } = require('../middleware/validationMiddleware');

module.exports = (pool) => {
  const router = express.Router();
  const assessmentController = require('../controllers/assessmentController')(pool);

  // Submit a new assessment
  router.post('/', authMiddleware, assessmentValidationRules, validateRequest, assessmentController.submitAssessment);

  // Get the latest assessment for the logged-in user
  router.get('/latest', authMiddleware, assessmentController.getLatestAssessment);

  // Get full history for the logged-in user (static route — must be before /:id)
  router.get('/history', authMiddleware, assessmentController.getAssessmentHistory);

  // [ADMIN] Get all assessments across all users
  router.get('/admin/all', authMiddleware, requireRole('admin'), assessmentController.getAllAssessments);

  // Get a specific assessment by ID (parameterised — must be last)
  router.get('/:id', authMiddleware, assessmentController.getAssessmentById);

  return router;
};

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { profileValidationRules, validateRequest } = require('../middleware/validationMiddleware');

module.exports = (pool) => {
  const router = express.Router();
  const profileController = require('../controllers/profileController')(pool);

  // Save or update profile (protected)
  router.post('/profile', authMiddleware, profileValidationRules, validateRequest, profileController.saveProfile);

  // Get current user's profile (protected)
  router.get('/profile', authMiddleware, profileController.getProfile);

  return router;
};

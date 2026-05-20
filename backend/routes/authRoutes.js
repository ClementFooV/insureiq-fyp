const express = require('express');
const { validateRequest, registerValidationRules, loginValidationRules, changePasswordValidationRules, forgotPasswordValidationRules, resetPasswordValidationRules } = require('../middleware/validationMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = (pool) => {
  const router = express.Router();
  const authController = require('../controllers/authController')(pool);

  // 1. Register Route definition
  router.post('/register', 
    registerValidationRules, 
    validateRequest, 
    authController.register
  );

  // 2. Standard Login Route definition
  router.post('/login', 
    loginValidationRules, 
    validateRequest, 
    authController.login
  );

  // 3. Google Login Route definition
  router.post('/google-login', authController.googleLogin);

  // 4. Forgot / Reset Password
  router.post('/forgot-password', forgotPasswordValidationRules, validateRequest, authController.forgotPassword);
  router.post('/reset-password', resetPasswordValidationRules, validateRequest, authController.resetPassword);

  // 5. Change password (authenticated)
  router.put('/change-password', authMiddleware, changePasswordValidationRules, validateRequest, authController.changePassword);

  return router;
};

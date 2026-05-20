const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

const registerValidationRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[\W_]/).withMessage('Password must contain at least one special character')
];

const loginValidationRules = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required')
];

const profileValidationRules = [
  body('age').isInt({ min: 18, max: 100 }).withMessage('Age must be between 18 and 100'),
  body('gender').isIn(['Male', 'Female']).withMessage('Gender must be Male or Female'),
  body('employment_status')
    .isIn(['Employed', 'Self-employed', 'Part-time/Contract', 'Unemployed', 'Retired', 'Student'])
    .withMessage('Invalid employment status'),
  body('monthly_income').isFloat({ min: 0 }).withMessage('Monthly income must be 0 or greater'),
  body('num_dependents').isInt({ min: 0 }).withMessage('Number of dependents must be a non-negative integer'),
  body('total_liabilities').isFloat({ min: 0 }).withMessage('Total liabilities must be 0 or greater'),
  body('health_status')
    .isIn(['Excellent', 'Good', 'Fair', 'Poor'])
    .withMessage('Invalid health status'),
  body('smoker').isBoolean().withMessage('Smoker must be true or false'),
  body('savings').isFloat({ min: 0 }).withMessage('Savings must be 0 or greater')
];

const assessmentValidationRules = [
  body('lifeInsurance').isIn(['yes', 'no']).withMessage('lifeInsurance must be yes or no'),
  body('medicalInsurance').isIn(['yes', 'no']).withMessage('medicalInsurance must be yes or no'),
  body('criticalIllness').isIn(['yes', 'no']).withMessage('criticalIllness must be yes or no'),
  body('mortgage').isIn(['yes', 'no']).withMessage('mortgage must be yes or no'),
  body('occupation').isIn(['desk', 'manual', 'high-risk']).withMessage('Invalid occupation value'),
  body('familyHistory').isIn(['yes', 'no']).withMessage('familyHistory must be yes or no'),
  body('travel').isIn(['yes', 'no']).withMessage('travel must be yes or no'),
  body('emergencyFund').isIn(['yes', 'no']).withMessage('emergencyFund must be yes or no')
];

const planValidationRules = [
  body('plan_name').trim().notEmpty().withMessage('Plan name is required'),
  body('insurance_type')
    .isIn(['life', 'medical', 'critical_illness', 'personal_accident', 'income_protection'])
    .withMessage('Invalid insurance type'),
  body('coverage_amount').isFloat({ gt: 0 }).withMessage('Coverage amount must be a positive number'),
  body('premium_monthly').isFloat({ gt: 0 }).withMessage('Monthly premium must be a positive number'),
  body('min_age').optional().isInt({ min: 0, max: 120 }).withMessage('Min age must be between 0 and 120'),
  body('max_age').optional().isInt({ min: 0, max: 120 }).withMessage('Max age must be between 0 and 120'),
  body().custom((value, { req }) => {
    const min = Number(req.body.min_age);
    const max = Number(req.body.max_age);
    if (req.body.min_age && req.body.max_age && min > max) {
      throw new Error('Min age cannot be greater than max age');
    }
    return true;
  })
];

const changePasswordValidationRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[\W_]/).withMessage('Password must contain at least one special character')
];

const forgotPasswordValidationRules = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address')
];

const resetPasswordValidationRules = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[\W_]/).withMessage('Password must contain at least one special character')
];

module.exports = {
  validateRequest,
  registerValidationRules,
  loginValidationRules,
  profileValidationRules,
  assessmentValidationRules,
  planValidationRules,
  changePasswordValidationRules,
  forgotPasswordValidationRules,
  resetPasswordValidationRules
};

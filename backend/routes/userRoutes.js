const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

module.exports = (pool) => {
  const router = express.Router();
  const userController = require('../controllers/userController')(pool);

  // All routes are admin-only
  router.get('/', authMiddleware, requireRole('admin'), userController.getAllUsers);
  router.get('/:id/profile', authMiddleware, requireRole('admin'), userController.getUserProfile);
  router.put('/:id/profile', authMiddleware, requireRole('admin'), userController.adminUpdateUserProfile);
  router.post('/create-provider', authMiddleware, requireRole('admin'), userController.createProvider);
  router.put('/:id', authMiddleware, requireRole('admin'), userController.updateUser);
  router.put('/:id/toggle-status', authMiddleware, requireRole('admin'), userController.toggleStatus);
  router.delete('/:id', authMiddleware, requireRole('admin'), userController.deleteUser);

  return router;
};

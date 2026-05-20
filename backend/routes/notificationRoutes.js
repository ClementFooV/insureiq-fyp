const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = (pool) => {
  const router = express.Router();
  const notificationController = require('../controllers/notificationController')(pool);

  router.get('/', authMiddleware, notificationController.getNotifications);
  router.put('/read-all', authMiddleware, notificationController.markAllAsRead);
  router.put('/:id/read', authMiddleware, notificationController.markAsRead);

  return router;
};

module.exports = (pool) => {
  return {
    // GET /api/notifications — fetch last 20 for current user
    getNotifications: async (req, res) => {
      try {
        const userId = req.user.id;
        const [rows] = await pool.query(
          'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
          [userId]
        );
        const unreadCount = rows.filter(n => !n.is_read).length;
        res.json({ notifications: rows, unreadCount });
      } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ message: 'Server error fetching notifications.' });
      }
    },

    // PUT /api/notifications/:id/read — mark one as read
    markAsRead: async (req, res) => {
      try {
        const userId = req.user.id;
        const { id } = req.params;
        await pool.query(
          'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
          [id, userId]
        );
        res.json({ message: 'Notification marked as read.' });
      } catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ message: 'Server error.' });
      }
    },

    // PUT /api/notifications/read-all — mark all as read
    markAllAsRead: async (req, res) => {
      try {
        const userId = req.user.id;
        await pool.query(
          'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
          [userId]
        );
        res.json({ message: 'All notifications marked as read.' });
      } catch (err) {
        console.error('Error marking all notifications as read:', err);
        res.status(500).json({ message: 'Server error.' });
      }
    }
  };
};

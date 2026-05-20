const express = require('express');

module.exports = (pool) => {
    const router = express.Router();
    const ragController = require('../controllers/ragController')(pool);

    router.post('/ask', ragController.ask);

    return router;
};

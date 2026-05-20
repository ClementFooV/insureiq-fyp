const express = require('express');

module.exports = (pool) => {
    const router = express.Router();
    const chunkController = require('../controllers/chunkController')(pool);

    router.post('/client/markdown', chunkController.clientMarkdown);
    router.get('/client/markdown', chunkController.getAllDocuments);
    router.put('/client/markdown/:id', chunkController.updateDocument);
    router.delete('/client/markdown/:id', chunkController.deleteDocument);

    return router;
};

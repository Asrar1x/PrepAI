const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const getHealth = (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    database: isConnected ? 'connected' : 'disconnected',
    db_engine: 'MongoDB',
    collections: Object.keys(mongoose.connection.collections),
    timestamp: new Date().toISOString()
  });
};

router.get('', getHealth);
router.get('/', getHealth);

module.exports = router;

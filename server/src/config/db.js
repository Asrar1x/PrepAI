const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(require('./env').mongoUri);
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

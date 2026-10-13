// Unit tests never touch a database: fail fast instead of buffering Mongo operations
const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);
process.env.NODE_ENV = 'test';

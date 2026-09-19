const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/files';

async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGO_URI);
  console.log(`[db] connected to ${MONGO_URI}`);
}

module.exports = { connectDB, MONGO_URI };

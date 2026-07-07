const mongoose = require('mongoose');
const dns = require('dns');

// Node's built-in resolver sometimes fails SRV lookups for mongodb+srv:// URIs
// on Windows (e.g. when the OS-configured DNS server is a link-local router
// address). Pinning to public resolvers fixes SRV/TXT resolution for Atlas.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('MongoDB connection failed: MONGO_URI is not set in environment variables.');
    return;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    console.error('The server will continue running, but database operations will fail until MongoDB is reachable.');
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });
};

module.exports = connectDB;

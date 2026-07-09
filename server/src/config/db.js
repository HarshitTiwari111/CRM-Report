const mongoose = require('mongoose');
const dns = require('dns');

// Node's built-in resolver sometimes fails SRV lookups for mongodb+srv:// URIs
// on Windows (e.g. when the OS-configured DNS server is a link-local router
// address). Pinning to public resolvers fixes SRV/TXT resolution for Atlas.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  let uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('MongoDB connection failed: MONGO_URI is not set in environment variables.');
    return;
  }

  // Log only the database name (no credentials) to verify environment isolation.
  const dbNameMatch = uri.match(/\/([^/?]+)(?:\?|$)/);
  const dbName = dbNameMatch?.[1] || 'unknown';

  // Safety: in local development, prevent accidental writes to the live DB.
  // If you are pointing at `.../crm-report`, rewrite to `.../crm-report-local`.
  if ((process.env.NODE_ENV || 'development') !== 'production' && dbName === 'crm-report') {
    uri = uri.replace(/\/crm-report(?=\?|$)/, '/crm-report-local');
  }

  const effectiveDbNameMatch = uri.match(/\/([^/?]+)(?:\?|$)/);
  const effectiveDbName = effectiveDbNameMatch?.[1] || 'unknown';
  console.log(`[Mongo] Using database: ${effectiveDbName}`);

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

const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');
const env = require('./env');
let localServer;

async function connectDB() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    if (env.production || process.env.LOCAL_DATABASE === 'false')
      throw new Error('Set MONGODB_URI to a MongoDB replica-set connection.');
    const { MongoMemoryReplSet } = require('mongodb-memory-server');
    const dbPath = path.join(env.localDir, 'mongo-v1');
    fs.mkdirSync(dbPath, { recursive: true });
    localServer = await MongoMemoryReplSet.create({
      binary: { version: '7.0.24' },
      instanceOpts: [{ dbPath, port: 27019 }],
      replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' },
    });
    uri = localServer.getUri('dumco');
    console.log('Local MongoDB replica set ready (persistent development data).');
  }
  // Route DTOs accept primitive fields only; all MongoDB filters are constructed here in trusted code.
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
}
async function disconnectDB() {
  await mongoose.disconnect();
  if (localServer) await localServer.stop({ doCleanup: false });
}
module.exports = { connectDB, disconnectDB };

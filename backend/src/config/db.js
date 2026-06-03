import mongoose from 'mongoose';
import { getEnv } from './env.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

export async function connectDb() {
  const { mongoUri } = getEnv();

  if (!mongoUri) {
    console.error('MongoDB Connection Failed: MONGODB_URI is not defined');
    throw new Error('MONGODB_URI is not defined');
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10
    });

    console.log('MongoDB Connected Successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB Connection Failed', error.message || error);

    // In non-production environments, fall back to an in-memory MongoDB
    // so the backend can start for local development and testing.
    const { nodeEnv } = getEnv();
    if (nodeEnv !== 'production') {
      try {
        console.log('Starting in-memory MongoDB for development fallback...');
        const mongod = await MongoMemoryServer.create();
        const memUri = mongod.getUri();

        await mongoose.connect(memUri, {
          serverSelectionTimeoutMS: 10000,
          maxPoolSize: 10
        });

        console.log('Connected to in-memory MongoDB');
        return mongoose.connection;
      } catch (memErr) {
        console.error('In-memory MongoDB failed', memErr.message || memErr);
        throw memErr;
      }
    }

    throw error;
  }
}
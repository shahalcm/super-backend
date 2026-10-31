// src/config/database.ts
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

export async function connectDatabase(): Promise<typeof mongoose | null> {
  if (isConnected) {
    return mongoose;
  }

  // Prevent Mongoose from hanging for 10,000ms on offline queries
  mongoose.set('bufferCommands', false);

  const options: mongoose.ConnectOptions = {
    maxPoolSize: 25,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 2000,
    socketTimeoutMS: 45000,
    family: 4, // IPv4
  };

  try {
    const conn = await mongoose.connect(env.MONGO_URI, options);
    isConnected = true;
    logger.info(`📦 MongoDB Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB runtime connection error');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('✅ MongoDB reconnected successfully');
      isConnected = true;
    });

    return conn;
  } catch (error: any) {
    logger.error({ err: error.message }, '❌ Failed to connect to MongoDB');
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
    logger.warn('⚠️ Running in disconnected mode. Database operations will queue or fail until MongoDB is active.');
    return null;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected gracefully.');
  }
}

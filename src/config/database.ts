// src/config/database.ts
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

export async function connectDatabase(): Promise<typeof mongoose | null> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const options: mongoose.ConnectOptions = {
    maxPoolSize: 25,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  };

  try {
    const conn = await mongoose.connect(env.MONGO_URI, options);
    isConnected = true;
    logger.info(`📦 MongoDB Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error({ err: err.message }, 'MongoDB runtime connection error');
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
      logger.warn('Production MongoDB connection pending. Will retry connection in background.');
      setTimeout(() => connectDatabase().catch(() => {}), 5000);
    }
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

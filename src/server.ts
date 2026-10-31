// src/server.ts
import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { initializeSockets } from './sockets/index.js';
import { logger } from './utils/logger.js';

const server = http.createServer(app);

// Initialize real-time Socket.IO dispatch server
initializeSockets(server);

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();

    server.listen(env.PORT, () => {
      logger.info(`========================================================`);
      logger.info(`🚀 UBSSUPER ECOSYSTEM CENTRAL BACKEND INITIALIZED SUCCESSFULLY`);
      logger.info(`📡 Port: ${env.PORT} | Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Base API URL: http://localhost:${env.PORT}/api/v1`);
      logger.info(`🏥 Health Check: http://localhost:${env.PORT}/health`);
      logger.info(`⚡ Socket.IO Server: Active on ws://localhost:${env.PORT}`);
      logger.info(`========================================================`);
    });
  } catch (error: any) {
    logger.error({ err: error.message }, 'Failed to start UBSSuper Central Server');
    process.exit(1);
  }
}

// Graceful Termination
const handleShutdown = async (signal: string) => {
  logger.info(`🛑 Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectDatabase();
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forceful shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

startServer();

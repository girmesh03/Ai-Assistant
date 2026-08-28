import mongoose from 'mongoose';
import { connectWithRetry } from './config/mongo.js';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

/**
 * Starts the HTTP server and keeps the process alive until a shutdown signal.
 *
 * Connects to MongoDB first (via connectWithRetry, which never gives up),
 * then listens on the configured port. Registers graceful shutdown for
 * SIGINT and SIGTERM.
 *
 * @returns {Promise<void>} Resolves once the server is listening.
 */
const main = async () => {
  await connectWithRetry();

  const server = app.listen(env.port, () => {
    logger.info(`Ai-Assistant API listening on http://localhost:${env.port}`);
  });

  /**
   * Gracefully closes the HTTP server and the Mongo connection.
   *
   * @param {string} signal - The received signal name.
   * @returns {Promise<void>} Resolves once shutdown completes.
   */
  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down...`);
    server.close(async () => {
      await mongoose.disconnect();
      logger.info('Shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

main().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
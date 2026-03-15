import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root (parent of server/)
// process.cwd() is server/, so ../.env is the project root
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
import 'reflect-metadata';
// Import logger first to ensure container registration
import '../logger';
import { container } from 'tsyringe';
import { app } from '../http/server';
import { loadServerConfig } from '../http/conf';
import { Logger } from '../logger';
import { DatabasePool } from '../database';

const config = loadServerConfig();

export async function startServer(): Promise<void> {
  const logger = container.resolve<Logger>('Logger');
  const dbPool = container.resolve(DatabasePool);

  // Connect to database
  await dbPool.connect();
  await dbPool.runMigrations();

  app.listen(config.port, config.host, () => {
    logger.info({ port: config.port, host: config.host }, 'Server started');
  });
}

// Run if called directly
if (require.main === module) {
  startServer().catch((err) => {
    container.resolve<Logger>('Logger').error({ err }, 'Failed to start server');
    process.exit(1);
  });
}


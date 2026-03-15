import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root (parent of server/)
// process.cwd() is server/, so ../.env is the project root
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
import 'reflect-metadata';
// Import logger first to ensure container registration
import '../logger';
import { container } from 'tsyringe';
import { Logger } from '../logger';
import { Collector } from '../collector/collector';

/**
 * Entry point for the stock price collector daemon.
 * Run with: pnpm run dev:collect-stock-data
 */
export async function startCollector(): Promise<void> {
  const logger = container.resolve<Logger>('Logger');
  const collector = container.resolve(Collector);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');
    await collector.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  await collector.start();
}

if (require.main === module) {
  startCollector().catch((err) => {
    container.resolve<Logger>('Logger').error({ err }, 'Fatal error');
    process.exit(1);
  });
}


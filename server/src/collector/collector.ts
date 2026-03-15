import { inject, injectable } from 'tsyringe';
import { Logger } from '../logger';
import { DatabasePool } from '../database';
import { PriceRepository } from '../repositories/priceRepository';
import { PriceGenerator, PricePoint } from '../services/priceGenerator';
import { CsvParser } from './csvParser';
import { CollectorConfig } from './conf';

/**
 * Stock Price Collector Daemon
 *
 * Simulates real-time stock price collection by:
 * 1. Loading initial prices from CSV on first run
 * 2. Generating price fluctuations using random-walk algorithm
 * 3. Persisting prices to PostgreSQL at configurable intervals
 */
@injectable()
export class Collector {
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    @inject('Logger') private logger: Logger,
    private config: CollectorConfig,
    private csvParser: CsvParser,
    private dbPool: DatabasePool,
    private priceRepository: PriceRepository,
    private priceGenerator: PriceGenerator
  ) {}

  async start(): Promise<void> {
    this.logger.info({ intervalMs: this.config.intervalMs }, 'Starting collector daemon');

    await this.dbPool.connect();
    await this.dbPool.runMigrations();
    await this.loadInitialData();

    this.scheduleNextCycle();
    this.logger.info({ intervalMs: this.config.intervalMs }, 'Collector started');
  }

  async stop(): Promise<void> {
    this.logger.info('Graceful shutdown initiated...');

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    await this.dbPool.disconnect();
    this.logger.info('Collector stopped');
  }

  private scheduleNextCycle(): void {
    this.timeoutId = setTimeout(async () => {
      await this.runCycle();
      // Only schedule next if timeout wasn't cleared (i.e., stop() wasn't called)
      if (this.timeoutId) {
        this.scheduleNextCycle();
      }
    }, this.config.intervalMs);
  }

  private async loadInitialData(): Promise<void> {
    const hasExisting = await this.priceRepository.hasExistingPrices();

    if (hasExisting) {
      this.logger.info('Database has existing prices, skipping CSV load');
      return;
    }

    this.logger.info({ csvPath: this.config.csvPath }, 'Loading initial prices from CSV');

    try {
      const stocks = await this.csvParser.parse(this.config.csvPath);

      if (stocks.length === 0) {
        this.logger.error('No stocks loaded from CSV file');
        process.exit(1);
      }

      const timestamp = new Date().toISOString();
      const prices: PricePoint[] = stocks.map((stock) => ({
        symbol: stock.symbol,
        price: stock.initialPrice,
        timestamp,
      }));

      await this.priceRepository.insertPrices(prices);
      this.logger.info({ count: stocks.length }, 'Loaded initial prices from CSV');
    } catch (err) {
      this.logger.error({ err, csvPath: this.config.csvPath }, 'Failed to load CSV file');
      process.exit(1);
    }
  }

  private async runCycle(): Promise<void> {
    const cycleStart = Date.now();

    try {
      const currentPrices = await this.priceRepository.getLatestPrices();

      if (currentPrices.size === 0) {
        this.logger.warn('No prices in database, skipping cycle');
        return;
      }

      const newPrices = this.priceGenerator.generateBatch(currentPrices, this.config.volatility);
      await this.priceRepository.insertPrices(newPrices);

      const cycleDuration = Date.now() - cycleStart;
      this.logger.info({ count: newPrices.length, durationMs: cycleDuration }, 'Price generation cycle complete');
    } catch (err) {
      // TODO: Implement exponential backoff or exit for orchestrator restart
      this.logger.error({ err }, 'Failed to complete price generation cycle');
    }
  }
}


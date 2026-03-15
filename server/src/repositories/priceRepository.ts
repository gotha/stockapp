import { Pool } from 'pg';
import { inject, injectable } from 'tsyringe';
import { PricePoint } from '../services/priceGenerator';
import { Logger } from '../logger';
import { DatabasePool } from '../database';

export { PricePoint };

/**
 * Price data within a time range for profit calculation
 */
export interface TimeRangePriceData {
  price: number;
  timestamp: Date;
}

/**
 * Repository for price data operations.
 * Requires DatabasePool to be connected before use.
 */
@injectable()
export class PriceRepository {
  constructor(
    @inject('Logger') private logger: Logger,
    @inject(DatabasePool) private dbPool: DatabasePool
  ) {}

  /**
   * Get the underlying pool, throwing if not connected.
   */
  private get pool(): Pool {
    return this.dbPool.getPool();
  }

  /**
   * Check if any prices exist in the database
   */
  async hasExistingPrices(): Promise<boolean> {
    const result = await this.pool.query('SELECT EXISTS(SELECT 1 FROM prices LIMIT 1)');
    return result.rows[0].exists;
  }

  /**
   * Get the latest price for each stock symbol
   */
  async getLatestPrices(): Promise<Map<string, number>> {
    const query = `
      SELECT DISTINCT ON (symbol) symbol, price
      FROM prices
      ORDER BY symbol, timestamp DESC
    `;

    const result = await this.pool.query(query);
    const prices = new Map<string, number>();

    for (const row of result.rows) {
      prices.set(row.symbol, parseFloat(row.price));
    }

    return prices;
  }

  /**
   * Insert multiple price points in a batch
   */
  async insertPrices(prices: PricePoint[]): Promise<void> {
    if (prices.length === 0) {
      return;
    }

    // Build bulk insert query with symbol
    const values: (string | number)[] = [];
    const placeholders: string[] = [];

    prices.forEach((price, index) => {
      const offset = index * 3;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
      values.push(price.symbol, price.price, price.timestamp);
    });

    const query = `
      INSERT INTO prices (symbol, price, timestamp)
      VALUES ${placeholders.join(', ')}
    `;

    try {
      await this.pool.query(query, values);
    } catch (err) {
      // TODO: Implement exponential backoff or exit for orchestrator restart
      // For now, log error and continue per spec clarification
      this.logger.error({ err }, 'Failed to insert prices to database');
      throw err;
    }
  }

  /**
   * Get prices for a symbol within a time range, ordered by timestamp ascending
   */
  async getPricesInTimeRange(
    symbol: string,
    startTime: Date,
    endTime: Date
  ): Promise<TimeRangePriceData[]> {
    const query = `
      SELECT price, timestamp
      FROM prices
      WHERE symbol = $1
        AND timestamp >= $2
        AND timestamp <= $3
      ORDER BY timestamp ASC
    `;

    const result = await this.pool.query(query, [symbol, startTime, endTime]);

    return result.rows.map((row) => ({
      price: parseFloat(row.price),
      timestamp: new Date(row.timestamp),
    }));
  }

  /**
   * Check if a symbol exists in the database
   */
  async symbolExists(symbol: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT EXISTS(SELECT 1 FROM prices WHERE symbol = $1 LIMIT 1)',
      [symbol]
    );
    return result.rows[0].exists;
  }
}


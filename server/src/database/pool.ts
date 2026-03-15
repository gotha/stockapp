import { Pool } from 'pg';
import { inject, injectable, singleton } from 'tsyringe';
import { Logger } from '../logger';
import { DatabaseConfig } from './conf';

/**
 * Database connection pool manager.
 * Handles connection lifecycle and provides access to the underlying pool.
 */
@singleton()
@injectable()
export class DatabasePool {
  private pool: Pool | null = null;

  constructor(
    @inject('Logger') private logger: Logger,
    private config: DatabaseConfig
  ) {}

  /**
   * Connect to the database.
   * Must be called before getPool().
   */
  async connect(): Promise<void> {
    if (this.pool) {
      return; // Already connected
    }

    this.pool = new Pool({
      connectionString: this.config.connectionString,
    });

    // Test connection
    await this.pool.query('SELECT 1');
    this.logger.info('Connected to database');
  }

  /**
   * Disconnect from the database.
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.logger.info('Disconnected from database');
    }
  }

  /**
   * Get the underlying pg Pool instance.
   * Throws if not connected.
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Not connected to database');
    }
    return this.pool;
  }

  /**
   * Check if currently connected.
   */
  isConnected(): boolean {
    return this.pool !== null;
  }

  /**
   * Run database migrations.
   */
  async runMigrations(): Promise<void> {
    const pool = this.getPool();

    const migration = `
      CREATE TABLE IF NOT EXISTS prices (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(10) NOT NULL,
        price DECIMAL(12, 4) NOT NULL CHECK (price > 0),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_prices_symbol_timestamp
        ON prices(symbol, timestamp DESC);
    `;

    await pool.query(migration);
    this.logger.info('Database migration completed');
  }
}


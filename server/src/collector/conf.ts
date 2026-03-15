import { inject, injectable } from 'tsyringe';
import { Logger } from '../logger';

/**
 * Default configuration values
 */
const DEFAULTS = {
  intervalMs: 5000, // 5 seconds
  volatility: 0.02, // 2%
  csvPath: './fortune-500.csv',
  logLevel: 'info',
};

/**
 * Validation constraints
 */
const CONSTRAINTS = {
  minIntervalMs: 1000, // 1 second minimum
  minVolatility: 0.001, // 0.1%
  maxVolatility: 0.1, // 10%
};

/**
 * Collector daemon configuration.
 * Loads and validates from environment variables on construction.
 */
@injectable()
export class CollectorConfig {
  /** Price generation interval in milliseconds (default: 5000 = 5 sec) */
  readonly intervalMs: number;
  /** Price volatility as decimal (default: 0.02 = 2%) */
  readonly volatility: number;
  /** Path to CSV file with stock data */
  readonly csvPath: string;
  /** Log level (debug, info, warn, error) */
  readonly logLevel: string;

  constructor(@inject('Logger') private logger: Logger) {
    this.intervalMs = this.parseIntEnv('COLLECTION_INTERVAL_MS', DEFAULTS.intervalMs);
    this.volatility = this.parseFloatEnv('PRICE_VOLATILITY', DEFAULTS.volatility);
    this.csvPath = process.env.CSV_PATH || DEFAULTS.csvPath;
    this.logLevel = process.env.LOG_LEVEL || DEFAULTS.logLevel;

    this.validate();

    this.logger.info(
      {
        intervalMs: this.intervalMs,
        volatility: this.volatility,
        csvPath: this.csvPath,
        logLevel: this.logLevel,
      },
      'Collector configuration loaded'
    );
  }

  private validate(): void {
    if (this.intervalMs < CONSTRAINTS.minIntervalMs) {
      this.logger.warn(
        { intervalMs: this.intervalMs, min: CONSTRAINTS.minIntervalMs },
        'Interval too small, using minimum'
      );
      (this as { intervalMs: number }).intervalMs = CONSTRAINTS.minIntervalMs;
    }

    if (this.volatility < CONSTRAINTS.minVolatility) {
      this.logger.warn(
        { volatility: this.volatility, min: CONSTRAINTS.minVolatility },
        'Volatility too small, using minimum'
      );
      (this as { volatility: number }).volatility = CONSTRAINTS.minVolatility;
    }

    if (this.volatility > CONSTRAINTS.maxVolatility) {
      this.logger.warn(
        { volatility: this.volatility, max: CONSTRAINTS.maxVolatility },
        'Volatility too large, using maximum'
      );
      (this as { volatility: number }).volatility = CONSTRAINTS.maxVolatility;
    }
  }

  private parseIntEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      this.logger.warn({ key, value }, 'Invalid integer value, using default');
      return defaultValue;
    }

    return parsed;
  }

  private parseFloatEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;

    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      this.logger.warn({ key, value }, 'Invalid float value, using default');
      return defaultValue;
    }

    return parsed;
  }
}


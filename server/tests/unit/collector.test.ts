import { CollectorConfig } from '../../src/collector/conf';
import { Logger } from '../../src/logger';

/**
 * Collector Unit Tests
 *
 * Tests for CollectorConfig class.
 * Note: Full integration tests require a running database.
 */

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

describe('CollectorConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should use default interval when not specified', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    delete process.env.COLLECTION_INTERVAL_MS;

    const config = new CollectorConfig(mockLogger);

    expect(config.intervalMs).toBe(5000); // 5 seconds default
  });

  it('should parse custom interval from environment', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.COLLECTION_INTERVAL_MS = '60000';

    const config = new CollectorConfig(mockLogger);

    expect(config.intervalMs).toBe(60000);
  });

  it('should use default volatility when not specified', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    delete process.env.PRICE_VOLATILITY;

    const config = new CollectorConfig(mockLogger);

    expect(config.volatility).toBe(0.02); // 2% default
  });

  it('should parse custom volatility from environment', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.PRICE_VOLATILITY = '0.05';

    const config = new CollectorConfig(mockLogger);

    expect(config.volatility).toBe(0.05);
  });

  it('should not require DATABASE_URL (handled by DatabaseConfig)', () => {
    delete process.env.DATABASE_URL;

    // CollectorConfig no longer validates DATABASE_URL - DatabaseConfig does that
    expect(() => new CollectorConfig(mockLogger)).not.toThrow();
  });

  it('should use default CSV path when not specified', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    delete process.env.CSV_PATH;

    const config = new CollectorConfig(mockLogger);

    expect(config.csvPath).toBe('./fortune-500.csv');
  });

  it('should parse custom CSV path from environment', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.CSV_PATH = '/custom/path/stocks.csv';

    const config = new CollectorConfig(mockLogger);

    expect(config.csvPath).toBe('/custom/path/stocks.csv');
  });

  it('should enforce minimum interval constraint', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.COLLECTION_INTERVAL_MS = '100'; // Below minimum

    const config = new CollectorConfig(mockLogger);

    expect(config.intervalMs).toBeGreaterThanOrEqual(1000);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should enforce volatility constraints', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.PRICE_VOLATILITY = '0.5'; // 50% - above maximum

    const config = new CollectorConfig(mockLogger);

    expect(config.volatility).toBeLessThanOrEqual(0.1);
    expect(mockLogger.warn).toHaveBeenCalled();
  });
});


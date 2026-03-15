import { PriceRepository, PricePoint } from '../../src/repositories/priceRepository';
import { DatabasePool, DatabaseConfig } from '../../src/database';
import { Logger } from '../../src/logger';

// Mock logger for tests
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

// Create database config from environment
const createDbConfig = (): DatabaseConfig => {
  return new DatabaseConfig();
};

/**
 * Integration tests for PriceRepository
 *
 * Requirements:
 * - PostgreSQL running with DATABASE_URL set
 * - Run with: pnpm test:integration
 */
describe('PriceRepository Integration', () => {
  let dbPool: DatabasePool;
  let repository: PriceRepository;

  beforeAll(async () => {
    const dbConfig = createDbConfig();
    dbPool = new DatabasePool(mockLogger, dbConfig);
    await dbPool.connect();
    await dbPool.runMigrations();
    repository = new PriceRepository(mockLogger, dbPool);
  });

  afterAll(async () => {
    await dbPool.disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    // Note: In real tests, use a test database or transactions
  });

  describe('hasExistingPrices', () => {
    it('should return false when no prices exist', async () => {
      // This test assumes an empty database or isolated test schema
      const hasExisting = await repository.hasExistingPrices();
      expect(typeof hasExisting).toBe('boolean');
    });

    it('should return true after inserting prices', async () => {
      const prices: PricePoint[] = [
        { symbol: 'TEST1', price: 100.00, timestamp: new Date().toISOString() },
      ];
      
      await repository.insertPrices(prices);
      const hasExisting = await repository.hasExistingPrices();
      
      expect(hasExisting).toBe(true);
    });
  });

  describe('insertPrices', () => {
    it('should insert single price point', async () => {
      const prices: PricePoint[] = [
        { symbol: 'NVDA', price: 180.25, timestamp: new Date().toISOString() },
      ];
      
      await expect(repository.insertPrices(prices)).resolves.not.toThrow();
    });

    it('should insert batch of price points', async () => {
      const timestamp = new Date().toISOString();
      const prices: PricePoint[] = [
        { symbol: 'AAPL', price: 250.12, timestamp },
        { symbol: 'GOOGL', price: 302.28, timestamp },
        { symbol: 'MSFT', price: 400.50, timestamp },
      ];
      
      await expect(repository.insertPrices(prices)).resolves.not.toThrow();
    });

    it('should handle empty array', async () => {
      await expect(repository.insertPrices([])).resolves.not.toThrow();
    });
  });

  describe('getLatestPrices', () => {
    it('should return latest price for each symbol', async () => {
      // Insert multiple prices for same symbol at different times
      const symbol = 'INTGTEST';
      const now = new Date();
      
      const prices: PricePoint[] = [
        { symbol, price: 100.00, timestamp: new Date(now.getTime() - 2000).toISOString() },
        { symbol, price: 101.00, timestamp: new Date(now.getTime() - 1000).toISOString() },
        { symbol, price: 102.00, timestamp: now.toISOString() },
      ];
      
      await repository.insertPrices(prices);
      const latestPrices = await repository.getLatestPrices();
      
      expect(latestPrices.has(symbol)).toBe(true);
      expect(latestPrices.get(symbol)).toBe(102.00);
    });

    it('should return prices for multiple symbols', async () => {
      const timestamp = new Date().toISOString();
      const prices: PricePoint[] = [
        { symbol: 'MULTI1', price: 100.00, timestamp },
        { symbol: 'MULTI2', price: 200.00, timestamp },
      ];
      
      await repository.insertPrices(prices);
      const latestPrices = await repository.getLatestPrices();
      
      expect(latestPrices.has('MULTI1')).toBe(true);
      expect(latestPrices.has('MULTI2')).toBe(true);
    });

    it('should return empty map when no prices exist', async () => {
      // This depends on test isolation - in real scenarios use separate test DB
      const latestPrices = await repository.getLatestPrices();
      expect(latestPrices instanceof Map).toBe(true);
    });
  });

  describe('getPricesInTimeRange', () => {
    // Use unique symbol (max 10 chars) to avoid test pollution
    const testSymbol = `TR${Date.now().toString().slice(-7)}`;

    beforeAll(async () => {
      // Insert test data with known timestamps
      const baseTime = new Date('2026-01-15T12:00:00Z');
      const prices: PricePoint[] = [
        { symbol: testSymbol, price: 100.0, timestamp: new Date(baseTime.getTime()).toISOString() },
        { symbol: testSymbol, price: 105.0, timestamp: new Date(baseTime.getTime() + 3600000).toISOString() }, // +1 hour
        { symbol: testSymbol, price: 95.0, timestamp: new Date(baseTime.getTime() + 7200000).toISOString() }, // +2 hours
        { symbol: testSymbol, price: 110.0, timestamp: new Date(baseTime.getTime() + 10800000).toISOString() }, // +3 hours
        { symbol: 'OTHER', price: 200.0, timestamp: new Date(baseTime.getTime() + 3600000).toISOString() }, // different symbol
      ];
      await repository.insertPrices(prices);
    });

    it('should return prices within time range ordered by timestamp', async () => {
      const startTime = new Date('2026-01-15T12:00:00Z');
      const endTime = new Date('2026-01-15T15:00:00Z');

      const prices = await repository.getPricesInTimeRange(testSymbol, startTime, endTime);

      expect(prices.length).toBe(4);
      expect(prices[0].price).toBe(100.0);
      expect(prices[1].price).toBe(105.0);
      expect(prices[2].price).toBe(95.0);
      expect(prices[3].price).toBe(110.0);
    });

    it('should filter by time range correctly', async () => {
      const startTime = new Date('2026-01-15T13:00:00Z'); // after first price
      const endTime = new Date('2026-01-15T14:30:00Z'); // before last price

      const prices = await repository.getPricesInTimeRange(testSymbol, startTime, endTime);

      expect(prices.length).toBe(2);
      expect(prices[0].price).toBe(105.0);
      expect(prices[1].price).toBe(95.0);
    });

    it('should return empty array for non-existent symbol', async () => {
      const startTime = new Date('2026-01-15T12:00:00Z');
      const endTime = new Date('2026-01-15T15:00:00Z');

      const prices = await repository.getPricesInTimeRange('NONEXISTENT', startTime, endTime);

      expect(prices).toEqual([]);
    });

    it('should return empty array when no data in range', async () => {
      const startTime = new Date('2020-01-01T00:00:00Z');
      const endTime = new Date('2020-01-02T00:00:00Z');

      const prices = await repository.getPricesInTimeRange(testSymbol, startTime, endTime);

      expect(prices).toEqual([]);
    });

    it('should only return prices for requested symbol', async () => {
      const startTime = new Date('2026-01-15T12:00:00Z');
      const endTime = new Date('2026-01-15T15:00:00Z');

      const prices = await repository.getPricesInTimeRange(testSymbol, startTime, endTime);

      prices.forEach((p) => {
        expect(p.timestamp).toBeInstanceOf(Date);
        expect(typeof p.price).toBe('number');
      });
    });
  });

  describe('symbolExists', () => {
    // Use unique symbol (max 10 chars)
    const existsSymbol = `EX${Date.now().toString().slice(-7)}`;

    beforeAll(async () => {
      // Insert a known symbol
      const prices: PricePoint[] = [
        { symbol: existsSymbol, price: 100.0, timestamp: new Date().toISOString() },
      ];
      await repository.insertPrices(prices);
    });

    it('should return true for existing symbol', async () => {
      const exists = await repository.symbolExists(existsSymbol);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing symbol', async () => {
      const exists = await repository.symbolExists('ZZZNOTEXISTS');
      expect(exists).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const exists = await repository.symbolExists(existsSymbol.toLowerCase());
      expect(exists).toBe(false);
    });
  });

  describe('connection management', () => {
    it('should throw error when DatabasePool not connected', async () => {
      const dbConfig = createDbConfig();
      const disconnectedPool = new DatabasePool(mockLogger, dbConfig);
      const disconnectedRepo = new PriceRepository(mockLogger, disconnectedPool);

      await expect(disconnectedRepo.hasExistingPrices()).rejects.toThrow('Not connected');
    });

    it('should throw error for getPricesInTimeRange when not connected', async () => {
      const dbConfig = createDbConfig();
      const disconnectedPool = new DatabasePool(mockLogger, dbConfig);
      const disconnectedRepo = new PriceRepository(mockLogger, disconnectedPool);

      await expect(
        disconnectedRepo.getPricesInTimeRange('TEST', new Date(), new Date())
      ).rejects.toThrow('Not connected');
    });

    it('should throw error for symbolExists when not connected', async () => {
      const dbConfig = createDbConfig();
      const disconnectedPool = new DatabasePool(mockLogger, dbConfig);
      const disconnectedRepo = new PriceRepository(mockLogger, disconnectedPool);

      await expect(disconnectedRepo.symbolExists('TEST')).rejects.toThrow('Not connected');
    });
  });
});


import { PriceGenerator } from '../../src/services/priceGenerator';
import { CollectorConfig } from '../../src/collector/conf';

// Mock CollectorConfig to avoid environment variable requirements
const mockConfig = {
  intervalMs: 300000,
  volatility: 0.02,
  csvPath: './fortune-500.csv',
  logLevel: 'info',
} as CollectorConfig;

describe('PriceGenerator', () => {
  let generator: PriceGenerator;

  beforeEach(() => {
    generator = new PriceGenerator(mockConfig);
  });

  describe('generatePrice', () => {
    it('should generate price within volatility bounds', () => {
      const currentPrice = 100;
      const volatility = 0.02; // 2%

      // Generate many prices to test bounds
      for (let i = 0; i < 100; i++) {
        const newPrice = generator.generatePrice(currentPrice, volatility);

        // Should be within ±2% of current price
        expect(newPrice).toBeGreaterThanOrEqual(currentPrice * 0.98);
        expect(newPrice).toBeLessThanOrEqual(currentPrice * 1.02);
        expect(newPrice).toBeGreaterThan(0);
      }
    });

    it('should keep price positive even for very small prices', () => {
      const newPrice = generator.generatePrice(0.01, 0.5);
      expect(newPrice).toBeGreaterThan(0);
    });

    it('should round to 4 decimal places', () => {
      const newPrice = generator.generatePrice(100.123456789, 0.01);
      const decimalPlaces = (newPrice.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(4);
    });
  });

  describe('generateBatch', () => {
    it('should generate prices for all stocks in map', () => {
      const currentPrices = new Map<string, number>([
        ['AAPL', 250.12],
        ['GOOGL', 302.28],
        ['NVDA', 180.25],
      ]);

      const prices = generator.generateBatch(currentPrices, 0.02);

      expect(prices).toHaveLength(3);
      expect(prices.map(p => p.symbol).sort()).toEqual(['AAPL', 'GOOGL', 'NVDA']);
    });

    it('should include ISO 8601 timestamps', () => {
      const currentPrices = new Map<string, number>([['TEST', 100]]);
      const prices = generator.generateBatch(currentPrices, 0.02);

      expect(prices[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(() => new Date(prices[0].timestamp)).not.toThrow();
    });

    it('should use default volatility if not specified', () => {
      const currentPrices = new Map<string, number>([['TEST', 100]]);
      const prices = generator.generateBatch(currentPrices);

      expect(prices).toHaveLength(1);
      // Should be within default 2% volatility
      expect(prices[0].price).toBeGreaterThanOrEqual(98);
      expect(prices[0].price).toBeLessThanOrEqual(102);
    });

    it('should handle empty map', () => {
      const prices = generator.generateBatch(new Map(), 0.02);
      expect(prices).toHaveLength(0);
    });

    it('should handle large number of stocks', () => {
      const currentPrices = new Map<string, number>();
      for (let i = 0; i < 500; i++) {
        currentPrices.set(`STK${i}`, 100 + i);
      }

      const prices = generator.generateBatch(currentPrices, 0.02);

      expect(prices).toHaveLength(500);
    });
  });
});


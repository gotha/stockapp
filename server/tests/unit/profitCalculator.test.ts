import { ProfitCalculatorService } from '../../src/services/profitCalculator';
import { PriceRepository, TimeRangePriceData } from '../../src/repositories/priceRepository';
import { Logger } from '../../src/logger';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

// Mock repository
const mockRepository = {
  getPricesInTimeRange: jest.fn(),
} as unknown as PriceRepository;

describe('ProfitCalculatorService', () => {
  let service: ProfitCalculatorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfitCalculatorService(mockRepository, mockLogger);
  });

  describe('calculateProfit', () => {
    const request = {
      symbol: 'AAPL',
      startTime: new Date('2026-01-01'),
      endTime: new Date('2026-01-31'),
    };

    it('should return no profit when less than 2 price points', async () => {
      (mockRepository.getPricesInTimeRange as jest.Mock).mockResolvedValue([
        { price: 100, timestamp: new Date('2026-01-01T10:00:00Z') },
      ]);

      const result = await service.calculateProfit(request);

      expect(result.profitable).toBe(false);
      expect(result.profit).toBe(0);
      expect(result.buyTime).toBeNull();
      expect(result.sellTime).toBeNull();
      expect(result.dataPoints).toBe(1);
    });

    it('should return no profit when all prices decline', async () => {
      const prices: TimeRangePriceData[] = [
        { price: 150, timestamp: new Date('2026-01-01T10:00:00Z') },
        { price: 140, timestamp: new Date('2026-01-02T10:00:00Z') },
        { price: 130, timestamp: new Date('2026-01-03T10:00:00Z') },
        { price: 120, timestamp: new Date('2026-01-04T10:00:00Z') },
      ];
      (mockRepository.getPricesInTimeRange as jest.Mock).mockResolvedValue(prices);

      const result = await service.calculateProfit(request);

      expect(result.profitable).toBe(false);
      expect(result.profit).toBe(0);
      expect(result.dataPoints).toBe(4);
    });

    it('should calculate maximum profit correctly', async () => {
      const prices: TimeRangePriceData[] = [
        { price: 100, timestamp: new Date('2026-01-01T10:00:00Z') },
        { price: 80, timestamp: new Date('2026-01-02T10:00:00Z') },  // buy here
        { price: 120, timestamp: new Date('2026-01-03T10:00:00Z') }, // sell here
        { price: 90, timestamp: new Date('2026-01-04T10:00:00Z') },
      ];
      (mockRepository.getPricesInTimeRange as jest.Mock).mockResolvedValue(prices);

      const result = await service.calculateProfit(request);

      expect(result.profitable).toBe(true);
      expect(result.profit).toBe(40);
      expect(result.buyPrice).toBe(80);
      expect(result.sellPrice).toBe(120);
      expect(result.profitPercentage).toBe(50); // 40/80 * 100
      expect(result.buyTime).toBe('2026-01-02T10:00:00.000Z');
      expect(result.sellTime).toBe('2026-01-03T10:00:00.000Z');
      expect(result.dataPoints).toBe(4);
    });

    it('should find global maximum, not local', async () => {
      const prices: TimeRangePriceData[] = [
        { price: 50, timestamp: new Date('2026-01-01T10:00:00Z') },  // buy here
        { price: 100, timestamp: new Date('2026-01-02T10:00:00Z') }, // sell here (profit: 50)
        { price: 80, timestamp: new Date('2026-01-03T10:00:00Z') },
        { price: 90, timestamp: new Date('2026-01-04T10:00:00Z') },  // local max but lower profit
      ];
      (mockRepository.getPricesInTimeRange as jest.Mock).mockResolvedValue(prices);

      const result = await service.calculateProfit(request);

      expect(result.profitable).toBe(true);
      expect(result.profit).toBe(50);
      expect(result.buyPrice).toBe(50);
      expect(result.sellPrice).toBe(100);
    });

    it('should return no profit when prices are constant', async () => {
      const prices: TimeRangePriceData[] = [
        { price: 100, timestamp: new Date('2026-01-01T10:00:00Z') },
        { price: 100, timestamp: new Date('2026-01-02T10:00:00Z') },
        { price: 100, timestamp: new Date('2026-01-03T10:00:00Z') },
      ];
      (mockRepository.getPricesInTimeRange as jest.Mock).mockResolvedValue(prices);

      const result = await service.calculateProfit(request);

      expect(result.profitable).toBe(false);
      expect(result.profit).toBe(0);
    });

    it('should return 0 data points when no prices found', async () => {
      (mockRepository.getPricesInTimeRange as jest.Mock).mockResolvedValue([]);

      const result = await service.calculateProfit(request);

      expect(result.profitable).toBe(false);
      expect(result.dataPoints).toBe(0);
    });

    it('should round values to 4 decimal places', async () => {
      const prices: TimeRangePriceData[] = [
        { price: 100.12345, timestamp: new Date('2026-01-01T10:00:00Z') },
        { price: 150.67891, timestamp: new Date('2026-01-02T10:00:00Z') },
      ];
      (mockRepository.getPricesInTimeRange as jest.Mock).mockResolvedValue(prices);

      const result = await service.calculateProfit(request);

      expect(result.buyPrice).toBe(100.1235); // rounded
      expect(result.sellPrice).toBe(150.6789); // rounded
      expect(result.profit).toBe(50.5555); // rounded diff
    });

    it('should always have buyTime before sellTime', async () => {
      const prices: TimeRangePriceData[] = [
        { price: 100, timestamp: new Date('2026-01-01T10:00:00Z') },
        { price: 80, timestamp: new Date('2026-01-02T10:00:00Z') },
        { price: 120, timestamp: new Date('2026-01-03T10:00:00Z') },
      ];
      (mockRepository.getPricesInTimeRange as jest.Mock).mockResolvedValue(prices);

      const result = await service.calculateProfit(request);

      expect(result.profitable).toBe(true);
      expect(result.buyTime).not.toBeNull();
      expect(result.sellTime).not.toBeNull();
      expect(new Date(result.buyTime!).getTime()).toBeLessThan(
        new Date(result.sellTime!).getTime()
      );
    });

    it('should have buyTime before sellTime when best buy is at start', async () => {
      const prices: TimeRangePriceData[] = [
        { price: 50, timestamp: new Date('2026-01-01T10:00:00Z') },  // buy
        { price: 100, timestamp: new Date('2026-01-02T10:00:00Z') },
        { price: 150, timestamp: new Date('2026-01-03T10:00:00Z') }, // sell
      ];
      (mockRepository.getPricesInTimeRange as jest.Mock).mockResolvedValue(prices);

      const result = await service.calculateProfit(request);

      expect(result.buyTime).toBe('2026-01-01T10:00:00.000Z');
      expect(result.sellTime).toBe('2026-01-03T10:00:00.000Z');
      expect(new Date(result.buyTime!).getTime()).toBeLessThan(
        new Date(result.sellTime!).getTime()
      );
    });

    it('should have buyTime before sellTime when best sell is at end', async () => {
      const prices: TimeRangePriceData[] = [
        { price: 100, timestamp: new Date('2026-01-01T10:00:00Z') },
        { price: 50, timestamp: new Date('2026-01-02T10:00:00Z') },  // buy
        { price: 200, timestamp: new Date('2026-01-03T10:00:00Z') }, // sell
      ];
      (mockRepository.getPricesInTimeRange as jest.Mock).mockResolvedValue(prices);

      const result = await service.calculateProfit(request);

      expect(result.buyTime).toBe('2026-01-02T10:00:00.000Z');
      expect(result.sellTime).toBe('2026-01-03T10:00:00.000Z');
      expect(new Date(result.buyTime!).getTime()).toBeLessThan(
        new Date(result.sellTime!).getTime()
      );
    });

    it('should have buyTime before sellTime with volatile prices', async () => {
      // Prices that go up and down multiple times
      const prices: TimeRangePriceData[] = [
        { price: 100, timestamp: new Date('2026-01-01T10:00:00Z') },
        { price: 150, timestamp: new Date('2026-01-02T10:00:00Z') },
        { price: 50, timestamp: new Date('2026-01-03T10:00:00Z') },  // buy
        { price: 200, timestamp: new Date('2026-01-04T10:00:00Z') }, // sell (profit: 150)
        { price: 75, timestamp: new Date('2026-01-05T10:00:00Z') },
        { price: 125, timestamp: new Date('2026-01-06T10:00:00Z') },
      ];
      (mockRepository.getPricesInTimeRange as jest.Mock).mockResolvedValue(prices);

      const result = await service.calculateProfit(request);

      expect(result.profit).toBe(150);
      expect(result.buyTime).toBe('2026-01-03T10:00:00.000Z');
      expect(result.sellTime).toBe('2026-01-04T10:00:00.000Z');
      expect(new Date(result.buyTime!).getTime()).toBeLessThan(
        new Date(result.sellTime!).getTime()
      );
    });
  });
});


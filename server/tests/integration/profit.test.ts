import 'reflect-metadata';
import request from 'supertest';
import { container } from 'tsyringe';
import { app } from '../../src/http/server';
import { PriceRepository } from '../../src/repositories/priceRepository';
import { Logger } from '../../src/logger';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn(() => mockLogger),
} as unknown as Logger;

// Mock repository
const mockRepository = {
  getPricesInTimeRange: jest.fn(),
  symbolExists: jest.fn(),
};

// Setup container mocks
beforeAll(() => {
  container.register('Logger', { useValue: mockLogger });
  container.register(PriceRepository, { useValue: mockRepository as unknown as PriceRepository });
});

describe('GET /api/profit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validation errors', () => {
    it('should return 400 when symbol is missing', async () => {
      const res = await request(app).get('/api/profit?start=2026-01-01&end=2026-01-31');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_SYMBOL');
    });

    it('should return 400 when symbol format is invalid', async () => {
      const res = await request(app).get(
        '/api/profit?symbol=INVALID@&start=2026-01-01T00:00:00Z&end=2026-01-31T23:59:59Z'
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_SYMBOL');
    });

    it('should return 400 when dates are missing', async () => {
      const res = await request(app).get('/api/profit?symbol=AAPL');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DATE_FORMAT');
    });

    it('should return 400 when end is before start', async () => {
      mockRepository.symbolExists.mockResolvedValue(true);

      const res = await request(app).get(
        '/api/profit?symbol=AAPL&start=2026-01-31T00:00:00Z&end=2026-01-01T00:00:00Z'
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
    });

    it('should return 400 when date format is invalid', async () => {
      const res = await request(app).get(
        '/api/profit?symbol=AAPL&start=not-a-date&end=2026-01-31T00:00:00Z'
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DATE_FORMAT');
    });
  });

  describe('not found errors', () => {
    it('should return 404 when symbol does not exist', async () => {
      mockRepository.symbolExists.mockResolvedValue(false);

      const res = await request(app).get(
        '/api/profit?symbol=UNKNOWN&start=2026-01-01T00:00:00Z&end=2026-01-31T23:59:59Z'
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SYMBOL_NOT_FOUND');
    });

    it('should return 404 when no data in range', async () => {
      mockRepository.symbolExists.mockResolvedValue(true);
      mockRepository.getPricesInTimeRange.mockResolvedValue([]);

      const res = await request(app).get(
        '/api/profit?symbol=AAPL&start=2020-01-01T00:00:00Z&end=2020-01-31T23:59:59Z'
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NO_DATA_IN_RANGE');
    });
  });

  describe('successful responses', () => {
    it('should return profitable result', async () => {
      mockRepository.symbolExists.mockResolvedValue(true);
      mockRepository.getPricesInTimeRange.mockResolvedValue([
        { price: 100, timestamp: new Date('2026-01-01T10:00:00Z') },
        { price: 150, timestamp: new Date('2026-01-02T10:00:00Z') },
      ]);

      const res = await request(app).get(
        '/api/profit?symbol=AAPL&start=2026-01-01T00:00:00Z&end=2026-01-31T23:59:59Z'
      );

      expect(res.status).toBe(200);
      expect(res.body.symbol).toBe('AAPL');
      expect(res.body.profitable).toBe(true);
      expect(res.body.profit).toBe(50);
      expect(res.body.buyPrice).toBe(100);
      expect(res.body.sellPrice).toBe(150);
    });

    it('should return no-profit result when prices decline', async () => {
      mockRepository.symbolExists.mockResolvedValue(true);
      mockRepository.getPricesInTimeRange.mockResolvedValue([
        { price: 150, timestamp: new Date('2026-01-01T10:00:00Z') },
        { price: 100, timestamp: new Date('2026-01-02T10:00:00Z') },
      ]);

      const res = await request(app).get(
        '/api/profit?symbol=AAPL&start=2026-01-01T00:00:00Z&end=2026-01-31T23:59:59Z'
      );

      expect(res.status).toBe(200);
      expect(res.body.profitable).toBe(false);
      expect(res.body.profit).toBe(0);
      expect(res.body.buyTime).toBeNull();
    });
  });
});


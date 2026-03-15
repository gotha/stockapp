import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { AppError } from '../middleware/errorHandler';
import { ProfitCalculatorService } from '../../services/profitCalculator';
import { PriceRepository } from '../../repositories/priceRepository';

/**
 * Controller for profit calculation endpoints.
 * Handles request validation and response formatting.
 */
@injectable()
export class ProfitsController {
  constructor(
    @inject(PriceRepository) private priceRepository: PriceRepository,
    @inject(ProfitCalculatorService) private profitCalculator: ProfitCalculatorService
  ) {}

  /**
   * GET /api/profit
   * Calculate optimal buy/sell times for maximum profit.
   */
  async calculateProfit(req: Request, res: Response): Promise<void> {
    const { symbol, start, end } = req.query;

    // Validate required parameters
    if (!symbol) {
      throw new AppError('INVALID_SYMBOL', 'Symbol is required', 400);
    }
    if (!start || !end) {
      throw new AppError(
        'INVALID_DATE_FORMAT',
        'Both start and end parameters are required',
        400
      );
    }

    // Validate symbol format
    this.validateSymbol(symbol as string);

    // Parse and validate dates
    const startTime = this.parseDate(start as string, 'start');
    const endTime = this.parseDate(end as string, 'end');

    // Validate date range
    if (endTime <= startTime) {
      throw new AppError(
        'INVALID_DATE_RANGE',
        'End time must be after start time',
        400,
        { start: start as string, end: end as string }
      );
    }

    // Check if symbol exists in database
    const symbolExists = await this.priceRepository.symbolExists(symbol as string);
    if (!symbolExists) {
      throw new AppError(
        'SYMBOL_NOT_FOUND',
        'No price data found for symbol',
        404,
        { symbol }
      );
    }

    // Calculate profit
    const result = await this.profitCalculator.calculateProfit({
      symbol: symbol as string,
      startTime,
      endTime,
    });

    // Check if any data was found in the range
    if (result.dataPoints === 0) {
      throw new AppError(
        'NO_DATA_IN_RANGE',
        'No price data found in the specified time range',
        404,
        { symbol, start: start as string, end: end as string }
      );
    }

    res.json(result);
  }

  /**
   * Validate stock symbol format (alphanumeric + dots, max 10 chars)
   */
  private validateSymbol(symbol: string): void {
    if (!symbol || typeof symbol !== 'string') {
      throw new AppError('INVALID_SYMBOL', 'Symbol is required', 400, { symbol });
    }

    if (symbol.length > 10) {
      throw new AppError(
        'INVALID_SYMBOL',
        'Symbol must be at most 10 characters',
        400,
        { symbol }
      );
    }

    const validSymbolPattern = /^[A-Za-z0-9.]+$/;
    if (!validSymbolPattern.test(symbol)) {
      throw new AppError(
        'INVALID_SYMBOL',
        'Symbol must be alphanumeric (dots allowed), max 10 characters',
        400,
        { symbol }
      );
    }
  }

  /**
   * Parse and validate ISO 8601 date string
   */
  private parseDate(value: string, fieldName: string): Date {
    if (!value || typeof value !== 'string') {
      throw new AppError(
        'INVALID_DATE_FORMAT',
        `${fieldName} is required`,
        400,
        { field: fieldName }
      );
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new AppError(
        'INVALID_DATE_FORMAT',
        'Dates must be in ISO 8601 format',
        400,
        { field: fieldName, value }
      );
    }

    return date;
  }
}


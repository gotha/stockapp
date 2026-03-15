import { inject, injectable } from 'tsyringe';
import { PriceRepository, TimeRangePriceData } from '../repositories/priceRepository';
import { Logger } from '../logger';

/**
 * Request parameters for profit calculation
 */
export interface ProfitCalculationRequest {
  symbol: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Result of profit calculation.
 * Defaults to a "no profit" state with null buy/sell values.
 */
export class ProfitResult {
  constructor(
    readonly symbol: string,
    readonly dataPoints: number,
    readonly profitable: boolean = false,
    readonly profit: number = 0,
    readonly profitPercentage: number = 0,
    readonly buyTime: string | null = null,
    readonly sellTime: string | null = null,
    readonly buyPrice: number | null = null,
    readonly sellPrice: number | null = null
  ) {}
}

/**
 * Service for calculating optimal buy/sell times to maximize profit.
 */
@injectable()
export class ProfitCalculatorService {
  constructor(
    @inject(PriceRepository) private priceRepository: PriceRepository,
    @inject('Logger') private logger: Logger
  ) {}

  /**
   * Calculate the optimal buy and sell times for maximum profit.
   */
  async calculateProfit(request: ProfitCalculationRequest): Promise<ProfitResult> {
    const { symbol, startTime, endTime } = request;

    // Fetch price data ordered by timestamp
    const prices = await this.priceRepository.getPricesInTimeRange(symbol, startTime, endTime);

    this.logger.debug(
      { symbol, startTime, endTime, dataPoints: prices.length },
      'Calculating profit'
    );

    // Handle edge cases - return no-profit result
    if (prices.length < 2) {
      return new ProfitResult(symbol, prices.length);
    }

    const result = this.findMaxProfit(prices);

    // No profitable trade found - return no-profit result
    if (result.maxProfit <= 0) {
      return new ProfitResult(symbol, prices.length);
    }

    const profitPercentage = (result.maxProfit / result.buyPrice) * 100;

    return new ProfitResult(
      symbol,
      prices.length,
      true,
      Math.round(result.maxProfit * 10000) / 10000,
      Math.round(profitPercentage * 100) / 100,
      result.buyTime.toISOString(),
      result.sellTime.toISOString(),
      Math.round(result.buyPrice * 10000) / 10000,
      Math.round(result.sellPrice * 10000) / 10000
    );
  }

  /**
   * Find maximum profit using single-pass algorithm.
   * Tracks minimum price seen so far and calculates potential profit at each point.
   */
  private findMaxProfit(prices: TimeRangePriceData[]): {
    maxProfit: number;
    buyPrice: number;
    sellPrice: number;
    buyTime: Date;
    sellTime: Date;
  } {
    let minPrice = prices[0].price;
    let minPriceTime = prices[0].timestamp;
    let maxProfit = 0;
    let buyPrice = 0;
    let sellPrice = 0;
    let buyTime = prices[0].timestamp;
    let sellTime = prices[0].timestamp;

    for (let i = 1; i < prices.length; i++) {
      const currentPrice = prices[i].price;
      const currentTime = prices[i].timestamp;

      // Check if selling at current price gives better profit
      const potentialProfit = currentPrice - minPrice;
      if (potentialProfit > maxProfit) {
        maxProfit = potentialProfit;
        buyPrice = minPrice;
        sellPrice = currentPrice;
        buyTime = minPriceTime;
        sellTime = currentTime;
      }

      // Update minimum price if current is lower
      if (currentPrice < minPrice) {
        minPrice = currentPrice;
        minPriceTime = currentTime;
      }
    }

    return { maxProfit, buyPrice, sellPrice, buyTime, sellTime };
  }
}


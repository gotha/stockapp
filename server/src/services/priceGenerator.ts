import { injectable } from 'tsyringe';
import { CollectorConfig } from '../collector/conf';

/**
 * A stock price at a specific point in time
 */
export interface PricePoint {
  /** Stock ticker symbol */
  symbol: string;
  /** Price in USD */
  price: number;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Price Generator using Random-Walk Algorithm
 *
 * Implements Geometric Brownian Motion (simplified) for realistic stock price simulation.
 * Each price change is a percentage of the previous price, creating continuity.
 *
 * Formula: newPrice = currentPrice * (1 + randomFactor * volatility)
 * Where randomFactor is in range [-1, 1]
 */
@injectable()
export class PriceGenerator {
  private readonly defaultVolatility: number;

  constructor(config: CollectorConfig) {
    this.defaultVolatility = config.volatility;
  }

  /**
   * Generate new price based on current price and volatility
   *
   * @param currentPrice - The current price to base the new price on
   * @param volatility - The volatility as a decimal (e.g., 0.02 = 2%)
   * @returns The new price after applying random-walk fluctuation
   */
  generatePrice(currentPrice: number, volatility: number): number {
    // Random factor in range [-1, 1]
    const randomFactor = (Math.random() - 0.5) * 2;

    // Calculate change as percentage of current price
    const change = randomFactor * volatility;

    // Apply change to current price
    let newPrice = currentPrice * (1 + change);

    // Ensure price stays positive (minimum $0.01)
    newPrice = Math.max(0.01, newPrice);

    // Round to 4 decimal places (standard for stock prices)
    return Math.round(newPrice * 10000) / 10000;
  }

  /**
   * Generate prices for all stocks given their current prices
   *
   * @param currentPrices - Map of symbol -> current price
   * @param volatility - The volatility to apply (default: constructor value)
   * @returns Array of new PricePoints with ISO 8601 timestamps
   */
  generateBatch(
    currentPrices: Map<string, number>,
    volatility?: number
  ): PricePoint[] {
    const vol = volatility ?? this.defaultVolatility;
    const timestamp = new Date().toISOString();
    const prices: PricePoint[] = [];

    for (const [symbol, currentPrice] of currentPrices) {
      const newPrice = this.generatePrice(currentPrice, vol);
      prices.push({
        symbol,
        price: newPrice,
        timestamp,
      });
    }

    return prices;
  }
}


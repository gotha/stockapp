import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { inject, injectable } from 'tsyringe';
import { Logger } from '../logger';

/**
 * Stock entity loaded from CSV
 */
interface Stock {
  /** Unique stock ticker symbol (e.g., "NVDA") */
  symbol: string;
  /** Full company name */
  companyName: string;
  /** Market capitalization as string (e.g., "4.38T") */
  marketCap: string;
  /** Initial price from CSV */
  initialPrice: number;
}

/**
 * CSV Parser for Fortune 500 stock data
 *
 * Expected CSV format:
 * Symbol,Company Name,Market Cap,Stock Price
 * NVDA,NVIDIA Corporation,4.38T,180.25
 */
@injectable()
export class CsvParser {
  constructor(@inject('Logger') private logger: Logger) {}

  /**
   * Parse CSV file and return array of validated stocks
   */
  async parse(filePath: string): Promise<Stock[]> {
    const stocks: Stock[] = [];
    let rowNumber = 0;
    let skippedRows = 0;

    return new Promise((resolve, reject) => {
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
      });

      parser.on('readable', () => {
        let record: Record<string, string>;
        while ((record = parser.read()) !== null) {
          rowNumber++;
          const stock = this.parseRow(record, rowNumber);
          if (stock) {
            stocks.push(stock);
          } else {
            skippedRows++;
          }
        }
      });

      parser.on('error', (err) => {
        this.logger.error({ err, filePath }, 'CSV parse error');
        reject(err);
      });

      parser.on('end', () => {
        if (skippedRows > 0) {
          this.logger.warn({ skippedRows, totalRows: rowNumber }, 'Skipped invalid rows in CSV');
        }
        this.logger.info({ validStocks: stocks.length, totalRows: rowNumber }, 'CSV parsing complete');
        resolve(stocks);
      });

      const stream = createReadStream(filePath);
      stream.on('error', (err) => {
        this.logger.error({ err, filePath }, 'Failed to read CSV file');
        reject(err);
      });
      stream.pipe(parser);
    });
  }

  private parseRow(record: Record<string, string>, rowNumber: number): Stock | null {
    const symbol = record['Symbol'] || record['symbol'] || '';
    const companyName = record['Company Name'] || record['company_name'] || '';
    const marketCap = record['Market Cap'] || record['market_cap'] || '';
    const priceStr = record['Stock Price'] || record['stock_price'] || record['Price'] || '';

    if (!symbol || !this.isValidSymbol(symbol)) {
      this.logger.debug({ rowNumber, symbol }, 'Invalid or missing symbol');
      return null;
    }

    if (!companyName) {
      this.logger.debug({ rowNumber, symbol }, 'Missing company name');
      return null;
    }

    const initialPrice = parseFloat(priceStr);
    if (isNaN(initialPrice) || initialPrice <= 0) {
      this.logger.debug({ rowNumber, symbol, priceStr }, 'Invalid price');
      return null;
    }

    return {
      symbol: symbol.toUpperCase(),
      companyName,
      marketCap,
      initialPrice,
    };
  }

  private isValidSymbol(symbol: string): boolean {
    const symbolRegex = /^[A-Za-z][A-Za-z0-9.]{0,9}$/;
    return symbolRegex.test(symbol);
  }
}


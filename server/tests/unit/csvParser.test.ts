import { CsvParser } from '../../src/collector/csvParser';
import { Logger } from '../../src/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

describe('CsvParser', () => {
  let parser: CsvParser;
  let tempDir: string;

  beforeEach(() => {
    parser = new CsvParser(mockLogger);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csvparser-test-'));
  });

  afterEach(() => {
    // Clean up temp files
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const createTempCsv = (content: string): string => {
    const filePath = path.join(tempDir, 'test.csv');
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  describe('parse', () => {
    it('should parse valid CSV with all required columns', async () => {
      const csv = `Symbol,Company Name,Market Cap,Stock Price
NVDA,NVIDIA Corporation,4.38T,180.25
AAPL,Apple Inc.,3.67T,250.12`;
      
      const filePath = createTempCsv(csv);
      const stocks = await parser.parse(filePath);

      expect(stocks).toHaveLength(2);
      expect(stocks[0]).toEqual({
        symbol: 'NVDA',
        companyName: 'NVIDIA Corporation',
        marketCap: '4.38T',
        initialPrice: 180.25,
      });
      expect(stocks[1]).toEqual({
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        marketCap: '3.67T',
        initialPrice: 250.12,
      });
    });

    it('should skip malformed rows and continue processing', async () => {
      const csv = `Symbol,Company Name,Market Cap,Stock Price
NVDA,NVIDIA Corporation,4.38T,180.25
,Missing Symbol,1.0T,100.00
AAPL,Apple Inc.,3.67T,invalid_price
GOOGL,Alphabet Inc.,3.66T,302.28`;
      
      const filePath = createTempCsv(csv);
      const stocks = await parser.parse(filePath);

      // Should only have NVDA and GOOGL (skipped invalid rows)
      expect(stocks).toHaveLength(2);
      expect(stocks[0].symbol).toBe('NVDA');
      expect(stocks[1].symbol).toBe('GOOGL');
    });

    it('should handle empty file', async () => {
      const csv = '';
      const filePath = createTempCsv(csv);
      
      const stocks = await parser.parse(filePath);
      expect(stocks).toHaveLength(0);
    });

    it('should handle file with only headers', async () => {
      const csv = 'Symbol,Company Name,Market Cap,Stock Price';
      const filePath = createTempCsv(csv);
      
      const stocks = await parser.parse(filePath);
      expect(stocks).toHaveLength(0);
    });

    it('should throw error for non-existent file', async () => {
      await expect(parser.parse('/non/existent/file.csv')).rejects.toThrow();
    });

    it('should handle quoted fields with commas', async () => {
      const csv = `Symbol,Company Name,Market Cap,Stock Price
BRK.A,"Berkshire Hathaway Inc., Class A",500B,450000.00`;
      
      const filePath = createTempCsv(csv);
      const stocks = await parser.parse(filePath);

      expect(stocks).toHaveLength(1);
      expect(stocks[0].companyName).toBe('Berkshire Hathaway Inc., Class A');
    });

    it('should validate symbol format (alphanumeric, dots allowed)', async () => {
      const csv = `Symbol,Company Name,Market Cap,Stock Price
BRK.A,Berkshire,500B,450000.00
123INVALID,Invalid Symbol,1B,100.00`;
      
      const filePath = createTempCsv(csv);
      const stocks = await parser.parse(filePath);

      expect(stocks).toHaveLength(1);
      expect(stocks[0].symbol).toBe('BRK.A');
    });

    it('should handle large numbers of stocks', async () => {
      let csv = 'Symbol,Company Name,Market Cap,Stock Price\n';
      for (let i = 0; i < 500; i++) {
        csv += `STK${i},Company ${i},${i}B,${100 + i}.00\n`;
      }
      
      const filePath = createTempCsv(csv);
      const stocks = await parser.parse(filePath);

      expect(stocks).toHaveLength(500);
    });
  });
});


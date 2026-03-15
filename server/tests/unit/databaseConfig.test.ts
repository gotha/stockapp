import { DatabaseConfig } from '../../src/database/conf';

describe('DatabaseConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should accept valid postgresql:// connection string', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/mydb';

    const config = new DatabaseConfig();

    expect(config.connectionString).toBe('postgresql://user:pass@localhost:5432/mydb');
  });

  it('should accept valid postgres:// connection string', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/mydb';

    const config = new DatabaseConfig();

    expect(config.connectionString).toBe('postgres://user:pass@localhost:5432/mydb');
  });

  it('should accept connection string without port', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost/mydb';

    const config = new DatabaseConfig();

    expect(config.connectionString).toBe('postgresql://user:pass@localhost/mydb');
  });

  it('should throw when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;

    expect(() => new DatabaseConfig()).toThrow('DATABASE_URL environment variable is required');
  });

  it('should throw for invalid URL format', () => {
    process.env.DATABASE_URL = 'not-a-valid-url';

    expect(() => new DatabaseConfig()).toThrow('Invalid DATABASE_URL format');
  });

  it('should throw for non-postgres protocol', () => {
    process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/mydb';

    expect(() => new DatabaseConfig()).toThrow('Invalid DATABASE_URL protocol');
  });

  it('should throw when hostname is missing', () => {
    process.env.DATABASE_URL = 'postgresql:///mydb';

    expect(() => new DatabaseConfig()).toThrow('missing hostname');
  });

  it('should throw when database name is missing', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432';

    expect(() => new DatabaseConfig()).toThrow('missing database name');
  });

  it('should throw when database name is just a slash', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/';

    expect(() => new DatabaseConfig()).toThrow('missing database name');
  });
});


import { injectable } from 'tsyringe';

/**
 * Validates a PostgreSQL connection string.
 * Expected format: postgresql://user:password@host:port/database
 */
function validateConnectionString(url: string): void {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      'Invalid DATABASE_URL format. Expected: postgresql://user:password@host:port/database'
    );
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(
      `Invalid DATABASE_URL protocol: ${parsed.protocol}. Expected: postgresql:// or postgres://`
    );
  }

  if (!parsed.hostname) {
    throw new Error('DATABASE_URL is missing hostname');
  }

  if (!parsed.pathname || parsed.pathname === '/') {
    throw new Error('DATABASE_URL is missing database name');
  }
}

@injectable()
export class DatabaseConfig {
  /** PostgreSQL connection string */
  readonly connectionString: string;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    validateConnectionString(databaseUrl);

    this.connectionString = databaseUrl;
  }
}

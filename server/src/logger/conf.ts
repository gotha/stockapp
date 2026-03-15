import { injectable } from 'tsyringe';

/**
 * Logger configuration.
 * Loads from environment variables on construction.
 */
@injectable()
export class LoggerConfig {
  readonly level: string;
  readonly prettyPrint: boolean;

  constructor() {
    this.level = process.env.LOG_LEVEL || 'info';
    this.prettyPrint = process.env.NODE_ENV === 'development';
  }
}


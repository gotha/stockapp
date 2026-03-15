import pino, { Logger } from 'pino';
import { container, injectable, singleton } from 'tsyringe';
import { LoggerConfig } from './conf';

/**
 * Factory that produces a configured pino logger singleton.
 */
@singleton()
@injectable()
class LoggerFactory {
  private readonly logger: Logger;

  constructor(config: LoggerConfig) {
    this.logger = pino({
      level: config.level,
      transport: config.prettyPrint
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    });
  }

  getLogger(): Logger {
    return this.logger;
  }
}

// Register the logger instance in the container
container.register<Logger>('Logger', {
  useFactory: (c) => c.resolve(LoggerFactory).getLogger(),
});

// Export type for injection
export type { Logger };


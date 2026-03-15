import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { container } from 'tsyringe';
import { Logger } from '../../logger';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const logger = container.resolve<Logger>('Logger');
  const requestId = randomUUID();
  req.requestId = requestId;

  const start = Date.now();

  logger.info({
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
  }, 'Request started');

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
    }, 'Request completed');
  });

  next();
}


import 'express-async-errors';
import express, { type Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { container } from 'tsyringe';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { ProfitsController } from './controllers/profitsController';
import { openApiSpec } from '../openapi';

export const app: Express = express();

// Middleware
app.use(express.json());
app.use(requestLogger);

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.get('/openapi.json', (_req, res) => res.json(openApiSpec));

// Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/profit', async (req, res) => {
  const controller = container.resolve(ProfitsController);
  await controller.calculateProfit(req, res);
});

// Error handling
app.use(errorHandler);

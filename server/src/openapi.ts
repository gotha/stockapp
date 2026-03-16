export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'StockApp API',
    version: '1.0.0',
    description: 'API for calculating optimal stock buy/sell points',
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/profit': {
      get: {
        summary: 'Calculate optimal buy/sell points for maximum profit',
        description:
          'Given a stock symbol and time range, calculates the optimal buy and sell timestamps that would maximize profit.',
        parameters: [
          {
            name: 'symbol',
            in: 'query',
            required: true,
            schema: { type: 'string', maxLength: 10, pattern: '^[A-Za-z0-9.]+$' },
            description: 'Stock symbol (e.g., "AAPL", "NVDA")',
            example: 'AAPL',
          },
          {
            name: 'start',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time' },
            description: 'Start of time range (ISO 8601)',
            example: '2026-01-01T00:00:00Z',
          },
          {
            name: 'end',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time' },
            description: 'End of time range (ISO 8601)',
            example: '2026-01-31T23:59:59Z',
          },
        ],
        responses: {
          '200': {
            description: 'Profit calculation result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProfitResult' },
              },
            },
          },
          '400': {
            description: 'Invalid request (bad symbol format, invalid dates, or date range)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  invalidSymbol: {
                    summary: 'Invalid symbol format',
                    value: {
                      error: {
                        code: 'INVALID_SYMBOL',
                        message: 'Symbol must be alphanumeric (dots allowed), max 10 characters',
                        details: { symbol: 'INVALID@#$' },
                      },
                    },
                  },
                  invalidDateRange: {
                    summary: 'Invalid date range',
                    value: {
                      error: {
                        code: 'INVALID_DATE_RANGE',
                        message: 'End time must be after start time',
                        details: { start: '2026-01-31', end: '2026-01-01' },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Symbol not found or no data in range',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  symbolNotFound: {
                    summary: 'Symbol not found',
                    value: {
                      error: {
                        code: 'SYMBOL_NOT_FOUND',
                        message: 'No price data found for symbol',
                        details: { symbol: 'UNKNOWN' },
                      },
                    },
                  },
                  noDataInRange: {
                    summary: 'No data in range',
                    value: {
                      error: {
                        code: 'NO_DATA_IN_RANGE',
                        message: 'No price data found in the specified time range',
                        details: {
                          symbol: 'AAPL',
                          start: '2020-01-01T00:00:00Z',
                          end: '2020-01-31T23:59:59Z',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ProfitResult: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Stock symbol queried', example: 'AAPL' },
          profitable: {
            type: 'boolean',
            description: 'Whether a profitable trade exists',
            example: true,
          },
          profit: { type: 'number', description: 'Maximum profit amount', example: 15.5 },
          profitPercentage: {
            type: 'number',
            description: 'Profit as percentage of buy price',
            example: 10.33,
          },
          buyTime: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Optimal buy timestamp (null if not profitable)',
            example: '2026-01-05T14:30:00.000Z',
          },
          sellTime: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Optimal sell timestamp (null if not profitable)',
            example: '2026-01-20T10:15:00.000Z',
          },
          buyPrice: {
            type: 'number',
            nullable: true,
            description: 'Price at buy time (null if not profitable)',
            example: 150.0,
          },
          sellPrice: {
            type: 'number',
            nullable: true,
            description: 'Price at sell time (null if not profitable)',
            example: 165.5,
          },
          dataPoints: {
            type: 'integer',
            description: 'Number of price points analyzed',
            example: 1250,
          },
        },
        required: ['symbol', 'profitable', 'profit', 'profitPercentage', 'dataPoints'],
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' },
            },
          },
        },
      },
    },
  },
};


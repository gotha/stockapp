// Types co-located with API client per constitution

export interface StockQuery {
  symbol: string;
  startDate: Date;
  endDate: Date;
}

export interface ProfitResult {
  symbol: string;
  profitable: boolean;
  profit: number;
  profitPercentage: number;
  buyTime: string | null;
  sellTime: string | null;
  buyPrice: number | null;
  sellPrice: number | null;
  dataPoints: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type QueryState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: ProfitResult }
  | { status: 'error'; error: string };

// Formatting utilities

export function formatDateTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoString));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

// API client

export async function fetchProfit(query: StockQuery): Promise<ProfitResult> {
  const params = new URLSearchParams({
    symbol: query.symbol,
    start: query.startDate.toISOString(),
    end: query.endDate.toISOString(),
  });

  const response = await fetch(`/api/profit?${params}`);

  if (!response.ok) {
    // Try to parse structured error
    try {
      const errorData: ApiError = await response.json();
      throw new Error(errorData.error.message);
    } catch (e) {
      // If parsing fails, use status text
      if (e instanceof Error && e.message !== response.statusText) {
        throw e;
      }
      throw new Error(`Request failed: ${response.statusText}`);
    }
  }

  return response.json();
}


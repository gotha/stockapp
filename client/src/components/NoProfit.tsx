import type { ProfitResult } from '../api/profitApi';

interface NoProfitProps {
  result: ProfitResult;
}

export function NoProfit({ result }: NoProfitProps) {
  return (
    <div className="no-profit">
      <h3>{result.symbol}</h3>
      <p>No profitable trade found in the selected time range.</p>
      <p>
        <small>Analyzed {result.dataPoints} data points</small>
      </p>
    </div>
  );
}


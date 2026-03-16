import type { ProfitResult as ProfitResultType } from '../api/profitApi';
import { formatDateTime, formatPrice, formatPercentage } from '../api/profitApi';

interface ProfitResultProps {
  result: ProfitResultType;
}

export function ProfitResult({ result }: ProfitResultProps) {
  return (
    <div className="result">
      <h2>
        {result.symbol} - <span className="profit-positive">Profitable!</span>
      </h2>

      <div className="result-row">
        <span className="result-label">Profit</span>
        <span className="result-value profit-positive">
          {formatPrice(result.profit)} ({formatPercentage(result.profitPercentage)})
        </span>
      </div>

      <div className="result-row">
        <span className="result-label">Buy Time</span>
        <span className="result-value">
          {result.buyTime ? formatDateTime(result.buyTime) : '-'}
        </span>
      </div>

      <div className="result-row">
        <span className="result-label">Buy Price</span>
        <span className="result-value">
          {result.buyPrice !== null ? formatPrice(result.buyPrice) : '-'}
        </span>
      </div>

      <div className="result-row">
        <span className="result-label">Sell Time</span>
        <span className="result-value">
          {result.sellTime ? formatDateTime(result.sellTime) : '-'}
        </span>
      </div>

      <div className="result-row">
        <span className="result-label">Sell Price</span>
        <span className="result-value">
          {result.sellPrice !== null ? formatPrice(result.sellPrice) : '-'}
        </span>
      </div>

      <div className="result-row">
        <span className="result-label">Data Points Analyzed</span>
        <span className="result-value">{result.dataPoints}</span>
      </div>
    </div>
  );
}


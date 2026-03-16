import { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import type { StockQuery } from '../api/profitApi';

interface StockQueryFormProps {
  onSubmit: (query: StockQuery) => void;
  isLoading: boolean;
}

export function StockQueryForm({ onSubmit, isLoading }: StockQueryFormProps) {
  // Default date range: last 24 hours
  const [symbol, setSymbol] = useState('');
  const [startDate, setStartDate] = useState<Date>(
    new Date(Date.now() - 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Validation state
  const [symbolError, setSymbolError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate symbol
    if (!symbol.trim()) {
      setSymbolError('Stock symbol is required');
      isValid = false;
    } else {
      setSymbolError(null);
    }

    // Validate date range
    if (endDate <= startDate) {
      setDateError('End date must be after start date');
      isValid = false;
    } else {
      setDateError(null);
    }

    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      symbol: symbol.trim().toUpperCase(),
      startDate,
      endDate,
    });
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="symbol">Stock Symbol</label>
        <input
          type="text"
          id="symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="e.g., AAPL, NVDA, MSFT"
          disabled={isLoading}
        />
        {symbolError && <div className="validation-error">{symbolError}</div>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="startDate">Start Date</label>
          <DatePicker
            id="startDate"
            selected={startDate}
            onChange={(date: Date | null) => date && setStartDate(date)}
            showTimeSelect
            timeFormat="HH:mm:ss"
            timeIntervals={1}
            dateFormat="MMM d, yyyy HH:mm:ss"
            maxDate={endDate}
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="endDate">End Date</label>
          <DatePicker
            id="endDate"
            selected={endDate}
            onChange={(date: Date | null) => date && setEndDate(date)}
            showTimeSelect
            timeFormat="HH:mm:ss"
            timeIntervals={1}
            dateFormat="MMM d, yyyy HH:mm:ss"
            minDate={startDate}
            disabled={isLoading}
          />
        </div>
      </div>

      {dateError && <div className="validation-error">{dateError}</div>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Calculating...' : 'Calculate Profit'}
      </button>
    </form>
  );
}


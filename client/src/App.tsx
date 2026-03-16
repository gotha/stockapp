import { useState } from 'react';
import './App.css';
import { StockQueryForm } from './components/StockQueryForm';
import { ProfitResult } from './components/ProfitResult';
import { NoProfit } from './components/NoProfit';
import { ErrorMessage } from './components/ErrorMessage';
import { Loading } from './components/Loading';
import { fetchProfit, type StockQuery, type QueryState } from './api/profitApi';

function App() {
  const [queryState, setQueryState] = useState<QueryState>({ status: 'idle' });

  const handleSubmit = async (query: StockQuery) => {
    setQueryState({ status: 'loading' });

    try {
      const result = await fetchProfit(query);
      setQueryState({ status: 'success', data: result });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      setQueryState({ status: 'error', error: message });
    }
  };

  return (
    <div className="app">
      <h1>StockApp</h1>

      <StockQueryForm
        onSubmit={handleSubmit}
        isLoading={queryState.status === 'loading'}
      />

      {queryState.status === 'loading' && <Loading />}

      {queryState.status === 'error' && (
        <ErrorMessage message={queryState.error} />
      )}

      {queryState.status === 'success' &&
        (queryState.data.profitable ? (
          <ProfitResult result={queryState.data} />
        ) : (
          <NoProfit result={queryState.data} />
        ))}
    </div>
  );
}

export default App;


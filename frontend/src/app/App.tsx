import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from './providers';
import { AppRouter } from './router';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
      </Providers>
    </BrowserRouter>
  );
}

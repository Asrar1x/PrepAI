import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './queryClient';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1F1F1E',
            color: '#F9FAFB',
            border: '1px solid #374151',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#1F1F1E',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#1F1F1E',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
};

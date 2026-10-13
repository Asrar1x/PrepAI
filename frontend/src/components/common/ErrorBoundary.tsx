import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from '../icons';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#171716] border border-gray-800 rounded-xl p-8 text-center space-y-6 shadow-2xl">
            <div className="flex items-center text-red-400 mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Something went wrong</h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                The interface encountered an unexpected error. Your data and progress remain completely safe.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Reload Page
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/dashboard';
                }}
                leftIcon={<Home className="w-4 h-4" />}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

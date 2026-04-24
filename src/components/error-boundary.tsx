"use client";

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error | null }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🛡️ Error Boundary caught an error:', error, errorInfo);
    
    // In production, you might want to log to an external service
    if (typeof window !== 'undefined') {
      console.warn('System running in safe mode due to error:', error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, onReset }: { error: Error | null; onReset?: () => void }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">System Running in Safe Mode</h2>
        <p className="text-slate-300 mb-4">
          ARGUS is operating in safe mode to ensure stability. Some features may be limited.
        </p>
        <div className="space-y-2 text-left bg-slate-900/50 rounded p-3 mb-4">
          <p className="text-sm text-slate-400">
            <strong>What's happening:</strong> The system encountered an issue and automatically switched to safe mode.
          </p>
          <p className="text-sm text-slate-400">
            <strong>What you can do:</strong> Continue using the system with demo data, or refresh the page.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            Refresh System
          </button>
          <button
            onClick={() => onReset?.()}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Continue in Safe Mode
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4 text-left">
            <summary className="text-xs text-slate-500 cursor-pointer">Error Details (Dev Mode)</summary>
            <pre className="text-xs text-red-400 mt-2 bg-slate-950 p-2 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * Hook for handling async errors in components
 */
export function useErrorHandler() {
  return (error: Error, context?: string) => {
    console.error(`🛡️ Async Error Handler [${context || 'Unknown'}]:`, error);
    
    // In production, you might want to log to an external service
    if (typeof window !== 'undefined') {
      console.warn('System handling error gracefully:', error.message);
    }
  };
}

/**
 * Safe async wrapper for component operations
 */
export function withAsyncErrorHandling<T>(
  operation: () => Promise<T>,
  fallback: T,
  onError?: (error: any) => void
): Promise<T> {
  return new Promise((resolve) => {
    operation()
      .then((result) => resolve(result))
      .catch((error) => {
        console.warn('🛡️ Async operation failed, using fallback:', error?.message || 'Unknown error');
        if (onError) onError(error);
        resolve(fallback);
      });
  });
}

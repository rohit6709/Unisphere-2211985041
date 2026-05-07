import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[var(--primary)]/20 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              
              <h1 className="font-heading font-extrabold text-2xl text-[var(--text-h)] mb-3 tracking-tight">
                Oops! Something went wrong.
              </h1>
              
              <p className="text-[var(--text)] text-sm mb-8 leading-relaxed">
                We've encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center justify-center gap-2 bg-[var(--primary)] text-white px-6 py-3 rounded-full font-medium hover:bg-[var(--violet)] transition-colors shadow-lg shadow-[var(--primary)]/25"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Refresh Page
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex items-center justify-center gap-2 bg-[var(--bg-card-alt)] text-[var(--text-h)] border border-[var(--border)] px-6 py-3 rounded-full font-medium hover:bg-[var(--bg)] transition-colors"
                >
                  Go Home
                </button>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <div className="mt-8 text-left bg-red-500/5 border border-red-500/20 rounded-xl p-4 overflow-auto text-xs font-mono text-red-400 max-h-40 scrollbar-thin">
                  <p className="font-bold mb-2">{this.state.error.toString()}</p>
                  <pre>{this.state.errorInfo?.componentStack}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

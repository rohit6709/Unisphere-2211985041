import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[GLOBAL_ERROR_BOUNDARY] caught:', error, errorInfo);
    // Here we could send the error to a service like Sentry
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 p-6">
          <div className="max-w-md w-full text-center space-y-8">
             <div className="h-24 w-24 bg-red-50 dark:bg-red-900/20 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-red-500/10">
                <AlertCircle className="h-12 w-12 text-red-600" />
             </div>
             
             <div className="space-y-3">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white">Something went wrong</h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  An unexpected error occurred. Don't worry, your data is safe. Try refreshing the page or going back home.
                </p>
             </div>

             {import.meta.env.DEV && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-left overflow-auto max-h-40">
                   <p className="text-[10px] font-mono text-red-500 whitespace-pre-wrap">
                      {this.state.error?.toString()}
                   </p>
                </div>
             )}

             <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => window.location.reload()}
                  className="rounded-2xl h-14 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 font-black"
                >
                   <RotateCcw className="mr-2 h-5 w-5" /> Refresh Unisphere
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => window.location.href = '/'}
                  className="rounded-2xl h-14 font-black"
                >
                   <Home className="mr-2 h-5 w-5" /> Back to Dashboard
                </Button>
             </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

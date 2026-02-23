import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  stack: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      stack: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      message: error.message,
      stack: error.stack || '',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep detailed crash info in console for debugging.
    console.error('App crashed:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <div className="max-w-2xl mx-auto bg-slate-900 border border-red-500/30 rounded-lg p-5">
          <h1 className="text-red-300 font-semibold mb-2">Application Error</h1>
          <p className="text-slate-200 mb-3">{this.state.message || 'Unknown runtime error'}</p>
          {this.state.stack && (
            <pre className="text-xs whitespace-pre-wrap bg-slate-950 border border-slate-800 rounded p-3 overflow-auto">
              {this.state.stack}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

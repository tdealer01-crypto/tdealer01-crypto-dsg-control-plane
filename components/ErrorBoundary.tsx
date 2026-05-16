import React from 'react';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
        <h2 className="text-lg font-semibold text-rose-400">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-400">{this.state.message}</p>
        <button
          className="mt-4 rounded-lg bg-rose-500/20 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/30"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;

import { Component } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import Button from './ui/Button';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <FiAlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Something went wrong</h1>
            <p className="mt-1 text-sm text-slate-500">
              This page ran into an unexpected error. Reloading usually fixes it.
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>Reload page</Button>
        </div>
      );
    }

    return this.props.children;
  }
}

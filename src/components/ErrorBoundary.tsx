'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props { children: React.ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-destructive-subtle flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Something went wrong</h2>
        <p className="text-sm text-foreground-tertiary mb-6 max-w-sm">
          An unexpected error occurred. Try refreshing the page — if the problem
          persists, contact support.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={this.reset}>
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Try again
          </Button>
          <Button size="sm" onClick={() => window.location.reload()}>
            Refresh page
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <p className="mt-6 font-mono text-xs text-foreground-muted max-w-lg text-left bg-muted px-3 py-2 rounded-lg break-words">
            {this.state.message}
          </p>
        )}
      </div>
    );
  }
}

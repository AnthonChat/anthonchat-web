"use client";

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface LocaleErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface LocaleErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically for locale-related errors:
 * - Catches errors in language switching components
 * - Provides user-friendly fallback UI
 * - Allows recovery without full page reload
 * - Logs errors for debugging in development
 */
export class LocaleErrorBoundary extends Component<
  LocaleErrorBoundaryProps,
  LocaleErrorBoundaryState
> {
  constructor(props: LocaleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LocaleErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('LocaleErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-destructive/10 rounded-full w-fit">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-lg">Language Controls Error</CardTitle>
            <CardDescription>
              There was an issue with the language or theme controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                <strong>Error:</strong> {this.state.error.message}
              </div>
            )}
            <Button 
              onClick={this.handleRetry} 
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
              size="sm"
              variant="ghost"
            >
              Reload Page
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with locale error boundary
 */
export function withLocaleErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <LocaleErrorBoundary fallback={fallback}>
      <Component {...props} />
    </LocaleErrorBoundary>
  );

  WrappedComponent.displayName = `withLocaleErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}
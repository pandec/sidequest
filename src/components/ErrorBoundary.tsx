import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              Don't worry — this happens! Check the error below for clues, or
              just try again.
            </p>
          </div>

          {this.state.error && (
            <pre className="rounded-lg border border-border bg-muted/50 p-4 text-left text-xs leading-relaxed text-muted-foreground font-mono whitespace-pre-wrap break-words">
              {this.state.error.message}
            </pre>
          )}

          <div className="flex justify-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

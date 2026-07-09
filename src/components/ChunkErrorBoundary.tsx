import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { recoverFromChunkFailure } from "@/lib/lazyRetry";
import { trackEvent } from "@/lib/analytics";

interface State {
  hasError: boolean;
  isChunkError: boolean;
  message?: string;
  retrying: boolean;
}

function isChunkError(err: unknown): boolean {
  return /Loading chunk|Loading CSS chunk|dynamically imported module|Failed to fetch|ChunkLoadError/i.test(
    String((err as any)?.message || err),
  );
}

export class ChunkErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, isChunkError: false, retrying: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, isChunkError: isChunkError(error), message: error.message, retrying: false };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[ChunkErrorBoundary]", error);
    try {
      trackEvent("chunk_load_error", {
        boundary: "ChunkErrorBoundary",
        message: error.message,
        href: typeof window !== "undefined" ? window.location.href : undefined,
      });
    } catch {/* noop */}
  }

  componentDidMount() {
    if (typeof window !== "undefined") {
      window.addEventListener("lovable:chunk-error", this.onChunkErrorEvent as EventListener);
    }
  }

  componentWillUnmount() {
    if (typeof window !== "undefined") {
      window.removeEventListener("lovable:chunk-error", this.onChunkErrorEvent as EventListener);
    }
  }

  private onChunkErrorEvent = (e: CustomEvent) => {
    // Surface lazyRetry failures even if no React error was thrown (e.g. preload).
    if (!this.state.hasError) {
      this.setState({ hasError: true, isChunkError: true, message: (e.detail as any)?.message, retrying: false });
    }
  };

  private handleRetry = async () => {
    this.setState({ retrying: true });
    await recoverFromChunkFailure();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isChunk = this.state.isChunkError;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">
            {isChunk ? "We've updated the app" : "Something went wrong"}
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            {isChunk
              ? "A new version is available and the page couldn't load some files. Reload to get the latest version."
              : "An unexpected error occurred. Please try reloading the page."}
          </p>
          <Button onClick={this.handleRetry} disabled={this.state.retrying} className="gap-2 w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 ${this.state.retrying ? "animate-spin" : ""}`} />
            {this.state.retrying ? "Reloading…" : "Retry loading"}
          </Button>
          {import.meta.env.DEV && this.state.message && (
            <pre className="mt-4 text-[10px] text-left bg-muted rounded p-2 overflow-auto max-h-32 text-muted-foreground">
              {this.state.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

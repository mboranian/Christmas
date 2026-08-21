import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Without this, any render error unmounts the whole tree and leaves a blank
 * white page with no indication anything went wrong — the error only appears in
 * the console, which nobody in the family is going to open.
 */
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary-card">
          <h1>🎄 Something went wrong</h1>
          <p>
            The page hit an error and couldn't finish loading. Reloading usually
            sorts it out — your lists are saved.
          </p>
          <div className="error-boundary-actions">
            <button onClick={() => window.location.reload()} className="create-list-button">
              Reload the page
            </button>
          </div>
          <p className="error-boundary-detail">{error.message}</p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

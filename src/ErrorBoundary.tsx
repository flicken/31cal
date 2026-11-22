import React from 'react';

/** Give it a `key` (e.g. the route) to reset after navigating away. */
type Props = { children: React.ReactNode };
type State = { error?: Error };

/** Catches render errors in a view so the rest of the app keeps working. */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ padding: '1rem' }}>
        <h2>Something went wrong on this page.</h2>
        <p>{this.state.error.message}</p>
        <button onClick={() => this.setState({ error: undefined })}>
          Try again
        </button>
      </div>
    );
  }
}

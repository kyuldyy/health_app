import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { err?: Error }> {
  state: { err?: Error } = {};
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="screen" role="alert">
        <h1>Something broke</h1>
        <p className="muted">Your data is safe on this device. Reload to continue.</p>
        <button className="btn primary block" onClick={() => location.reload()}>Reload</button>
        <p className="muted small">{this.state.err.message}</p>
      </div>
    );
  }
}

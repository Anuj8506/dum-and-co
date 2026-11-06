import { Component } from 'react';
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="page">
          <div className="empty-state" role="alert">
            <h1>Let’s get you back to the table.</h1>
            <p>We couldn’t open this view. Reload to try again. Your saved orders are safe.</p>
            <button className="button" onClick={() => window.location.reload()}>
              Reload app
            </button>
          </div>
        </main>
      );
    return this.props.children;
  }
}

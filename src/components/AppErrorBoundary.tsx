import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("RideSetu encountered an unexpected rendering error.", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main role="alert" className="app">
        <section className="phone-shell" style={{ display: "grid", placeContent: "center", gap: 16, padding: 28, textAlign: "center" }}>
          <h1>RideSetu couldn't load this screen</h1>
          <p>Please try again. Your ride has not been booked.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload RideSetu
          </button>
        </section>
      </main>
    );
  }
}

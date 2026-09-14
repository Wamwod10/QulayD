import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ componentStack: info?.componentStack || "" });
    console.error("Qulay interfeysida kutilmagan xato:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="qp-fatal-error" role="alert">
          <div>
            <span>Xatolik</span>
            <h1>Sahifani ko‘rsatishda muammo yuz berdi</h1>
            <p>Saqlangan ma’lumotlaringiz o‘chirilmagan. Sahifani qayta yuklab ko‘ring yoki bosh sahifaga qayting.</p>
            {import.meta.env.DEV && this.state.error ? (
              <details className="qp-error-details">
                <summary>Development tafsilotlari</summary>
                <pre>{`${this.state.error.name || "Error"}: ${this.state.error.message || String(this.state.error)}${this.state.componentStack}`}</pre>
              </details>
            ) : null}
            <div className="qp-inline-actions">
              <button type="button" className="qp-button qp-button-primary" onClick={() => window.location.reload()}>Sahifani qayta yuklash</button>
              <button type="button" className="qp-button qp-button-secondary" onClick={() => window.location.assign("/dashboard")}>Bosh sahifaga qaytish</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Qulay interfeysida kutilmagan xato:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="qp-fatal-error">
          <div>
            <span>Xatolik</span>
            <h1>Sahifani ko‘rsatishda muammo yuz berdi</h1>
            <p>Saqlangan ma’lumotlaringiz o‘chirilmagan. Sahifani yangilab ko‘ring.</p>
            <button type="button" className="qp-button qp-button-primary" onClick={() => window.location.reload()}>Sahifani yangilash</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

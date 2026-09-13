import { Provider } from "react-redux";

import ErrorBoundary from "../components/feedback/ErrorBoundary";
import { AuthProvider } from "../features/auth/AuthContext.jsx";
import ToastProvider from "../components/feedback/ToastProvider";
import AppearanceSync from "./AppearanceSync";
import CurrencySync from "./CurrencySync";
import LanguageSync from "./LanguageSync";
import PwaLifecycle from "./PwaLifecycle";
import { store } from "./store";

function AppProviders({ children }) {
  return (
    <Provider store={store}>
      <AuthProvider>
        <ErrorBoundary>
          <AppearanceSync />
          <LanguageSync />
          <CurrencySync />
          <PwaLifecycle />
          {children}
          <ToastProvider />
        </ErrorBoundary>
      </AuthProvider>
    </Provider>
  );
}

export default AppProviders;

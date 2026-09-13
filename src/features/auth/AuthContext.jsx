import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import AuthContext from "./authContextInstance";

import {
  changeOwnPassword,
  createOwnerAccount,
  getAuthSession,
  getCompanyById,
  getCurrentAuthUser,
  isAuthReady,
  loginWithPhone,
  loginWithPin,
  logoutAuth,
  restoreAuthSession,
  subscribeAuth,
} from "../../services/authService";


function snapshot() {
  return {
    session: getAuthSession(),
    user: getCurrentAuthUser(),
    ready: isAuthReady(),
  };
}

let lastSessionRaw = "";
let lastSnapshot = snapshot();

function stableSnapshot() {
  const current = getAuthSession();
  const raw = JSON.stringify([current || null, getCurrentAuthUser() || null, isAuthReady()]);
  if (raw !== lastSessionRaw) {
    lastSessionRaw = raw;
    lastSnapshot = snapshot();
  } else {
    const nextUser = getCurrentAuthUser();
    if (JSON.stringify(nextUser || null) !== JSON.stringify(lastSnapshot.user || null)) lastSnapshot = { session: current, user: nextUser };
  }
  return lastSnapshot;
}

export function AuthProvider({ children }) {
  const state = useSyncExternalStore(subscribeAuth, stableSnapshot, stableSnapshot);
  useEffect(() => { restoreAuthSession(); }, []);
  const login = useCallback((phone, password) => loginWithPhone(phone, password), []);
  const pinLogin = useCallback((identifier, pin) => loginWithPin(identifier, pin), []);
  const logout = useCallback(() => logoutAuth(), []);
  const registerOwner = useCallback((payload) => createOwnerAccount(payload), []);
  const changePassword = useCallback((currentPassword, newPassword) => changeOwnPassword(currentPassword, newPassword), []);

  const value = useMemo(() => ({
    ...state,
    company: state.session?.companyId ? getCompanyById(state.session.companyId) : null,
    isAuthenticated: Boolean(state.user),
    isLoading: !state.ready,
    login,
    pinLogin,
    logout,
    registerOwner,
    changePassword,
  }), [state, login, pinLogin, logout, registerOwner, changePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

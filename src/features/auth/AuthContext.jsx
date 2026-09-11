import { useCallback, useMemo, useSyncExternalStore } from "react";

import AuthContext from "./authContextInstance";

import {
  changeOwnPassword,
  createOwnerAccount,
  getAuthSession,
  getCompanyById,
  getCurrentAuthUser,
  loginWithPhone,
  logoutAuth,
  subscribeAuth,
} from "../../services/authService";


function snapshot() {
  return {
    session: getAuthSession(),
    user: getCurrentAuthUser(),
  };
}

let lastSessionRaw = "";
let lastSnapshot = snapshot();

function stableSnapshot() {
  const current = getAuthSession();
  const raw = JSON.stringify(current || null);
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
  const login = useCallback((phone, password) => loginWithPhone(phone, password), []);
  const logout = useCallback(() => logoutAuth(), []);
  const registerOwner = useCallback((payload) => createOwnerAccount(payload), []);
  const changePassword = useCallback((currentPassword, newPassword) => changeOwnPassword(currentPassword, newPassword), []);

  const value = useMemo(() => ({
    ...state,
    company: state.session?.companyId ? getCompanyById(state.session.companyId) : null,
    isAuthenticated: Boolean(state.user),
    isSuperAdmin: Boolean(state.user?.roles?.includes("SUPER_ADMIN")),
    login,
    logout,
    registerOwner,
    changePassword,
  }), [state, login, logout, registerOwner, changePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

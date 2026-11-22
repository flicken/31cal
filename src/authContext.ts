import React from 'react';

export type AuthContextType = {
  isLoggedIn: boolean;
  hasWriteAccess: boolean;
  /**
   * Resolve true once write scope is granted (prompting if needed), false if
   * the user declines or closes the popup. Call before any await in a click
   * handler so the popup isn't blocked.
   */
  ensureWriteAccess: () => Promise<boolean>;
  login: () => void;
};

const authContext = React.createContext<AuthContextType>({
  isLoggedIn: false,
  hasWriteAccess: false,
  ensureWriteAccess: () => Promise.resolve(false),
  login: () => {},
});

authContext.displayName = 'authContext';

export { authContext };

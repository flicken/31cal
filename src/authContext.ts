import React from 'react';

export type AuthContextType = {
  hasWriteAccess: boolean;
  requestWriteAccess: () => Promise<void>;
};

const authContext = React.createContext<AuthContextType>({
  hasWriteAccess: false,
  requestWriteAccess: () => Promise.resolve(),
});

authContext.displayName = 'authContext';

export { authContext };

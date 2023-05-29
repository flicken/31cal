import React from 'react';
import { GoogleUser } from './useGoogleButton';

const userContext = React.createContext<{ user: GoogleUser | null }>({
  user: null,
});

userContext.displayName = 'userContext';

export { userContext };

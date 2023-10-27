import React from 'react';
import { GoogleUser } from './useGoogleButton';

const userContext = React.createContext<GoogleUser | null>(null);

userContext.displayName = 'userContext';

export { userContext };

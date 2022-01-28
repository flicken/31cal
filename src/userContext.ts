import React from 'react';

const userContext = React.createContext({user: null});

userContext.displayName = 'userContext';

export { userContext };

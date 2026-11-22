import React, { useMemo } from 'react';
import './App.css';
import { userContext } from './userContext';
import { authContext } from './authContext';
import { useGoogleButton } from './useGoogleButton';
import { SettingsProvider } from './lib/settings';
import { ToastContainer } from 'react-toastify';
import { FilterStateProvider } from './lib/FilterStateContext';
import { Routes } from './Nav';
import { googleButtonContext } from './googleButtonContext';

function App() {
  const { button, user, isLoggedIn, hasWriteAccess, ensureWriteAccess, login } =
    useGoogleButton();

  const auth = useMemo(
    () => ({ isLoggedIn, hasWriteAccess, ensureWriteAccess, login }),
    // login is recreated every render but always does the same thing
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoggedIn, hasWriteAccess, ensureWriteAccess],
  );

  return (
    <FilterStateProvider>
      <userContext.Provider value={user}>
        <authContext.Provider value={auth}>
          <SettingsProvider>
            <googleButtonContext.Provider value={button}>
              <Routes />
            </googleButtonContext.Provider>
            <ToastContainer />
          </SettingsProvider>
        </authContext.Provider>
      </userContext.Provider>
    </FilterStateProvider>
  );
}

export default App;

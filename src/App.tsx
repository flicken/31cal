import React from 'react';
import './App.css';
import { userContext } from './userContext';
import { authContext } from './authContext';
import { GoogleUser, useGoogleButton } from './useGoogleButton';
import { SettingsProvider } from './lib/settings';
import { ToastContainer } from 'react-toastify';
import { FilterStateProvider } from './lib/FilterStateContext';
import { useRoutes } from 'react-router';
import { useLocalStorage } from 'usehooks-ts';
import { googleButtonContext, ROUTES } from './Nav';

function App() {
  const [user] = useLocalStorage<GoogleUser | null>('googleUser', null);
  const { button: googleButton, hasWriteAccess, requestWriteAccess } =
    useGoogleButton();

  return (
    <FilterStateProvider>
      <userContext.Provider value={user}>
        <authContext.Provider value={{ hasWriteAccess, requestWriteAccess }}>
          <SettingsProvider>
            <googleButtonContext.Provider value={googleButton}>
              {useRoutes(ROUTES)}
            </googleButtonContext.Provider>
            <ToastContainer />
          </SettingsProvider>
        </authContext.Provider>
      </userContext.Provider>
    </FilterStateProvider>
  );
}

export default App;

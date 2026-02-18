import React from 'react';
import './App.css';
import { userContext } from './userContext';
import { authContext } from './authContext';
import { GoogleUser, useGoogleButton } from './useGoogleButton';
import { SettingsProvider } from './lib/settings';
import { ToastContainer } from 'react-toastify';
import { FilterStateProvider } from './lib/FilterStateContext';
import { useLocalStorage } from 'usehooks-ts';
import { Routes } from './Nav';
import { googleButtonContext } from './googleButtonContext';

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
             <Routes/>
            </googleButtonContext.Provider>
            <ToastContainer />
          </SettingsProvider>
        </authContext.Provider>
      </userContext.Provider>
    </FilterStateProvider>
  );
}

export default App;

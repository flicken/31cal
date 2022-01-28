import React, { useState } from 'react';
import './App.css';
import {userContext} from './userContext';

import useClientToFetch from './google/useClientToFetch';
import {useGoogleButton} from './useGoogleButton';
import Calendars from './Calendars';

function App() {
    const [user, setUser] = useState<any>(null);
    const googleButton = useGoogleButton(user, setUser);

    useClientToFetch(user);

    return (
        <userContext.Provider value={user}>
            {googleButton}
            <Calendars/>
        </userContext.Provider>);

}

export default App;

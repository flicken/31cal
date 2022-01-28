import React, { useState } from 'react';
import './App.css';
import {userContext} from './userContext';

import {useGoogleButton} from './useGoogleButton';

function App() {
    const [user, setUser] = useState<any>(null);
    const googleButton = useGoogleButton(user, setUser);

    return (
        <userContext.Provider value={user}>
            {googleButton}
        </userContext.Provider>);

}

export default App;

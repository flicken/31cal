import React, { useState } from 'react';
import './App.css';
import {userContext} from './userContext';

import useClientToFetch from './google/useClientToFetch';
import {useGoogleButton} from './useGoogleButton';
import Calendars from './Calendars';
import Events from './Events';

import { Link, Switch, Route, useRoute } from "wouter";

const ActiveLink = (props: {href: string, children: any}) => {
    const [isActive] = useRoute(props.href);
    return (
        <Link {...props}>
            <a className={isActive ? "active" : ""} href={props.href}>{props.children}</a>
        </Link>
    );
};

function App() {
    const [user, setUser] = useState<any>(null);
    const googleButton = useGoogleButton(user, setUser);

    useClientToFetch(user);

    return (
        <userContext.Provider value={user}>
            <nav>
                <ActiveLink href="/">Home</ActiveLink>
                <ActiveLink href="/calendars">Calendars</ActiveLink>
                <ActiveLink href="/events">Events</ActiveLink>
            </nav>

            {googleButton}
            <Switch>
                <Route path="/calendars" component={Calendars} />
                <Route path="/events" component={Events} />
                <Route>Check out the links!</Route>
            </Switch>
        </userContext.Provider>);

}

export default App;

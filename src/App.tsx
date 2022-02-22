import React, { useState } from 'react';
import './App.css';
import {userContext} from './userContext';

import useClientToFetch from './google/useClientToFetch';
import {useGoogleButton} from './useGoogleButton';
import BulkEntry from './BulkEntry';
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
            <ActiveLink href="/">Home</ActiveLink>
            <div style={{float: "right", clear: "both"}}>{googleButton}</div>
            <Switch>
                <Route path="/bulk" component={BulkEntry} />
                <Route path="/calendars" component={Calendars} />
                <Route path="/events" component={Events} />
                <Route>
                    <nav>
                        <ActiveLink href="/bulk">Bulk Entry</ActiveLink>
                        <ActiveLink href="/calendars">Calendars</ActiveLink>
                        <ActiveLink href="/events">Events</ActiveLink>
                    </nav>
                    Agenda: 31 different ways to calendar
                </Route>
            </Switch>
        </userContext.Provider>);

}

export default App;

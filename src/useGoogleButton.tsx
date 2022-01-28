import React, { useCallback } from 'react';

import { useGoogleLogin, useGoogleLogout } from 'react-google-login';

import {  GOOGLE_CLIENT_ID } from "./config";

export function useGoogleButton(user: any, setUser: (arg0: any) => void) {
    const onLogoutSuccess = useCallback(
        () => {
            setUser(null);
        },
        [],
    );
    const onFailure = useCallback(
        (e: any) => {
            console.log("failure", e);
        },
        [],
    );
    const onSuccess = useCallback(
        (e: any) => {
            console.log("success", e);
            setUser(e);
        },
        [],
    );

    const { signIn, loaded: signInLoaded } = useGoogleLogin({
        clientId: GOOGLE_CLIENT_ID,
        cookiePolicy: 'single_host_origin',
        discoveryDocs: "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
        isSignedIn: true,
        onFailure: () => {console.log("failure");},
        onSuccess,
    });

    const { signOut, loaded: signOutLoaded } = useGoogleLogout({
        clientId: GOOGLE_CLIENT_ID,
        onFailure: () => {console.log("failure");},
        onLogoutSuccess,
    });

    if (user) {
        const logoutText = user?.profileObj?.email ? `Logout (${user.profileObj.email})` : "Logout";
        return <button onClick={signOut}>{logoutText}</button>;
    } else {
        return <button onClick={signOut}>Login</button>;
    }
};


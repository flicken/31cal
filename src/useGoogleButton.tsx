import React, { useCallback } from 'react';

import { GoogleLogin, GoogleLogout } from 'react-google-login';

import {  GOOGLE_CLIENT_ID } from "./config";

export function useGoogleButton(user: any, setUser: (arg0: any) => void) {
    const onLogout = useCallback(
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

    if (user) {
        const logoutText = user?.profileObj?.email ? `Logout (${user.profileObj.email})` : "Logout";
        return (<GoogleLogout
                           clientId={ `${GOOGLE_CLIENT_ID}` }
                           buttonText= {logoutText}
                onLogoutSuccess={onLogout}
            />);
    } else {
        return (<GoogleLogin
                           clientId={ `${GOOGLE_CLIENT_ID}` }
                           buttonText="Login"
                           onSuccess={onSuccess}
                           onFailure={onFailure}
                           cookiePolicy={'single_host_origin'}
                           isSignedIn={true}
            />);
    }
};


import { useCallback, useEffect } from 'react';

import { db } from '../models/db';
import fetchList from './fetchList';
import { useLiveQuery } from "dexie-react-hooks";

function useClientToFetch(user: any) {
    const getCalendars = useCallback(async () => {
        if (!user) return;
        const account = user.profileObj.email;
        const resource = "calendarList";
        const transformation = (calendar: any) => {
            if (calendar.summaryOverride) {
                calendar.originalSummary = calendar.summary
                calendar.summary = calendar.summaryOverride
            }
            return calendar;
        };

        await fetchList({
            account,
            resource,
            transformation,
            request: {},
            googleResource: gapi => gapi.client.calendar.calendarList,
            table: db.calendars
        });
    }, [user]);

    const calList = useLiveQuery(() => db.calendars.filter(c => c.selected).toArray());
    console.log("Selected calendars", calList);

    const getEvents = useCallback(async () => {
        if (!user) return;
        const account = user.profileObj.email;
        const calendarId = "primary";
        const resource = `calendar/${calendarId}`;
        const transformation = (event: any) => {
            event.calendarId = calendarId;
            return event;
        };
        const request = {
            calendarId,
            showDeleted: true,
            singleEvents: true,
        }
        await fetchList({
            account,
            request,
            resource,
            transformation,
            googleResource: gapi => gapi.client.calendar.events,
            table: db.events
        });
    }, [user]);

    useEffect(() => {
        getCalendars();
    }, [getCalendars]);

    useEffect(() => {
        getEvents();
    }, [getEvents]);

}

export default useClientToFetch;

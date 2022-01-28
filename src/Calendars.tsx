import React, { useCallback, useContext, useEffect } from 'react';
import {userContext} from './userContext';

import {db, UpdateState} from './models/db';
import { useLiveQuery } from "dexie-react-hooks";


function Calendars() {
    const user = useContext(userContext);
    const calList = useLiveQuery(() => db.calendars.orderBy("summary").toArray());
    const eventList = useLiveQuery(() => db.events.toArray());

    if (!user) return <>Loading...</>;
    return <div>
    {calList && calList.filter((c: any) => c.selected).map((c: any) =>
        <div key = {c.id} style={{backgroundColor: c.backgroundColor, color: c.foregroundColor}}>{c.summary}</div>
    )}
    {eventList && eventList.map((e: any) =>
        <div key={`${e.calendarId}/${e.id}`}>{JSON.stringify(e.start)} {e.summary}</div>
    )}
        
    </div>

}

export default Calendars;

import React from 'react';

import {db} from './models/db';
import { useLiveQuery } from "dexie-react-hooks";


function Events() {
    const eventList = useLiveQuery(() => db.events.toArray());

    return (<div>
    {eventList && eventList.map((e: any) =>
        <div key={`${e.calendarId}/${e.id}`}>{JSON.stringify(e.start)} {e.summary}</div>
    )}
    </div>);

}

export default Events;

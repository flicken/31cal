import React from 'react';

import {db} from './models/db';
import {CalendarEvent} from './models/types'
import { useLiveQuery } from "dexie-react-hooks";

import ViewEvent from './ViewEvent'

function Events() {
    const eventList: Array<CalendarEvent> = useLiveQuery(() => db.events.limit(100).toArray()) || [];

    return (<div>
    {eventList && eventList.map((e: any) =>
        <ViewEvent key={`${e.calendarId}/${e.id}`} event={e}/>
    )}
    </div>);

}

export default Events;

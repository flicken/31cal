import React from 'react';

import {db} from './models/db';
import {CalendarEvent} from './models/types'
import { useLiveQuery } from "dexie-react-hooks";

import useDefaultCalendar from './lib/useDefaultCalendar'
import ViewEvent from './ViewEvent'

function Events() {
    const defaultCalendar = useDefaultCalendar();

    const [now, setNow] = React.useState(Date.now()) 

    React.useEffect(() => {
        const timer = setInterval(() => { 
            setNow(Date.now());
        }, 60 * 1000);
        return () => {
            clearInterval(timer);
        }
    }, [setNow]);


    const eventList: Array<CalendarEvent>|undefined = useLiveQuery(() => {
        let query = db.events;
        if (defaultCalendar) {
            return query.where({calendarId: defaultCalendar.id})
                        .and(event => (event?.start?.ms || 0) > now)
                        .sortBy("start.ms")
        } else {
            return query.where("id").notEqual("")
                        .toArray()
        }
        
    }, [defaultCalendar, now]);

    if (!defaultCalendar || !eventList) {
        return <div>Loading...</div>
    }

    return (<div>
    {eventList && eventList.slice(0,100).map((e: any) =>
        <ViewEvent key={`${e.calendarId}/${e.id}`} event={e}/>
    )}
    </div>);

}

export default Events;

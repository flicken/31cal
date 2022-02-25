import React from 'react';

import {db} from './models/db';
import { useLiveQuery } from "dexie-react-hooks";

import useDefaultCalendar from './lib/useDefaultCalendar'
import ViewEvent from './ViewEvent'

import { DateTime } from 'luxon';

function Events() {
    const defaultCalendar = useDefaultCalendar();

    const [now, setNow] = React.useState(DateTime.now()) 

    React.useEffect(() => {
        const timer = setInterval(() => { 
            setNow(DateTime.now());
        }, 60 * 1000);
        return () => {
            clearInterval(timer);
        }
    }, [setNow]);


    const eventList = useLiveQuery(() => {
        let query = db.events;
        const startOfDay = now.startOf("day")
        const max = startOfDay.plus({months: 1, days: 1})
        if (defaultCalendar) {
            return query.where(["calendarId", "start.ms"])
                        .between([defaultCalendar.id, startOfDay.toMillis()], [defaultCalendar.id, max.toMillis()], true, true)
                        .toArray()
        } else {
            return query.where("id").notEqual("")
                        .toArray()
        }
        
    }, [defaultCalendar, now]);

    if (!defaultCalendar || !eventList) {
        return <div>Loading...</div>
    }

    return (<div>
    {eventList && eventList.map((e: any) =>
        <ViewEvent key={`${e.calendarId}/${e.id}`} event={e}/>
    )}
    </div>);

}

export default Events;

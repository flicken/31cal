import React from 'react'
import {CalendarEvent, StartEnd} from './models/types'

import { DateTime } from 'luxon';
import dompurify from 'dompurify';

function timeOf(value: StartEnd) {
    if ("dateTime" in value)
        return DateTime.fromISO(value.dateTime)?.toLocaleString(DateTime.TIME_SIMPLE) || null;
    else
        return "all day"
}

function dateOf(value: StartEnd) {
    if ("dateTime" in value)
        return value.dateTime?.slice(0, 10)
    else
        return value.date
}

function ViewStartAndEnd({start, end}: {start?: StartEnd, end?: StartEnd}) {
    if (start && end) {
        if (dateOf(start) === dateOf(end)) {
            return <>{dateOf(start)} {timeOf(start)} - {timeOf(end)}</>
        } else {
            return <>{dateOf(start)} {timeOf(start)} - {dateOf(end)} {timeOf(end)}</>
        }
    } else if (start) {
        return <>{dateOf(start)} {timeOf(start)}</>
    } else {
        return null;
    }
}

const sanitizer = dompurify.sanitize;

function ViewEvent({event}: {event: Partial<CalendarEvent>}) {
    
    return (
        <div title={JSON.stringify(event, null, 2)}>
            <ViewStartAndEnd start={event.start} end={event.end}/>{' '}<b>{event.summary}</b><br/>
            <i><span dangerouslySetInnerHTML={{__html: sanitizer(event.description ?? "")}}></span></i>
        </div>
    )
}


export default ViewEvent;

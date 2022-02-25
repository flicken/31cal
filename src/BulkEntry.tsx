import React, { useState, useCallback, useEffect } from 'react';

import TextareaAutosize from 'react-textarea-autosize';

import parseEvent from './lib/parseEvent';

import ViewEvent from './ViewEvent'

import { DateTime } from 'luxon';

import ensureClient from './google/ensureClient'
import {compact} from "lodash"
import useDefaultCalendar from './lib/useDefaultCalendar'
import { toast } from 'react-toastify';

import {isEmpty} from "lodash"

const placeholderEntry = "Saturday 3pm rehearsal\n6pm-9pm concert"

function googleTimeToDateTime(value: any, timeZone: any) {
    return DateTime.fromISO(value.dateTime || value.date, {zone: value.timeZone || timeZone })
}

async function saveEvents(calendar: any, events: any[], description: string) {
    toast(`Saving events to ${calendar.summary}`, {hideProgressBar: true});
    console.log("Saving events to calendar ", calendar?.id)
    await ensureClient();
    const gapi: any = (window as any).gapi;
    events.forEach(async (event: any) => {
        try {
        if (!event.end) {
            if (event.start.date) {
                event.end = event.start
            } else {
                event.end = {
                    dateTime: googleTimeToDateTime(event.start, calendar.timeZone).plus({hours: 1}).toISO()
                }
            }
        }
        const response = await gapi.client.calendar.events.insert({
            'calendarId': calendar?.id,
            'resource': {description: description, ...event},
        })
            console.log("Response", response)
            toast.info(`Saved event ${JSON.stringify(event)}`, {hideProgressBar: true})
        } catch (e) {
            toast.error(`Error sending event ${JSON.stringify(event)}`, {hideProgressBar: true})
        }
    })
}

function BulkEntry() {
    const defaultCalendar = useDefaultCalendar();
    const [events, setEvents] = useState<any>([]);
    const [eventsText, setEventsText] = useState("");
    const [description, setDescription] = useState("");
    const [prefix, setPrefix] = useState("");

    const handlePrefixChange = useCallback((e) => {
        setPrefix(e.target.value)
    }, [setPrefix])

    const handleEventsChange = useCallback((e) => {
        setEventsText(e.target.value);
   }, [setEventsText])

    useEffect(() => {
        const lines = eventsText.match(/[^\r\n]+/g);
        const parsedEvents = new Array(lines?.length || 0);
        lines?.forEach((line: string, i: number) => {
            const parsed = parseEvent(line, compact(parsedEvents));
            console.log("prefix", prefix)
            if (parsed && !isEmpty(prefix)) {
                parsed.summary = `${prefix}${parsed.summary}` 
            }
            parsedEvents[i] = parsed;
        })
        setEvents(compact(parsedEvents))
    }, [eventsText, prefix])

    const handleSaveEvents = useCallback(async () => {
       saveEvents(defaultCalendar, events, description);
    }, [defaultCalendar, events, description])

    const disabled = events?.length > 0
    let saveButton = <button disabled>Set default calendar first</button>
    if (events?.length == 0) {
        saveButton = <button disabled>Enter events first</button>
    } else if (defaultCalendar) {
        saveButton = <button onClick={handleSaveEvents} disabled={!(events?.length > 0)} title={defaultCalendar?.id}>Save events to {defaultCalendar?.summary}</button>
        
    }

    return (
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr"}}>
        <div>
        <TextareaAutosize name="events" minRows={5} style={{width: "40em"}} placeholder={placeholderEntry} onChange={handleEventsChange} />
        <br/>
        <TextareaAutosize name="description" minRows={5} style={{width: "40em"}} placeholder="Description for all events" onChange={(e) => setDescription(e.target.value) } />
        <br/>
        {saveButton}
                         </div>
                         <div>
                             <input type="text" placeholder="Prefix for all events" onChange={handlePrefixChange} />
                             {events.map((event: any, i: number) =>
                                 <ViewEvent key={i} event={event}/>
                             )}
                         </div>
                     </div>
                     );

}

export default BulkEntry;

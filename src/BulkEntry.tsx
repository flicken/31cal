import React, { useState, useCallback, useRef } from 'react';

import TextareaAutosize from 'react-textarea-autosize';

import parseEvent from './lib/parseEvent';

import ViewEvent from './ViewEvent'

function BulkEntry() {
    const [events, setEvents] = useState<any>([]); 
    const [eventText, setEventText] = useState("");
    const [parsedEvent, setParsedEvent] = useState<any | undefined>(undefined);

    const textInput = useRef(null);

    const handleEventTextChange = useCallback((e) => {
        console.log("event", e);
        const value = e.target.value;
        setEventText(value);

        const parsed = parseEvent(value, events);
        if (parsed) {
            setParsedEvent(parsed);
        }
        console.log("parsed", parsed);
    }, [events, setEventText, setParsedEvent]);

    const handleBlur = useCallback((e) => {
        if (parsedEvent) {
            setEvents((events: any[]) => [...events, parsedEvent])
            setEventText("");
            setParsedEvent(undefined);
            (textInput?.current as any)?.focus();
        }
    }, [parsedEvent, setEvents, setEventText, setParsedEvent, textInput]);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if (parsedEvent) {
            setEvents((events: any[]) => [...events, parsedEvent])
            setEventText("");
            setParsedEvent(undefined);
            (textInput?.current as any)?.focus();
        }
    }, [parsedEvent, setEvents, setEventText, setParsedEvent, textInput]);

    return (
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr"}}>
            <div>
                {events.map((event: any, i: number) =>
                    <ViewEvent key={i} event={event}/>
                )}
                <form onSubmit={handleSubmit}>
                    <input autoFocus name="eventText" placeholder="e.g. Rehearsal Tuesday january 5th, 19:30" value={eventText} onChange={handleEventTextChange} ref={textInput} onBlur={handleBlur} />
                    { parsedEvent && <div>{JSON.stringify(parsedEvent)}</div> }
                </form>
            </div>
            <TextareaAutosize name="summary" minRows={5} style={{width: "20em"}} placeholder="Summary for all events" />
            <br/>
        </div>
    );

}

export default BulkEntry;

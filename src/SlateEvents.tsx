// Import React dependencies.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
// Import the Slate editor factory.
import { useSlate } from 'slate-react'
import { createEditor } from 'slate'

// Import the Slate components and React plugin.
import { Slate, Editable, withReact } from 'slate-react'

import {db} from './models/db';
import { useLiveQuery } from "dexie-react-hooks";

import useDefaultCalendar from './lib/useDefaultCalendar'
import DateTimeRangeInput, {DateTimeRange} from "./DateTimeRangeInput"

import { DateTime } from 'luxon';

// TypeScript users only add this code
import { BaseEditor, Descendant } from 'slate'
import { ReactEditor } from 'slate-react'

import {isEmpty} from "lodash"

type CustomElement = { type: 'paragraph'; children: CustomText[] }
type CustomText = { text: string }

declare module 'slate' {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor
        Element: CustomElement
        Text: CustomText
    }
}

function SlateEvents() {
    const editor = useMemo(() => withReact(createEditor()), [])
    const defaultCalendar = useDefaultCalendar();

    const [now, setNow] = useState(DateTime.now()) 

    React.useEffect(() => {
        const timer = setInterval(() => { 
            setNow(DateTime.now());
        }, 60 * 1000);
        return () => {
            clearInterval(timer);
        }
    }, [setNow]);

    const defaultStart = now.startOf("day")
    const [range, onRangeChange] = useState<DateTimeRange>({
              start: defaultStart,
              end: defaultStart.plus({months: 1}).endOf("month")
          });

    const start = range.start || defaultStart;
    const end   = range.end || start.plus({months: 1}).endOf("month")

    const eventList = useLiveQuery(() => {
        let query = db.events;
        if (defaultCalendar) {
            return query.where(["calendarId", "start.ms"])
                        .between([defaultCalendar.id, start.toMillis()], [defaultCalendar.id, end.toMillis()], true, true)
                        .toArray()
        } else {
            return query.where("id").notEqual("")
                        .toArray()
        }
        
    }, [defaultCalendar, range, start, end]);

    const initialValue: CustomElement[] = [
        {
            type: 'paragraph',
            children: [{ text: 'A line of text in a paragraph.' }],
        },
    ];

    const [value, setValue] = useState<Descendant[]>([])

    useEffect(() => {
        console.log("eventList?")
        if (eventList) {
            console.log("eventList!")
            const values = eventList.slice(0, 10).map(e => {
                return {
                    type: 'event',
                    data: e,
                    children: [{text: e.summary}]
                }  
            })
            console.log(values);
            setValue(values)
        }
    }, [eventList])

    const renderElement = useCallback(props => {
        console.log("element type", props.element.type)
        switch (props.element.type) {
            case 'event':
                console.log("event element", props)
                return <EventElement {...props} />
            default:
                return <DefaultElement {...props} />
        }
    }, [])


    
    if (!defaultCalendar || !eventList || isEmpty(value)) {
        return <div>Loading...</div>
    }

    console.log("value", value)
   return (
       <Slate
           editor={editor}
           value={value}
       onChange={newValue => setValue(newValue)} >
       <Editable
           renderElement={renderElement}
           onKeyDown={event => {
               if (event.key === '&') {
                   // Prevent the ampersand character from being inserted.
                   event.preventDefault()
                   // Execute the `insertText` method when the event occurs.
                   editor.insertText('and')
               }
           }}

       />
       </Slate>

   )
}

const DefaultElement = props => {
    return <p {...props.attributes}>{props.children}</p>
}

const EventElement = props => {
    console.log("event", props.element.data)
    const event = props.element.data
    return (
        <div {...props.attributes}>
            <span contentEditable={false}>{props.element.data.start.dateTime || props.element.data.start.date} </span>{props.children}
        </div>
    )
}


export default SlateEvents;

// Import React dependencies.
import React, { useState } from 'react'
// Import the Slate editor factory.
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
    const [editor] = useState(() => withReact(createEditor()))
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

    if (!defaultCalendar || !eventList) {
        return <div>Loading...</div>
    }


    const [value, setValue] = useState<Descendant[]>(initialValue)
    return (
        <Slate value={value} onChange={setValue}>
            ...
        </Slate>
    )
}

export default SlateEvents;

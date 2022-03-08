import React, {useState, useCallback, useMemo} from 'react';

import {db} from './models/db';
import {Event} from './models/types'
import { useLiveQuery } from "dexie-react-hooks";

import useDefaultCalendar from './lib/useDefaultCalendar'
import ViewEvent from './ViewEvent'
import DateTimeRangeInput, {DateTimeRange} from "./DateTimeRangeInput"

import { DateTime } from 'luxon';
import {useDropzone, FileRejection, DropEvent } from 'react-dropzone';


const baseStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as 'column',
    alignItems: 'center',
    padding: '20px',
    borderWidth: 2,
    borderRadius: 2,
    borderColor: '#eeeeee',
    borderStyle: 'dashed',
    backgroundColor: '#fafafa',
    color: '#bdbdbd',
    outline: 'none',
    transition: 'border .24s ease-in-out'
};

const focusedStyle = { 
    borderColor: '#2196f3'
};

const acceptStyle = {
    borderColor: '#00e676'
};

const rejectStyle = {
    borderColor: '#ff1744'
};


function DroppableViewEvent({event}: {event: Event}) {
   const onDrop = useCallback((
        acceptedFiles: File[],
        fileRejections: FileRejection[],
        e: DropEvent
    ) => {
        const fileEncoding = 'UTF-8';
        const onError = (error: any) => {
            console.log(onError);
        };
        acceptedFiles.forEach(file => {
            console.log("Want to attach file to event", file, event)
            /*
            let reader: FileReader = new FileReader()
            reader.onload = (_event: Event) => {
                const csvData = PapaParse.parse(
                    reader.result as string,
                    Object.assign(parserOptions, {
                        error: onError,
                        encoding: fileEncoding,
                    }),
                )
                const data = csvData?.data ?? []
                const newEvents = data.map(toEvent)
                saveEvents(defaultCalendar, newEvents)
                setEvents(previousEvents => [...previousEvents, ...newEvents]);
            }

            reader.readAsText(file, fileEncoding)
            */
        });
    }, []);

    const {
        getRootProps,
        getInputProps,
        isDragAccept,
        isDragReject,
        isDragActive
    } = useDropzone({ onDrop });

    const style = useMemo(() => ({
        ...baseStyle,
        ...(isDragActive ? focusedStyle : {}),
        ...(isDragAccept ? acceptStyle : {}),
        ...(isDragReject ? rejectStyle : {})
    }), [
        isDragActive,
        isDragAccept,
        isDragReject,
    ]);

    return (<>
        <div {...getRootProps({style})} >
            <input {...getInputProps()} />
            <ViewEvent event={event}/>
        </div>
    </>)
}

function Attach() {
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

    return (<div>
        <DateTimeRangeInput value={range} onChange={onRangeChange}/>
        <br/>{JSON.stringify(range)}
    {eventList && eventList.filter(e => e.status !== "cancelled").map((e: any) =>
        <DroppableViewEvent key={`${e.calendarId}/${e.id}`} event={e}/>
    )}
    </div>);

}

export default Attach;

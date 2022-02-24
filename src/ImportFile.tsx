import React, { useState, useCallback, useMemo } from 'react';

import PapaParse from 'papaparse'

import {CalendarEvent} from './models/types'

import {useDropzone, FileRejection, DropEvent } from 'react-dropzone';

import {parse, ParsedComponents} from 'chrono-node';
import { DateTime } from 'luxon';

const parserOptions = {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (header: string) =>
        header
            .toLowerCase()
            .replace(/\W/g, '')
}

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

const parseDate = (date?: string) => {
    if (!date) return;

    const components: any = parse(date, new Date(), { forwardDate: true })[0]?.start;

    if (!components) { return; }

    let parts = {...components.impliedValues, ...components.knownValues};
    return {
        year: parts.year,
        month: parts.month,
        day: parts.day,
    }
}

const parseTime = (time?: string) => {
    if (!time) return;

   let sanitized = time.trim()
    if (sanitized.match(/^[0-9]{1,2}$/)) {
       sanitized = `${sanitized}:00` 
    } else if (sanitized.match(/^[0-9]{4}$/)) {
       sanitized = sanitized.slice(0, 2) + ":" + sanitized.slice(2);
    }

   const components: any = parse(sanitized, new Date(), {forwardDate: true})[0]?.start;
    if (!components) { return; }

   let parts = {...components.impliedValues, ...components.knownValues};

    return {
        hour: parts.hour,
        minute: parts.minute,
        second: parts.second,
    } 
}

const toGoogleDateTime = (date?: string, time?: string) => {
    const dateParts = parseDate(date);
    const timeParts = parseTime(time);

    if (dateParts && timeParts) {
        return {
            dateTime: DateTime.fromObject({...dateParts, ...timeParts}).toISO()
        };
    } else if (date) {
        return {
            date: DateTime.fromObject({...dateParts, ...timeParts}).toISODate()
        };
    }

    return;
}

const toEvent = (input: any): Partial<CalendarEvent> => {
    const start = toGoogleDateTime(input['startdate'], input['starttime'])
    const end   = toGoogleDateTime(input['enddate'],   input['endtime'])
    return {
        summary: input['subject'] || input['summary'],
        description: input['description'],
        start: start,
        end: end,
    } 
}

function ImportFile() {
    const [events, setEvents] = useState<Array<any>>([]);
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
                const events = data.map(toEvent)
                setEvents(previousEvents => [...previousEvents, ...events]);
            }

            reader.readAsText(file, fileEncoding)
        });
    }, [setEvents]);

    const {
        getRootProps,
        getInputProps,
        isFocused,
        isDragAccept,
        isDragReject,
        isDragActive,
    } = useDropzone({accept: 'text/*', onDrop });

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
        {
            isFocused ?
            <p>Drop the csv files here ...</p> :
            <p>Drag 'n' drop csv files here, or click to select files</p>
        }

        </div>
        { events && (<ul>
            {events.map((e, i) => (<li key={i}>{JSON.stringify(e)}</li>))}
        </ul>)
        }
        </>
    )
}

export default ImportFile;

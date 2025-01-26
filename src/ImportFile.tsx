import React, { useState, useCallback, useMemo } from 'react';

import PapaParse from 'papaparse';

import { CalendarEvent } from './models/types';

import { useDropzone, FileRejection, DropEvent } from 'react-dropzone';

import { parse } from 'chrono-node';
import { DateTime } from 'luxon';

import EventList from './EventList';
import { Link } from 'react-router';

import saveEvents from './google/saveEvents';
import useDefaultCalendar from './lib/useDefaultCalendar';

import { customAlphabet } from 'nanoid';

import { userContext } from './userContext';

/* See https://developers.google.com/calendar/api/v3/reference/events
 * characters allowed in the ID are those used in base32hex encoding, i.e. lowercase letters a-v and digits 0-9, see section 3.1.2 in RFC2938
 * the length of the ID must be between 5 and 1024 characters
 * the ID must be unique per calendar
 */
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuv', 26);

const parserOptions = {
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  transformHeader: (header: string) => header.toLowerCase().replace(/\W/g, ''),
};

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
  transition: 'border .24s ease-in-out',
};

const focusedStyle = {
  borderColor: '#2196f3',
};

const acceptStyle = {
  borderColor: '#00e676',
};

const rejectStyle = {
  borderColor: '#ff1744',
};

const parseDate = (date?: string) => {
  if (!date) return;

  const components: any = parse(date, new Date(), { forwardDate: true })[0]
    ?.start;

  if (!components) {
    return;
  }

  let parts = { ...components.impliedValues, ...components.knownValues };
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
};

const parseTime = (time?: string) => {
  if (!time) return;

  let sanitized = time.toString().trim();
  if (sanitized.match(/^[0-9]{1,2}$/)) {
    sanitized = `${sanitized}:00`;
  } else if (sanitized.match(/^[0-9]{3}$/)) {
    sanitized = sanitized.slice(0, 1) + ':' + sanitized.slice(1);
  } else if (sanitized.match(/^[0-9]{4}$/)) {
    sanitized = sanitized.slice(0, 2) + ':' + sanitized.slice(2);
  }

  const components: any = parse(sanitized, new Date(), { forwardDate: true })[0]
    ?.start;
  if (!components) {
    return;
  }

  let parts = { ...components.impliedValues, ...components.knownValues };

  return {
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
};

const toGoogleDateTime = (
  date?: string,
  time?: string,
): { dateTime: string; ms: number } | undefined => {
  const dateParts = parseDate(date);
  const timeParts = parseTime(time);

  if (dateParts && timeParts) {
    const dateTime = DateTime.fromObject({ ...dateParts, ...timeParts });
    const dateTimeIso = dateTime.toISO();
    return dateTimeIso
      ? {
          dateTime: dateTimeIso,
          ms: dateTime.toMillis(),
        }
      : undefined;
  } else if (dateParts) {
    const date = DateTime.fromObject({ ...dateParts });
    const dateIso = date.toISO();
    return dateIso
      ? {
          dateTime: dateIso,
          ms: date.toMillis(),
        }
      : undefined;
  }

  return;
};

const toEvent = (input: any): Partial<CalendarEvent> => {
  const start = toGoogleDateTime(input['startdate'], input['starttime']);
  const end = toGoogleDateTime(input['enddate'], input['endtime']);
  const u = nanoid();

  return {
    id: u.toString().replaceAll(/-/g, ''),
    summary: input['subject'] || input['summary'],
    description: input['description'],
    location: input['location'],
    start: start,
    end: end,
  };
};

function ImportFile() {
  const defaultCalendar = useDefaultCalendar();
  const user = React.useContext(userContext);

  const [events, setEvents] = useState<Array<Partial<CalendarEvent>>>([]);
  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[], e: DropEvent) => {
      const fileEncoding = 'UTF-8';
      const onError = (error: any) => {
        console.log(onError);
      };
      acceptedFiles.forEach((file) => {
        let reader: FileReader = new FileReader();
        reader.onload = (_event: Event) => {
          const csvData = PapaParse.parse(
            reader.result as string,
            Object.assign(parserOptions, {
              error: onError,
              encoding: fileEncoding,
            }),
          );
          const data = csvData?.data ?? [];
          const newEvents = data.map(toEvent);
          saveEvents(defaultCalendar!, newEvents, '', user).catch(console.log);
          setEvents((previousEvents) => [...previousEvents, ...newEvents]);
        };

        reader.readAsText(file, fileEncoding);
      });
    },
    [setEvents, defaultCalendar],
  );

  const {
    getRootProps,
    getInputProps,
    isDragAccept,
    isDragReject,
    isDragActive,
  } = useDropzone({ accept: { 'text/*': ['.csv', '.tsv'] }, onDrop });

  const style = useMemo(
    () => ({
      ...baseStyle,
      ...(isDragActive ? focusedStyle : {}),
      ...(isDragAccept ? acceptStyle : {}),
      ...(isDragReject ? rejectStyle : {}),
    }),
    [isDragActive, isDragAccept, isDragReject],
  );

  if (!defaultCalendar) {
    return (
      <div>
        Must select default <Link to="/calendars">calendar</Link> before
        importing.
      </div>
    );
  }
  return (
    <>
      <div {...getRootProps({ style })}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>
            Drop to import into <b>{defaultCalendar.summary}</b>
          </p>
        ) : (
          <p>
            Drag 'n' drop csv file(s) to import into{' '}
            <b>{defaultCalendar.summary}</b>, or click to select files
          </p>
        )}
      </div>
      <EventList events={events} />
    </>
  );
}
export default ImportFile;

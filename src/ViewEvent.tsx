import React from 'react';
import { CalendarEvent, StartEnd, isStartEndDate } from './models/types';

import { DateTime } from 'luxon';
import dompurify from 'dompurify';
import { isEmpty } from './lib/utils';

import { Attachment } from './models/types';

function timeOf(value: StartEnd) {
  if ('dateTime' in value)
    return (
      DateTime.fromISO(value.dateTime)?.toLocaleString(DateTime.TIME_SIMPLE) ||
      null
    );
  else return 'all day';
}

function dateOf(value: StartEnd) {
  if ('dateTime' in value) return value.dateTime?.slice(0, 10);
  else return value.date;
}

function minusOneDay(date: string): string {
  return DateTime.fromISO(date).minus({ days: 1 }).toISODate()!;
}

export function ViewStartAndEnd({
  start,
  end,
  showDate = true,
}: {
  start?: StartEnd;
  end?: StartEnd;
  showDate?: boolean;
}) {
  if (start && end) {
    const startDate = dateOf(start);
    const isAllDayEvent = isStartEndDate(start) && isStartEndDate(end);
    const endDate = isAllDayEvent ? minusOneDay(dateOf(end)) : dateOf(end);

    if (startDate === endDate) {
      if (isAllDayEvent) {
        return <>{showDate ? startDate : timeOf(start)}</>;
      } else {
        return (
          <>
            {showDate ? startDate : null} {timeOf(start)} - {timeOf(end)}
          </>
        );
      }
    } else {
      if (isAllDayEvent) {
        return (
          <>
            {showDate ? startDate : null} - {endDate}
          </>
        );
      } else {
        return (
          <>
            {showDate ? startDate : null} {timeOf(start)} - {endDate}{' '}
            {timeOf(end)}
          </>
        );
      }
    }
  } else if (start) {
    return (
      <>
        {showDate ? dateOf(start) : null} {timeOf(start)}
      </>
    );
  } else {
    return null;
  }
}

export const sanitizer = dompurify.sanitize;

export function ViewEventSummary({ event }: { event: Partial<CalendarEvent> }) {
  if (event.description) {
    return (
      <details title={JSON.stringify(event, null, 2)}>
        <summary style={{ cursor: 'pointer', padding: '.5rem 1rem' }}>
          {event.summary}
        </summary>
        <div>
          <i>
            <span
              dangerouslySetInnerHTML={{
                __html: sanitizer(event.description ?? ''),
              }}
            ></span>
          </i>
        </div>
      </details>
    );
  } else {
    return <div>{event.summary}</div>;
  }
}

export function ViewEventAttachments({
  attachments,
}: {
  attachments?: Attachment[];
}) {
  if (!attachments || isEmpty(attachments)) return null;

  return (
    <>
      {attachments.map((a) => {
        const image = a.iconLink ? (
          <img
            style={{ display: 'inline-block', verticalAlign: 'bottom' }}
            width={16}
            height={16}
            src={'http://example.com/nothing.png'}
            onError={({ currentTarget }) => {
              currentTarget.onerror = null; // prevents looping
              currentTarget.src = '/unknown-file-16x16.png';
            }}
          />
        ) : (
          <img
            style={{ display: 'inline-block', verticalAlign: 'bottom' }}
            width={16}
            height={16}
            src="/unknown-file-16x16.png"
          />
        );
        return (
          <span key={a.fileUrl}>
            {image}
            <a href={a.fileUrl}>{isEmpty(a.title) ? '(no title)' : a.title}</a>
          </span>
        );
      })}
    </>
  );
}

function ViewEvent({ event }: { event: Partial<CalendarEvent> }) {
  if (event.description || !isEmpty(event.attachments)) {
    return (
      <details style={{ border: '2px dotted #bbb' }}>
        <summary style={{ cursor: 'pointer', padding: '.5rem 1rem' }}>
          <ViewStartAndEnd start={event.start} end={event.end} />{' '}
          <b style={{ display: 'inline' }}>{event.summary}</b>
        </summary>
        <div style={{ marginTop: 0, padding: '1rem' }}>
          <i>
            <span
              dangerouslySetInnerHTML={{
                __html: sanitizer(event.description ?? ''),
              }}
            ></span>
          </i>
        </div>
        <ViewEventAttachments attachments={event.attachments} />
      </details>
    );
  } else {
    return (
      <div
        style={{ border: '2px dotted #bbb, padding: ', padding: '.5rem 1rem' }}
      >
        <ViewStartAndEnd start={event.start} end={event.end} />{' '}
        <b style={{ display: 'inline' }}>{event.summary}</b>
      </div>
    );
  }
}

export default ViewEvent;

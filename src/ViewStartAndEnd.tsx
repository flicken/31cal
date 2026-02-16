import React from 'react';
import { StartEnd, isStartEndDate } from './models/types';
import { dateOf, minusOneDay, timeOf } from './ViewEvent';


export function ViewStartAndEnd({
  start, end, showDate = true,
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

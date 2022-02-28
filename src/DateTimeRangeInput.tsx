import React, {useState} from 'react';

import {db} from './models/db';
import { useLiveQuery } from "dexie-react-hooks";

import useDefaultCalendar from './lib/useDefaultCalendar'
import ViewEvent from './ViewEvent'

import { DateTime, DateTimeUnit } from 'luxon';
import {parse, ParsedComponents, Component} from 'chrono-node';
import {pick, isEmpty} from "lodash"

export type DateTimeRange = {
    start?: DateTime;
    end?: DateTime;
}

type Props = {
    value: DateTimeRange;
    onChange: (arg0: DateTimeRange) => void
}

const dateTimeFromAll = (components: any) => {
    if (!components) return undefined;
    const fields = pick({...components.knownValues, ...components.impliedValues}, [
        "year", "month", "day", "ordinal", "weekYear", "weekNumber", "weekday", "hour", "minute", "second", "millisecond"
    ])
    const date = DateTime.fromObject(fields);
    console.log("month", date.diffNow().as("months"))
    if (!components.isCertain("year") && date.diffNow().as("months") < -2) {
          fields.year += 1;
          return DateTime.fromObject(fields)
    }

    return date;
}

const COMPONENTS = [
      "millisecond"
        , "second"
        , "minute"
        , "hour"
        //, "weekday"
        , "day"
        , "month"
    , "year"
]

function roundTo(c: ParsedComponents, text: string) {
    if (c.isCertain("second")) {
        return "second"
    } else if (c.isCertain("minute")) {
        return "minute"
    } else if (c.isCertain("hour")) {
        return "hour"
    } else if (c.isCertain("day") || c.isCertain("weekday")) {
        return "day"
    } else if (c.isCertain("month")) {
        return "month"
    } else if (c.isCertain("year")) {
        return "year"
    } else if (text.includes("week")) {
        return "week"
    }
}

const dateTimeFrom = (start: boolean, components: ParsedComponents | undefined, text: string) => {
    if (!components) return undefined;

    const date = dateTimeFromAll(components)
    const roundToComponent = roundTo(components, text);
    console.log("round to component", roundToComponent, components)
    if (roundToComponent) {
        return start ? date?.startOf(roundToComponent as DateTimeUnit) : date?.endOf(roundToComponent as DateTimeUnit)
    } else {
        return date;
    }
}

export default function DateTimeRangeInput({value, onChange}: Props) {
    const parseDateRange = React.useCallback((e) => {
        const text = e.target.value;
        if (isEmpty(text)) {
            onChange({});
        }
        let datetimes = parse(text, new Date(), { forwardDate: true })
        console.log("datetimes", datetimes)
        if (datetimes[0]) {
           const start = dateTimeFrom(true, datetimes[0].start, text)
           const end = dateTimeFrom(false, datetimes[0].end || datetimes[1]?.start || datetimes[0].start, text)

            if (start && end && start.diff(end).valueOf() > 0) {
                onChange({ start: end, end: start})
            } else {
                onChange({start, end})
            }
        }
    }, [])
    return <><input type="text" placeholder="next week" onChange={parseDateRange} />
        <br/>{JSON.stringify(value)}
    </>; 
}

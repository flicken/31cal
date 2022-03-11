import React, {useCallback, useEffect, useState} from 'react';

import {db} from './models/db';
import { useLiveQuery } from "dexie-react-hooks";

import useDefaultCalendar from './lib/useDefaultCalendar'
import {useScheduleList, eventSchedules} from './lib/useScheduleList'
import {useSetting} from "./lib/settings";
import ViewEvent from './ViewEvent'
import DateTimeRangeInput, {DateTimeRange} from "./DateTimeRangeInput"

import { DateTime } from 'luxon';
import _ from 'lodash';

import Select from 'react-select'

type SelectValue = {
    label: string;
    value: string;
}

function SelectSchedule() {
    const [state, setState] = useState<SelectValue | undefined>(undefined);
    const {list} = useScheduleList();
    const [selectedSchedules, setSelectedSchedules] = useSetting("selectedSchedules")

    useEffect(() => {
        const s = selectedSchedules && selectedSchedules[0]
        if (s) {
            const newState = {
                value: s,
                label: s,
            }
            setState(newState)
        }
    }, [selectedSchedules]);

    const onChange = useCallback((e) => {
        setState(e)
        setSelectedSchedules(e ? [e.value] : [])
    }, []);

    return <Select
               isClearable={true}
               onChange={onChange}
               value={state}
               isLoading={!list || !selectedSchedules}
               options={list?.map(s => ({value: s, label: s} ))} />
 }

function Schedule() {
    const [selectedSchedules] = useSetting('selectedSchedules')
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
        if (_.isEmpty(selectedSchedules)) {
            return db.events.where("id").equals("nothing").toArray()
        } else {
            return db.events.where("_schedules").anyOf(selectedSchedules).toArray().then(events => {
                return events.filter(e => {
                   return start.toMillis() <= e.start.ms && end.toMillis() >= e.end.ms;
                }
                )
            })
        }
    }, [defaultCalendar, range, start, end, selectedSchedules]);

    if (!defaultCalendar || !eventList) {
        return <div>Loading...</div>
    }

    return (<div>
        <div>Schedule: <SelectSchedule/></div>
        <DateTimeRangeInput value={range} onChange={onRangeChange}/>
        <br/>{JSON.stringify(range)}
    {eventList && eventList.filter(e => e.status !== "cancelled").map((e: any) =>
        <ViewEvent key={`${e.calendarId}/${e.id}`} event={e}/>
    )}
    </div>);
}

export default Schedule;

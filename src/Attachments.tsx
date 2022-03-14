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

function Attachments() {
    const allEvents = useLiveQuery(() => db.events.toArray()
    .then(evts => _.sortBy(evts, e => e.start.ms)));

let eventList = allEvents
  if (!eventList || !allEvents) {
    return <div>Loading...</div>
  }

    const eventsWithAttachments = allEvents.filter(e => e.attachments)
    const attachments = eventsWithAttachments.flatMap(e => e.attachments);
    // 
    return (<div>
        {attachments.map(a => {
            return (<div style={{width: "50vw", float: "right"}}><h1>{a.title}</h1>
                <iframe style={{ width: "50vw", height: "50vw"}} allowfullscreen="true"

                        src={"https://docs.google.com/feeds/download/documents/export/Export?id=1UhMbbccLB2yWGHda2kBZtayntpvUBPYJsF8S_WHDq6E&exportFormat=html" ?? a.fileUrl.replaceAll("view", "preview")}
                />
                <hr/></div>)
        })}
    </div>)
}

export default Attachments;

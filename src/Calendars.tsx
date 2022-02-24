import React from 'react';

import {Calendar} from './models/types'
import {db} from './models/db';
import { useLiveQuery } from "dexie-react-hooks";

import useDefaultCalendar from './lib/useDefaultCalendar'

const isDefault = (id: string, defaultId?: string) => {
    return id === defaultId ? {fontWeight: "bold"} : null
}

function Calendars() {
    const calList = useLiveQuery(() => db.calendars.orderBy("summary").toArray());
    const defaultCalendar = useDefaultCalendar();

    const onClick = (c: Calendar) => {
        db.settings.put({id: "calendarDefault", value: c.id})
    }

    return (<div>
    {calList && calList.filter((c: any) => c.selected).map((c: any) =>
        <div key = {c.id}
             style={{backgroundColor: c.backgroundColor, color: c.foregroundColor, ...isDefault(c.id, defaultCalendar?.id)}}
             onClick={() => {onClick(c)}}>
            {c.summary
            }</div>
    )}
    </div>);

}

export default Calendars;

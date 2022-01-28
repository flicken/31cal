import React from 'react';

import {db} from './models/db';
import { useLiveQuery } from "dexie-react-hooks";


function Calendars() {
    const calList = useLiveQuery(() => db.calendars.orderBy("summary").toArray());

    return (<div>
    {calList && calList.filter((c: any) => c.selected).map((c: any) =>
        <div key = {c.id} style={{backgroundColor: c.backgroundColor, color: c.foregroundColor}}>{c.summary}</div>
    )}
    </div>);

}

export default Calendars;

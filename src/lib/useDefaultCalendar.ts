import {db} from '../models/db';
import { useLiveQuery } from "dexie-react-hooks";

export default function useDefaultCalendar() {
    const maybeDefaultCalendarId = useLiveQuery(() => db.settings.where({id: "calendarDefault"}).first());
    return useLiveQuery(() => db.calendars.where({id: maybeDefaultCalendarId?.value || ""}).first(), [maybeDefaultCalendarId])
}

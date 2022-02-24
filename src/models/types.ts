
export type Calendar = {
    id: string;
    summary: string;
    selected: boolean;
}

export type StartEndDate = {
    date: string;
};

export type StartEndDateTime = {
    dateTime: string;
    timeZone?: string;
}

export type StartEnd = StartEndDate | StartEndDateTime;

export type CalendarEvent = {
    id: string;
    calendarId: string;
    summary?: string;
    description?: string;
    location?: string;
    start: StartEnd;
    end?: StartEnd;
}

export type UpdateState = {
    account: string;
    resource: string;
    nextSyncToken?: string;
    nextPageToken?: string;
    etag?: string;
    updatedAt: number;
}


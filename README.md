Agenda: 31 different ways to calendar

# Ways
1. **View** all events on one page (easy to search with Ctrl-F)
  * TODO: Make prettier
2. DONE: **Create** bulk events with same / similar data (e.g. soccer practices + games)
3. TODO: **Filter** events in a "schedule" (e.g. from club, sports, choir)
4. TODO: **Update** (or delete) all (most?) events within a time period (e.g. during school vacation)
5. TODO: **View** multi-stream "paper calendar"
6. TODO: **Filter** events since [datetime], possibly via natural language
7. TODO: **Filter** events by keyword
7. TODO: **View** or **Filter** conflicts for events / schedule
8. TODO: **Add** image / document to events / schedule (e.g. handout of schedule from club)
9. TODO: Command Line UI to create, update, view, filter (by schedule, keyword, datetime...), etc (see https://github.com/insanum/gcalcli )
10. TODO: Spreadsheet UI (see sheets2gcal.com for alternative)
11. TODO: **View** details including description (in Google calendar can only see summary)
12. TODO: **View/Update** free-form / Word-document style.  (see https://legendapp.com/ - formerly Moo.do, especially the date entry).  See https://www.slatejs.org/ for potential tech to use
13. TODO: **View/Update** Mail Inbox style, for deleting multiple events.
14. TODO: **View** Non chronological.  Group events together that repeat or are in the same schedule.  Still needs more thought about how this could work.
15. TODO: **Create/Edit** events via "annotations" of an image / document
16. DONE: **Add** events via drag/drop CSV/TSV using a sub-set of [standard Google columns](https://support.google.com/calendar/answer/37118?hl=en&co=GENIE.Platform%3DDesktop#zippy=%2Ccreate-or-edit-a-csv-file) (Subject, Start Date, Start Time, End Date, End Time, Description, Location)
17. TODO: More options for importing events support other standard columns (All Day Event and Private) as well as all [API field names](https://developers.google.com/calendar/api/v3/reference/events) (attendees, colorId, extendedProperties.private, extendedProperties.shared, location, source.title, source.url, summary, visibility).
18. TODO: Rich editor, like https://www.slatejs.org/ or https://quilljs.com/ for editing

# Shortcomings
1. Data stored unencrypted in IndexedDB, so others on computer can read / write with browser tools.  
Perhaps encrypt and load into in-memory database?  Note: legendapp does not encrypt IndexedDB contents.

# Potential tech
1. https://react-day-picker.js.org/ - used by LegendApp for date input, their 

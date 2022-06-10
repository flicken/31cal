Agenda: 31 different ways to calendar

# Ways

1. **View** all events on one page (easy to search with Ctrl-F)

- TODO: Make prettier

2. DONE: **Create** bulk events with same / similar data (e.g. soccer practices + games)
3. TODO: **Filter** events in a "schedule" (e.g. from club, sports, choir)
4. TODO: **Update** (or delete) all (most?) events within a time period (e.g. during school vacation)
5. TODO: **View** multi-stream "paper calendar"
6. DONE: **Filter** events since [datetime], possibly via natural language
7. TODO: **Filter** events by keyword
8. TODO: **View** or **Filter** conflicts for events / schedule
9. TODO: **Add** image / document to events / schedule (e.g. handout of schedule from club)
10. TODO: Command Line UI to create, update, view, filter (by schedule, keyword, datetime...), etc (see https://github.com/insanum/gcalcli )
11. TODO: Spreadsheet UI (see sheets2gcal.com for alternative)
12. TODO: **View** details including description (in Google calendar can only see summary)
13. TODO: **View/Update** free-form / Word-document style. (see https://legendapp.com/ - formerly Moo.do, especially the date entry). See https://www.slatejs.org/ for potential tech to use
14. TODO: **View/Update** Mail Inbox style, for deleting multiple events.
15. TODO: **View** Non chronological. Group events together that repeat or are in the same schedule. Still needs more thought about how this could work.
16. TODO: **Create/Edit** events via "annotations" of an image / document
17. DONE: **Add** events via drag/drop CSV/TSV using a sub-set of [standard Google columns](https://support.google.com/calendar/answer/37118?hl=en&co=GENIE.Platform%3DDesktop#zippy=%2Ccreate-or-edit-a-csv-file) (Subject, Start Date, Start Time, End Date, End Time, Description, Location)
18. TODO: More options for importing events support other standard columns (All Day Event and Private) as well as all [API field names](https://developers.google.com/calendar/api/v3/reference/events) (attendees, colorId, extendedProperties.private, extendedProperties.shared, location, source.title, source.url, summary, visibility).
19. TODO: Rich editor, like https://www.slatejs.org/ or https://quilljs.com/ for editing
20. DONE: **View** attachments on events
21. TODO: **Add/Update** attachments on events

# Shortcomings

1. Data stored unencrypted in IndexedDB, so others on computer can read / write with browser tools.  
   Perhaps encrypt and load into in-memory database? Note: legendapp does not encrypt IndexedDB contents.

# Inspiration - Search
1. Slack omni-search
2. Discord search: drop-down with search options
3. Gmail search input box

# Potential tech

1. https://react-day-picker.js.org/ - used by LegendApp for date input, their
2. https://fusejs.io/ - fuzzy search
3. https://github.com/timc1/kbar - command bar
4. https://bit.dev/teambit/explorer/command-bar - command bar
5. https://github.com/replit/clui - command line UI for Javascript
6. https://github.com/asabaylus/react-command-palette - command bar
7. https://github.com/github/time-elements - time display - relative e.g. 2d
8. https://github.com/peterbraden/ical.js - ical - for imparting

# Potential databases

Comparison: https://github.com/pubkey/client-side-databaseS

1. https://github.com/Nozbe/WatermelonDB - db - offline first, backed by pluggable backend
2. https://github.com/tonsky/datascript - db - in-memory 
3. https://rxdb.info/
4. https://github.com/techfort/LokiJS

# 31cal — Agenda: 31 different ways to calendar

Alternative views and bulk-editing tools for Google Calendar. 31cal runs
entirely in the browser: it syncs your calendars into IndexedDB and works from
that local copy, so views are fast and keep working offline after the first
sync.

## Views and tools

| Route          | What it does                                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/events`      | All events on one page with descriptions and attachments (easy to search with Ctrl-F)                                                                                             |
| `/paper`       | Multi-column "paper calendar": one row per day, one column per keyword filter                                                                                                     |
| `/table`       | Spreadsheet-style table grouped by day, with multi-select delete                                                                                                                  |
| `/schedule`    | Events tagged with a 31cal schedule (shared extended property `31cal/<name>`)                                                                                                     |
| `/bulk`        | Create many events at once from natural-language lines ("Saturday 3pm rehearsal")                                                                                                 |
| `/import`      | Import a CSV (Google Calendar columns) with a preview before anything is saved                                                                                                    |
| `/pipeline`    | **Experimental.** Bulk edit in one place: filter (kept in the URL), pick events, choose Rename / Delete / Copy / Edit JSON, review a before → after preview, then run (with Undo) |
| `/mod`         | Find events in a period, then rename (search/replace), delete, or apply JSON changes to all of them                                                                               |
| `/copy`        | Copy events from one calendar to another, with an optional prefix; already-copied events are skipped                                                                              |
| `/attachments` | View the attachments of events in range (Drive/Docs previews)                                                                                                                     |
| `/status`      | Which calendars are synced, event counts and sync errors                                                                                                                          |

The search bar at the top accepts ranges such as `now to end of next month`,
`march`, `next week`, `updated since yesterday`, or the structured form
`start:2026-01-01 end-of:2026-03 updated-since:2026-01-01`.

## Getting started

Requirements: Node 26 LTS (see `.node-version`) and pnpm 12 (pinned in
`package.json` → `packageManager`).

```bash
npm install -g pnpm@12.21.0
pnpm install
```

Create `.env.local` with a Google OAuth **web** client id whose authorized
JavaScript origins include `http://localhost:3000`:

```
VITE_GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
```

```bash
pnpm start   # dev server on http://localhost:3000
pnpm check   # type-check, lint, test and build (same as CI)
```

### Permissions

31cal signs in with read-only Calendar scopes. The first time you save,
change or delete something it asks Google for "View and edit events"
(`calendar.events`) in a second popup. Signing out revokes the token and
deletes the local copy of your calendars from the browser.

## Deployment

Deployed on Cloudflare Pages (v3 build image):

- Build command `pnpm build`, output directory `build`.
- Environment variable `PNPM_VERSION=12.21.0` (Pages does not read
  `packageManager`). Node comes from `.node-version`.
- `public/_headers` sets security and caching headers.
- Pages serves `index.html` for unknown paths (SPA routing) and
  `/legal/privacy` from `legal/privacy.html` without extra configuration.

## Security model

- All data stays in your browser; there is no 31cal server.
- The cache in IndexedDB is tied to the signed-in Google account and is
  wiped on sign-out or when a different account signs in.
- Event descriptions (which anyone who invites you controls) are sanitized
  with DOMPurify; forms, inputs, images and styles are removed. Only
  `https://drive.google.com` / `docs.google.com` attachments are embedded,
  in sandboxed iframes.
- A Content-Security-Policy and other security headers are set in
  `public/_headers`.
- Dependencies must be at least 7 days old and install scripts are disabled
  (`pnpm-workspace.yaml`, `renovate.json`).

## Roadmap

Done ideas from the original list have moved into the table above. Still open:

**Viewing**

- Conflicts: view or filter overlapping events across calendars/schedules.
- Non-chronological view: group repeating events or events in the same
  schedule together.
- Make the views prettier; dark mode; print stylesheet for Paper.
- Keyboard shortcuts (route `shortcut` fields exist but aren't bound yet).

**Schedules**

- UI to add/remove events to/from a schedule (the Schedule view can only
  filter by schedules set elsewhere).

**Editing**

- Free-form / document-style editing of a list of events (cf. LegendApp's
  date entry); a rich-text editor for descriptions (Slate, Quill, Lexical).
- Add/update attachments on existing events (BulkEntry can attach one URL to
  new events).
- Undo for bulk changes (store the previous values of patched/deleted events).
- Create/edit events by annotating an image or document (e.g. a club's
  printed schedule).

**Import/export**

- More import columns: Private, plus API field names (attendees, colorId,
  extendedProperties.*, source.title/url, visibility).
- iCal (`.ics`) import, and CSV/ICS export of the current view.

**Other front ends**

- Command-line UI (cf. [gcalcli](https://github.com/insanum/gcalcli)).
- Command palette (kbar or similar) for navigation and search.

## Known limitations

- The local cache is not encrypted at rest, so anyone with access to the
  browser profile can read it while you are signed in. Encrypting it (e.g. a
  key held only in memory) would need a re-sync after every page load; not
  worth it yet.
- The OAuth access token is kept in localStorage so a reload doesn't need a
  new popup. The CSP limits what could read it.
- Sync fetches each calendar's full history (expanded recurring instances).
  Very large calendars make the first sync slow.
- Lists are not virtualized; very large date ranges render slowly.

## Inspiration

- Search: Slack omni-search, Discord's drop-down search options, Gmail's
  search box.
- Editing: [LegendApp](https://legendapp.com/) (formerly Moo.do),
  [sheets2gcal](https://sheets2gcal.com).

## Potential tech

- [react-day-picker](https://react-day-picker.js.org/) — date input (used by LegendApp)
- [Fuse.js](https://fusejs.io/) — fuzzy search
- [kbar](https://github.com/timc1/kbar),
  [react-command-palette](https://github.com/asabaylus/react-command-palette) — command bar
- [clui](https://github.com/replit/clui) — command-line UI in JavaScript
- [ical.js](https://github.com/kewisch/ical.js) — iCal parsing for import/export
- `Intl.RelativeTimeFormat` / Temporal — relative times without extra libraries

## Potential databases

Dexie (IndexedDB) works well today. If sync or querying outgrows it:

- [localfirstweb.dev](https://localfirstweb.dev/) — list of local-first libraries
- [Client-side database comparison](https://github.com/pubkey/client-side-databases)
- [RxDB](https://rxdb.info/), [TinyBase](https://tinybase.org/) (pluggable persisters incl. SQLite WASM),
  [WatermelonDB](https://github.com/Nozbe/WatermelonDB), [SyncedStore](https://syncedstore.org/docs/),
  [DataScript](https://github.com/tonsky/datascript) (in-memory)

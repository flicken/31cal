# 31cal — CLAUDE.md

## What this project is

**31cal** ("Agenda: 31 different ways to calendar") is a React/TypeScript SPA that provides alternative views and editing tools for Google Calendar. It connects to the Google Calendar API via OAuth and caches all data locally in IndexedDB (via Dexie), making it function offline after the first sync.

## Tech stack

| Concern | Library |
|---|---|
| Framework | React 19 |
| Build tool | Vite 7 |
| Router | wouter |
| Local DB | Dexie 4 (IndexedDB) |
| Date/time | Luxon + chrono-node (NLP date parsing) |
| Tables | @tanstack/react-table |
| Google OAuth | @react-oauth/google + gapi (loaded at runtime) |
| CSV import | papaparse |
| Toasts | react-toastify |
| Syntax highlighting | prismjs + codejar |
| Testing | vitest |
| Linting/formatting | Prettier (via lint-staged + husky pre-commit) |
| Package manager | **yarn** (v4, Berry) |

## Commands

```bash
yarn start        # dev server on port 3000 (strict)
yarn build        # tsc + vite build → build/
yarn test         # vitest run
yarn serve        # preview production build
yarn tsc          # type-check only
```

## Environment variables

Requires a `.env.local` file with:
```
VITE_GOOGLE_CLIENT_ID=<google-oauth-client-id>
```

`CF_PAGES_URL` is used as the Vite `base` URL when deploying to Cloudflare Pages.

## Project layout

```
src/
  App.tsx                   # Root component — context providers
  Nav.tsx                   # Layout, routes (wouter), TopBar, HomeNav
  config.ts                 # VITE env vars
  index.tsx                 # Entry point

  models/
    types.ts                # Shared TypeScript types (CalendarEvent, Calendar, etc.)
    db.ts                   # Dexie DB class + singleton `db`; exposed as globalThis.db

  google/
    fetchList.ts            # Generic paginated Google API fetcher with sync token support
    useClientToFetch.ts     # Hook: polls Google API on interval, auto-selects calendars
    ensureClient.ts         # Loads gapi client
    saveEvents.ts           # Write events to Google API
    patchEvents.ts          # Patch events
    deleteEvents.ts         # Delete events

  lib/
    hooks.ts                # Dexie useLiveQuery hooks (useEvents, useCalendars, etc.)
    filters.ts              # FilterValues type + filterForFilters()
    FilterStateContext.tsx  # Global filter state context
    dispatcher.ts           # Custom DOM event bus (on/off/once/trigger)
    parseEvent.ts           # chrono-node NLP → Google Calendar StartEnd objects
    settings.tsx            # SettingsProvider + useSetting hook (DB-backed)
    useScheduleList.ts      # Schedule-related logic
    utils.ts                # General helpers

  useGoogleButton.tsx       # OAuth login flow, token refresh, read/write scopes
  authContext.ts            # hasWriteAccess / requestWriteAccess context

  # Feature views (several are React.lazy):
  BulkEntry.tsx             # Bulk create events with NLP date entry
  CopyFrom.tsx              # Copy events from one calendar to another
  Events.tsx                # Event list with filters
  ImportFile.tsx            # Drag-and-drop CSV import
  ModMany.tsx               # Bulk modify/delete events
  Paper.tsx                 # Multi-column paper calendar view
  Schedule.tsx              # Schedule/agenda view
  Table.tsx                 # Spreadsheet table view
  Attachments.tsx           # View file attachments on events
  CalendarsStatus.tsx       # Sync status per calendar
```

## Key architecture patterns

### Data layer (Dexie / IndexedDB)
- Single `DB` class in `src/models/db.ts` with versioned schema migrations.
- Four tables: `calendars`, `events`, `updateState`, `settings`.
- Events are keyed on `[id+calendarId]` (composite) and indexed on `calendarId`, `dirty`, `[calendarId+start.ms]`, `[start.ms+end.ms]`, `*_schedules` (multi-entry).
- `start.ms` / `end.ms` are milliseconds added at fetch time for efficient range queries.
- `db` is also exposed as `globalThis.db` for debugging in browser console.

### Sync flow
1. `useClientToFetch` (called from `StatusBar` in `Nav.tsx`) polls on a 5-minute interval.
2. It fetches `calendarList` first; if no `selectedCalendars` setting exists, auto-selects primary + `selected` calendars.
3. Then fetches events for each selected calendar via `fetchList`, which handles pagination (`nextPageToken`) and incremental sync (`nextSyncToken`). A 410 response triggers a full re-sync.
4. Sync state per `[account, resource]` is stored in `updateState` table.

### Contexts
| Context | Purpose |
|---|---|
| `userContext` | Google user info (email, name, picture) |
| `authContext` | `hasWriteAccess` + `requestWriteAccess()` |
| `googleButtonContext` | The rendered login/logout button element |
| `FilterStateContext` | Global filter state shared across views |
| `SettingsContext` | Key-value settings backed by Dexie |

### Custom event bus
`src/lib/dispatcher.ts` wraps native DOM `CustomEvent` for decoupled communication between modules (e.g. `fetchList` fires `fetchList:update`).

### NLP date parsing
`src/lib/parseEvent.ts` uses `chrono-node` to parse natural-language dates (e.g. "Saturday 3pm Soccer practice") into Google Calendar `StartEnd` objects. The previous event in context is used as the reference date for relative parsing.

### Routing
`wouter` with `Switch`/`Route`. Routes are defined in `ROUTES` array in `Nav.tsx`. Several routes use `React.lazy` for code splitting: `ImportFile`, `ModMany`, `Schedule`, `Table`.

### Write access
Write operations (save/patch/delete) require `EVENTS_READWRITE` scope. The app starts with read-only scope and calls `requestWriteAccess()` (which triggers a new OAuth popup) before any write.

## Testing
- Test files live next to source: `src/lib/parseEvent.test.ts`, `src/lib/searchTextParser.test.ts`.
- Run with `yarn test` (vitest).

## Build + Deployment
- Builds to `build/` directory.
- `vercel.json` Vercel
- `renovate.json` automated dependency updates.
- `public/_headers` — Cloudflare Pages
- `public/_redirects` — Cloudflare Pages

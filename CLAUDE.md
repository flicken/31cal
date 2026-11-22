# 31cal — CLAUDE.md

## What this project is

**31cal** ("Agenda: 31 different ways to calendar") is a React/TypeScript SPA that provides alternative views and editing tools for Google Calendar. It connects to the Google Calendar API via OAuth and caches all data locally in IndexedDB (via Dexie), making it function offline after the first sync.

## Tech stack

| Concern             | Library                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Framework           | React 19                                                                                 |
| Build tool          | Vite 8                                                                                   |
| Router              | wouter                                                                                   |
| Local DB            | Dexie 4 (IndexedDB)                                                                      |
| Date/time           | Luxon + chrono-node (NLP date parsing)                                                   |
| Tables              | @tanstack/react-table                                                                    |
| Google OAuth        | @react-oauth/google + gapi (loaded at runtime)                                           |
| CSV import          | papaparse                                                                                |
| Toasts              | react-toastify                                                                           |
| Syntax highlighting | prismjs + codejar                                                                        |
| Testing             | vitest + happy-dom + fake-indexeddb                                                      |
| Linting/formatting  | oxlint (typescript-eslint can't run on TS 7) + Prettier (lint-staged + husky pre-commit) |
| Package manager     | **yarn** (v4, Berry) via Corepack                                                        |
| TypeScript          | 7 (native `tsc`, no JS compiler API)                                                     |

## Commands

```bash
yarn start        # dev server on port 3000 (strict)
yarn build        # tsc + vite build → build/
yarn test         # vitest run
yarn serve        # preview production build
yarn tsc          # type-check only
yarn lint         # oxlint
yarn check        # tsc + lint + test + build (what CI runs)
```

## Dependency security

- 7 days after release
- no scripts on install

## Environment variables

Requires a `.env.local` file with:

```
VITE_GOOGLE_CLIENT_ID=<google-oauth-client-id>
```

Vite `base` is always `/` (do not use `CF_PAGES_URL`, it is a full per-deploy origin).

## Project layout

```
src/
  App.tsx                   # Root component — context providers
  Nav.tsx                   # Layout, routes (wouter), TopBar, HomeNav
  config.ts                 # VITE env vars
  index.tsx                 # Entry point

  models/
    types.ts                # Shared TypeScript types (CalendarEvent, Calendar, etc.)
    db.ts                   # Dexie DB class, singleton `db`, clearLocalData()

  google/
    sync.ts                 # syncResource(): paged incremental sync, 410 purge, tombstones, single-flight
    useSync.ts              # Hook: polls on interval, auto-selects calendars, marks unselected disabled
    writes.tsx              # saveEvents/patchEvents/deleteEvents via runBatch (retry, progress toast, results)
    googleErrors.ts         # callGoogle(): retry/backoff; auth errors fire AUTH_EXPIRED_EVENT
    ensureClient.ts         # Loads gapi client

  lib/
    hooks.ts                # Dexie useLiveQuery hooks (useEvents, useCalendars, etc.)
    filters.ts              # FilterValues type + filterForFilters()
    FilterStateContext.tsx  # Global filter state context
    dispatcher.ts           # Custom DOM event bus (on/off/trigger)
    events.ts               # keyFor, eventDays (day bucketing), dayOfWeek
    importCsv.ts            # CSV → events with per-row errors, deterministic ids
    sanitize.ts             # DOMPurify profile for event descriptions
    regex.ts                # safeRegExp for user-entered patterns
    useEventSelection.ts    # Shared ModMany/CopyFrom matching + checkbox selection
    log.ts                  # debug(): console.log in dev only
    parseEvent.ts           # chrono-node NLP → Google Calendar StartEnd objects
    settings.tsx            # SettingsProvider + useSetting hook (DB-backed)
    useScheduleList.ts      # Schedule-related logic
    utils.ts                # General helpers

  useGoogleButton.tsx       # OAuth login flow, token refresh, read/write scopes
  authContext.ts            # isLoggedIn / hasWriteAccess / ensureWriteAccess context

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
- Events are keyed on `[id+calendarId]` (composite) and indexed on `calendarId`, `[calendarId+start.ms]`, `[start.ms+end.ms]`, `*_schedules` (multi-entry).
- `start.ms` / `end.ms` are milliseconds added at fetch time for efficient range queries.
- `db` is exposed as `globalThis.db` in dev builds only.
- The cache belongs to one Google account (`31cal:dataOwner` in localStorage); `clearLocalData()` runs on sign-out and on account change.

### Sync flow

1. `useSync` (called from `StatusBar` in `Nav.tsx`) polls on a 5-minute interval and when the calendar selection changes.
2. It syncs `calendarList` first (removed calendars are deleted with their events); if no `selectedCalendars` setting exists, auto-selects primary + `selected` calendars.
3. Then syncs events for each selected calendar via `syncResource`: pages are stored as they arrive, the sync token is saved after the last page, a 410 triggers a full sync that purges rows Google no longer returns, and cancelled instances without start/end update the existing row.
4. Sync state per `[account, resource]` is stored in `updateState`. Errors are recorded there; 401s (and scope 403s) fire `AUTH_EXPIRED_EVENT` so `useGoogleButton` re-authenticates.

### Contexts

| Context               | Purpose                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `userContext`         | Google user info (email, name, picture)                          |
| `authContext`         | `isLoggedIn`, `hasWriteAccess`, `ensureWriteAccess()`, `login()` |
| `googleButtonContext` | The rendered login/logout button element                         |
| `FilterStateContext`  | Global filter state shared across views                          |
| `SettingsContext`     | Key-value settings backed by Dexie                               |

### Custom event bus

`src/lib/dispatcher.ts` wraps native DOM `CustomEvent` for decoupled communication between modules (e.g. `googleErrors` fires `AUTH_EXPIRED_EVENT`).

### NLP date parsing

`src/lib/parseEvent.ts` uses `chrono-node` to parse natural-language dates (e.g. "Saturday 3pm Soccer practice") into Google Calendar `StartEnd` objects. The previous event in context is used as the reference date for relative parsing.

### Routing

`wouter` with `Switch`/`Route`. Routes are defined in `ROUTES` array in `Nav.tsx`. Several routes use `React.lazy` for code splitting: `ImportFile`, `ModMany`, `Schedule`, `Table`.

### Write access

Write operations (save/patch/delete) require `EVENTS_READWRITE` scope. The app starts with read-only scope; every write starts with `if (!(await ensureWriteAccess())) return;` called directly from the click handler (so the popup isn't blocked). It resolves false if the user declines or closes the popup. All writes go through `google/writes.tsx`; destructive bulk actions confirm first.

## Testing

- Test files live next to source (`*.test.ts`). Sync tests use `fake-indexeddb` and inject a fake Google API with `setCalendarApiProvider()`.
- Run with `yarn test` (vitest, happy-dom). Date logic should pass in any `TZ` (try `TZ=America/Los_Angeles yarn test`).

## Build + Deployment

- Deployed on Cloudflare Pages; builds to `build/` directory.
- `.github/workflows/ci.yml` runs tsc, lint, test, build.
- `renovate.json` automated dependency updates.
- `public/_headers` — Cloudflare Pages (CSP and security headers)
- `public/_redirects` — Cloudflare Pages

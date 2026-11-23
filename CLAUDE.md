# 31cal — CLAUDE.md

## What this project is

**31cal** ("Agenda: 31 different ways to calendar") is a React/TypeScript SPA that provides alternative views and editing tools for Google Calendar. It connects to the Google Calendar API via OAuth and caches all data locally in IndexedDB (via Dexie), making it function offline after the first sync.

## Tech stack

| Concern            | Library                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Framework          | React 19                                                                                 |
| Build tool         | Vite 8                                                                                   |
| Router             | wouter                                                                                   |
| Local DB           | Dexie 4 (IndexedDB)                                                                      |
| Date/time          | Luxon + chrono-node (NLP date parsing)                                                   |
| Google OAuth / API | @react-oauth/google (GIS token client); Calendar REST via `fetch` (no gapi)              |
| CSV import         | papaparse                                                                                |
| Toasts             | react-toastify (`/unstyled` entry + its CSS file; no runtime `<style>`)                  |
| Testing            | vitest + happy-dom + fake-indexeddb                                                      |
| Linting/formatting | oxlint (typescript-eslint can't run on TS 7) + Prettier (lint-staged + husky pre-commit) |
| Package manager    | **pnpm** 12 (`packageManager`); Node 26 LTS (`.node-version`)                            |
| TypeScript         | 7 (native `tsc`, no JS compiler API)                                                     |

## Commands

```bash
pnpm start        # dev server on port 3000 (strict)
pnpm build        # tsc + vite build → build/
pnpm test         # vitest run
pnpm serve        # preview production build
pnpm tsc          # type-check only
pnpm lint         # oxlint
pnpm check        # tsc + lint + test + build (what CI runs)
```

## Dependency security

- 7 days after release (`minimumReleaseAge` in `pnpm-workspace.yaml`, `minimumReleaseAge` in `renovate.json`)
- no scripts on install (`allowBuilds: {}` in `pnpm-workspace.yaml`; pnpm fails the install if a dependency wants to build)

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
    calendarClient.ts       # Typed fetch client for Calendar v3 (Bearer token); setCalendarApiProvider() test seam
    calendarTypes.ts        # Hand-written types for the Calendar API subset we use
    undo.ts                 # Snapshot + undo payloads for bulk patch/delete

  lib/
    hooks.ts                # Dexie useLiveQuery hooks (useFilteredEvents, useCalendars, useDefaultCalendar, …)
    eventQueries.ts         # Indexed range queries, per-calendar counts / latest update
    chrono.ts               # componentsToDateTime(): chrono components → Luxon
    dateRange.ts            # Presets, nudge (calendar-aligned), range labels/text that re-parses, updated-since text
    searchTextParser.ts     # Range text → {start, end, updatedSince}; relative ranges (next week, past 30 days) + chrono
    contrast.ts             # WCAG contrast; readableOn()/readableTextOnWhite() for calendar colors
    newVersion.tsx          # Reload on stale chunks / newer DB schema (guarded; toast if unsaved work)
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
    utils.ts                # General helpers (asArray, notEmpty, toRelativeDate, days, …)
    reactHooks.ts           # useInterval, useLocalStorage, useMediaQuery, useOnClickOutside (vendored; no usehooks-ts)

  useGoogleButton.tsx       # OAuth login flow, token refresh, read/write scopes
  authContext.ts            # isLoggedIn / hasWriteAccess / ensureWriteAccess context

  # Feature views (all statically imported; single bundle):
  EmptyState.tsx            # useEmptyState(): signed out / loading / no calendars / syncing / empty range
  RowList.tsx               # Renders all list rows with CSS content-visibility (fast scrolling, Ctrl-F finds everything)
  CalendarFilter.tsx        # Top-bar calendar picker
  Calendars.tsx             # Accessible calendar multi-select (combobox/listbox, colored chips, drag or Alt+←/→ to reorder)
  JsonEditor.tsx            # Plain textarea JSON editor with live validation (no highlighting by design)
  Table.tsx                 # Plain <table>, day groups + selection (no table library)
  BulkFilters.tsx           # Filter panel shared by ModMany and CopyFrom
  DateRangeField.tsx        # Date control: free text (kept as typed), From/To chips, Calendar… presets + range, ‹ › nudge, Updated since
  Calendar.tsx              # Small accessible Luxon month grid (single/range, keyboard); no calendar library by design
  SearchBar.tsx             # Top-bar DateRangeField bound to the global filters
  BulkEntry.tsx             # Bulk create events with NLP date entry
  CopyFrom.tsx              # Copy events from one calendar to another
  Events.tsx                # Event list with filters
  ImportFile.tsx            # Drag-and-drop CSV import
  ModMany.tsx               # Bulk modify/delete events
  Paper.tsx                 # Multi-column paper calendar view
  Schedule.tsx              # Schedule/agenda view
  Attachments.tsx           # View file attachments on events
  CalendarsStatus.tsx       # Sync status per calendar
```

## Key architecture patterns

### Data layer (Dexie / IndexedDB)

- Single `DB` class in `src/models/db.ts` with versioned schema migrations.
- Five tables: `calendars`, `events`, `updateState`, `settings`, `calendarStats` (longest event per calendar).
- Events are keyed on `[id+calendarId]` (composite) and indexed on `calendarId`, `[calendarId+start.ms]`, `[calendarId+status]`, `[calendarId+updated]`, `[start.ms+end.ms]`, `*_schedules` (multi-entry).
- Views never load the whole table: `eventsInRange()` reads `[calendarId+start.ms]` from `start − max(longest event, 7 days)` to `end`.
- `start.ms` / `end.ms` are milliseconds added at fetch time for efficient range queries.
- `db` is exposed as `globalThis.db` in dev builds only.
- The cache belongs to one Google account (`31cal:dataOwner` in localStorage); `clearLocalData()` runs on sign-out and on account change.

### Sync flow

1. `useSync` (called from `StatusBar` in `Nav.tsx`) polls on a 5-minute interval and when the calendar selection changes.
2. It syncs `calendarList` first (removed calendars are deleted with their events); if no `selectedCalendars` setting exists, auto-selects primary + `selected` calendars.
3. Then syncs events for each selected calendar via `syncResource`. A full sync (first time or after 410) first fetches a recent window (1 month back to 6 months ahead) so views fill fast, then backfills all history (`updateState.backfilling`); pages are stored as they arrive, the sync token is saved after the last page, a 410 triggers a full sync that purges rows Google no longer returns, and cancelled instances without start/end update the existing row.
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

`wouter` with `Switch`/`Route`. Routes are defined in `ROUTES` array in `Nav.tsx`. All views are imported statically and the build is **one JS bundle by design** (`build.rolldownOptions.output.inlineDynamicImports` in `vite.config.mts`): Cloudflare Pages serves only the latest deployment's files, so a tab opened before a deploy must never need a chunk from its own build later. Don't add `React.lazy` or dynamic `import()`. `public/reload-on-fail.js` (unhashed, `no-cache`, loaded by `index.html` before the bundle) covers a deploy landing mid-load: if an `/assets/` script/stylesheet fails or the bundle never sets `window.__31calBooted` within 10 s, it reloads once (sessionStorage guard: not again within 60 s). `lib/newVersion` still handles Dexie `versionchange`/`blocked` (a newer tab upgrading the DB schema) and keeps the `vite:preloadError` reload as a safety net.

### Write access

Write operations (save/patch/delete) require `EVENTS_READWRITE` scope. The app starts with read-only scope; every write starts with `if (!(await ensureWriteAccess())) return;` called directly from the click handler (so the popup isn't blocked). It resolves false if the user declines or closes the popup. All writes go through `google/writes.tsx`; destructive bulk actions confirm first, and bulk patch/delete toasts offer Undo.

## Testing

- Test files live next to source (`*.test.ts`). Sync tests use `fake-indexeddb` and inject a fake Google API with `setCalendarApiProvider()`.
- Run with `pnpm test` (vitest, happy-dom). Date logic should pass in any `TZ` (try `TZ=America/Los_Angeles pnpm test`).

## Build + Deployment

- Deployed on Cloudflare Pages (v3 image) with `PNPM_VERSION=12.21.0` set in the dashboard; builds to `build/` directory.
- `.github/workflows/ci.yml` runs tsc, lint, test, build.
- `renovate.json` automated dependency updates.
- `public/_headers` — Cloudflare Pages (CSP and security headers)
- `public/_redirects` — Cloudflare Pages

## Dependencies policy

Keep the single bundle small: prefer platform features and small in-repo code over UI libraries (no react-select, table/virtualization libraries, dropzone, code editors). The CSP has no `style-src 'unsafe-inline'`, so nothing may inject `<style>` elements at runtime; React `style={}` props are fine (set via CSSOM). Google's GIS client tries to inject one for its button/One Tap UI, which we don't use; that console violation is expected.

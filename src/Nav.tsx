import React, {
  ComponentType,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { authContext } from './authContext';
import { sample } from './lib/utils';
import { Link, Switch, Route, useLocation } from 'wouter';
import ErrorBoundary from './ErrorBoundary';
import SearchBar from './SearchBar';
import { userContext } from './userContext';
import useSync from './google/useSync';
import CalendarUpdateStatus from './CalendarUpdateStatus';

import 'react-toastify/dist/ReactToastify.css'; // part of layout
import { googleButtonContext } from './googleButtonContext';

// Every view except Home loads on demand.
const Attachments = React.lazy(() => import('./Attachments'));
const BulkEntry = React.lazy(() => import('./BulkEntry'));
const CalendarsStatus = React.lazy(() => import('./CalendarsStatus'));
const CopyFrom = React.lazy(() => import('./CopyFrom'));
const Events = React.lazy(() => import('./Events'));
const Paper = React.lazy(() => import('./Paper'));
const CalendarFilter = React.lazy(() => import('./CalendarFilter'));
const ImportFile = React.lazy(() => import('./ImportFile'));
const ModMany = React.lazy(() => import('./ModMany'));
const Schedule = React.lazy(() => import('./Schedule'));
const Table = React.lazy(() => import('./Table'));

const SmallLogo = (
  <svg
    height="1.5em"
    width="1.5em"
    id="Layer_1"
    data-name="Layer 1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 122.87 122.88"
  >
    <title>cal31</title>
    <path d="M81.6,4.73C81.6,2.12,84.18,0,87.37,0s5.77,2.12,5.77,4.73V25.45c0,2.61-2.58,4.73-5.77,4.73s-5.77-2.12-5.77-4.73V4.73ZM52,103.78q-4.83,0-9.36-.42a82.2,82.2,0,0,1-8.38-1.21V92.74H47.44a20.16,20.16,0,0,0,3.65-.25,3.15,3.15,0,0,0,1.78-.78,2.19,2.19,0,0,0,.48-1.51V89.06a2.67,2.67,0,0,0-.54-1.75,3.21,3.21,0,0,0-1.57-1,9.61,9.61,0,0,0-2.53-.39L38,85.43V76.38l10.19-.66A10.68,10.68,0,0,0,51.72,75a2,2,0,0,0,1.15-1.93v-.55a2.64,2.64,0,0,0-1.21-2.47,9.53,9.53,0,0,0-4.46-.72H34.89V59.91q3.91-.66,8.27-1.23a54.75,54.75,0,0,1,8.8-.46,17.18,17.18,0,0,1,6.67,1.3A9.31,9.31,0,0,1,63,63.26a12.23,12.23,0,0,1,1.5,6.37v3a13.75,13.75,0,0,1-.27,2.81,8,8,0,0,1-.87,2.35,6.43,6.43,0,0,1-1.57,1.84,7.47,7.47,0,0,1-2.36,1.27,6.31,6.31,0,0,1,2.51,1.36,8,8,0,0,1,1.75,2.2,11.32,11.32,0,0,1,1.06,2.87,15.41,15.41,0,0,1,.36,3.4v1.75q0,5.49-3.47,8.39T52,103.78Zm24.85-.37V69.33H69.76V61.84l8.45-3.62H88.59v45.19ZM29.61,4.73C29.61,2.12,32.19,0,35.38,0s5.77,2.12,5.77,4.73V25.45c0,2.61-2.58,4.73-5.77,4.73s-5.77-2.12-5.77-4.73V4.73ZM6.4,38.76H116.46V21.47a3,3,0,0,0-.86-2.07,2.92,2.92,0,0,0-2.07-.86H103a3.2,3.2,0,1,1,0-6.4h10.55a9.36,9.36,0,0,1,9.33,9.33v92.08a9.36,9.36,0,0,1-9.33,9.33H9.33A9.36,9.36,0,0,1,0,113.54V21.47a9.36,9.36,0,0,1,9.33-9.33H20.6a3.2,3.2,0,1,1,0,6.4H9.33a3,3,0,0,0-2.07.86,2.92,2.92,0,0,0-.86,2.07V38.76Zm110.07,6.41H6.4v68.37a3,3,0,0,0,.86,2.07,2.92,2.92,0,0,0,2.07.86H113.54a3,3,0,0,0,2.07-.86,2.92,2.92,0,0,0,.86-2.07V45.17Zm-66-26.63a3.2,3.2,0,0,1,0-6.4H71.91a3.2,3.2,0,1,1,0,6.4Z" />
  </svg>
);

type AppRoute = {
  path: string;
  name: string;
  description: string;
  Component: ComponentType;
};

/** Every view, in the order shown on the home page and in the menu. */
const ROUTES: AppRoute[] = [
  {
    path: '/events',
    name: 'Events',
    description:
      'Every event in range on one page, with descriptions and attachments.',
    Component: Events,
  },
  {
    path: '/paper',
    name: 'Paper',
    description:
      'A paper-calendar grid: one row per day, one column per keyword.',
    Component: Paper,
  },
  {
    path: '/table',
    name: 'Table',
    description:
      'Spreadsheet-style list grouped by day, with multi-select delete.',
    Component: Table,
  },
  {
    path: '/schedule',
    name: 'Schedule',
    description: 'Events tagged with a 31cal schedule (club, team, choir…).',
    Component: Schedule,
  },
  {
    path: '/bulk',
    name: 'Bulk entry',
    description: 'Type many events at once: “Saturday 3pm rehearsal”.',
    Component: BulkEntry,
  },
  {
    path: '/import',
    name: 'Import CSV',
    description: 'Import a CSV file, reviewing every row before saving.',
    Component: ImportFile,
  },
  {
    path: '/mod',
    name: 'Bulk modify',
    description: 'Find events, then rename, delete or edit them all at once.',
    Component: ModMany,
  },
  {
    path: '/copy',
    name: 'Copy',
    description: 'Copy events from one calendar to another.',
    Component: CopyFrom,
  },
  {
    path: '/attachments',
    name: 'Attachments',
    description: 'Preview the files attached to events.',
    Component: Attachments,
  },
  {
    path: '/status',
    name: 'Calendars',
    description: 'Choose calendars and see sync status.',
    Component: CalendarsStatus,
  },
];

export function Routes() {
  return (
    <Layout>
      <Switch>
        <Route path="/">
          <Home />
        </Route>
        {ROUTES.map(({ path, Component }) => (
          <Route key={path} path={path}>
            <Component />
          </Route>
        ))}
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </Layout>
  );
}

function NotFound() {
  const route = sample(ROUTES)!;
  return (
    <div>
      Page not found. Try <Link href={route.path}>{route.name}</Link>, or see{' '}
      <Link href="/">all views</Link>.
    </div>
  );
}

function Home() {
  const { isLoggedIn, login } = useContext(authContext);
  return (
    <div className="home">
      <h1>31cal — 31 different ways to calendar</h1>
      <p>
        Alternative views and bulk-editing tools for Google Calendar. Your
        calendar is copied into this browser; nothing is sent anywhere else.
      </p>
      {!isLoggedIn && (
        <p>
          <button type="button" className="primary-button" onClick={login}>
            Sign in with Google
          </button>{' '}
          <span className="hint">
            Starts with read-only access; 31cal asks again before making any
            change.
          </span>
        </p>
      )}
      <ul className="route-list">
        {ROUTES.map((r) => (
          <li key={r.path}>
            <Link href={r.path}>{r.name}</Link> — {r.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBar() {
  const user = useContext(userContext);
  const googleButton = useContext(googleButtonContext);
  useSync(user, 5 * 60 * 1000);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        whiteSpace: 'nowrap',
      }}
    >
      <Suspense fallback={<span>...</span>}>
        <Link href="/status">
          <CalendarUpdateStatus />
        </Link>
      </Suspense>
      {googleButton}
    </div>
  );
}

const topBarStyles = `
  .topbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .topbar-home {
    flex: 0 0 auto;
    order: 0;
    margin-left: 8px;
    position: relative;
  }
  .home-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    z-index: 20;
    min-width: 140px;
    padding: 4px 0;
    margin: 0;
    list-style: none;
  }
  .home-dropdown-item {
    display: block;
    padding: 4px 12px;
    text-decoration: none;
    color: #333;
  }
  .home-dropdown-item:hover {
    background: #f0f0f0;
  }
  .topbar-search {
    flex: 1 1 200px;
    min-width: 0;
    order: 1;
  }
  .topbar-calendars {
    flex: 1 0 200px;
    order: 2;
    z-index: 11;
    position: relative;
    height: 38px;
  }
  .topbar-status {
    flex: 0 0 auto;
    order: 3;
    margin-left: auto;
  }
  @media (max-width: 640px) {
    .topbar-status {
      order: 0;
      margin-left: auto;
    }
    .topbar-search {
      order: 1;
      flex-basis: 100%;
    }
    .topbar-calendars {
      order: 2;
      flex-basis: 100%;
    }
  }
`;

function HomeNav() {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const navRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = 'home-menu';

  const show = () => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const hide = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  return (
    <nav
      ref={navRef}
      className="topbar-home"
      aria-label="Views"
      onMouseEnter={show}
      onMouseLeave={hide}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <Link href="/" aria-label="31cal home">
        {SmallLogo}
      </Link>
      <button
        ref={buttonRef}
        type="button"
        className="menu-button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Views menu"
        onClick={() => setOpen((o) => !o)}
      >
        ▾
      </button>
      {open && (
        <ul id={menuId} className="home-dropdown">
          {ROUTES.map((r) => (
            <li key={r.path}>
              <Link
                href={r.path}
                className="home-dropdown-item"
                onClick={() => setOpen(false)}
              >
                {r.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

function TopBar() {
  return (
    <div className="topbar">
      <HomeNav />
      <div className="topbar-status">
        <StatusBar />
      </div>
      <div className="topbar-search">
        <SearchBar />
      </div>
      <div className="topbar-calendars">
        <Suspense fallback={<div aria-hidden="true" style={{ height: 38 }} />}>
          <CalendarFilter />
        </Suspense>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return (
    <div>
      <style>{topBarStyles}</style>
      <TopBar />
      <hr />
      <ErrorBoundary key={location}>
        <Suspense fallback={<span>Loading…</span>}>{children}</Suspense>
      </ErrorBoundary>
    </div>
  );
}

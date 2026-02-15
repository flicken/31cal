import React, {
  useEffect,
  useState,
  useRef,
  Suspense,
  ClipboardEvent,
} from 'react';
import './App.css';
import { userContext } from './userContext';
import { authContext } from './authContext';

import useDefaultCalendar from './lib/useDefaultCalendar';

import useClientToFetch from './google/useClientToFetch';
import { GoogleUser, useGoogleButton } from './useGoogleButton';
import { SettingsProvider } from './lib/settings';
import { sample } from './lib/utils';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { FilterStateProvider } from './lib/FilterStateContext';

import {
  Outlet,
  Link,
  useRoutes,
  useMatch,
  useResolvedPath,
} from 'react-router';

import {
  useEventListener,
  useLocalStorage,
  useOnClickOutside,
} from 'usehooks-ts';

import Paper from './Paper';
import Attachments from './Attachments';
import BulkEntry from './BulkEntry';
import CalendarsStatus from './CalendarsStatus';
import Events from './Events';
import Filters from './Filters';
import ImportFile from './ImportFile';
import ModMany from './ModMany';
import Schedule from './Schedule';
import Table from './Table';
import CalendarUpdateStatus from './CalendarUpdateStatus';
import { GOOGLE_CLIENT_ID } from './config';
import CopyFrom from './CopyFrom';

const SmallLogo = (
  <svg
    height="1em"
    width="1em"
    id="Layer_1"
    data-name="Layer 1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 122.87 122.88"
  >
    <title>cal31</title>
    <path d="M81.6,4.73C81.6,2.12,84.18,0,87.37,0s5.77,2.12,5.77,4.73V25.45c0,2.61-2.58,4.73-5.77,4.73s-5.77-2.12-5.77-4.73V4.73ZM52,103.78q-4.83,0-9.36-.42a82.2,82.2,0,0,1-8.38-1.21V92.74H47.44a20.16,20.16,0,0,0,3.65-.25,3.15,3.15,0,0,0,1.78-.78,2.19,2.19,0,0,0,.48-1.51V89.06a2.67,2.67,0,0,0-.54-1.75,3.21,3.21,0,0,0-1.57-1,9.61,9.61,0,0,0-2.53-.39L38,85.43V76.38l10.19-.66A10.68,10.68,0,0,0,51.72,75a2,2,0,0,0,1.15-1.93v-.55a2.64,2.64,0,0,0-1.21-2.47,9.53,9.53,0,0,0-4.46-.72H34.89V59.91q3.91-.66,8.27-1.23a54.75,54.75,0,0,1,8.8-.46,17.18,17.18,0,0,1,6.67,1.3A9.31,9.31,0,0,1,63,63.26a12.23,12.23,0,0,1,1.5,6.37v3a13.75,13.75,0,0,1-.27,2.81,8,8,0,0,1-.87,2.35,6.43,6.43,0,0,1-1.57,1.84,7.47,7.47,0,0,1-2.36,1.27,6.31,6.31,0,0,1,2.51,1.36,8,8,0,0,1,1.75,2.2,11.32,11.32,0,0,1,1.06,2.87,15.41,15.41,0,0,1,.36,3.4v1.75q0,5.49-3.47,8.39T52,103.78Zm24.85-.37V69.33H69.76V61.84l8.45-3.62H88.59v45.19ZM29.61,4.73C29.61,2.12,32.19,0,35.38,0s5.77,2.12,5.77,4.73V25.45c0,2.61-2.58,4.73-5.77,4.73s-5.77-2.12-5.77-4.73V4.73ZM6.4,38.76H116.46V21.47a3,3,0,0,0-.86-2.07,2.92,2.92,0,0,0-2.07-.86H103a3.2,3.2,0,1,1,0-6.4h10.55a9.36,9.36,0,0,1,9.33,9.33v92.08a9.36,9.36,0,0,1-9.33,9.33H9.33A9.36,9.36,0,0,1,0,113.54V21.47a9.36,9.36,0,0,1,9.33-9.33H20.6a3.2,3.2,0,1,1,0,6.4H9.33a3,3,0,0,0-2.07.86,2.92,2.92,0,0,0-.86,2.07V38.76Zm110.07,6.41H6.4v68.37a3,3,0,0,0,.86,2.07,2.92,2.92,0,0,0,2.07.86H113.54a3,3,0,0,0,2.07-.86,2.92,2.92,0,0,0,.86-2.07V45.17Zm-66-26.63a3.2,3.2,0,0,1,0-6.4H71.91a3.2,3.2,0,1,1,0,6.4Z" />
  </svg>
);

const ROUTES = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        path: '/',
        shortcut: ['h'],
        name: 'home',
        logo: SmallLogo,
        element: <div> Agenda: 31 different ways to calendar </div>,
        keywords: 'home',
      },
      {
        path: '/paper',
        shortcut: ['p'],
        element: <Paper />,
      },
      {
        path: '/attachments',
        shortcut: ['a'],
        element: <Attachments />,
      },
      {
        path: '/bulk',
        shortcut: ['b'],
        element: <BulkEntry />,
      },
      {
        path: '/copy',
        shortcut: ['c'],
        element: <CopyFrom />,
      },
      {
        path: '/mod',
        shortcut: ['m'],
        element: <ModMany />,
      },
      {
        path: '/status',
        shortcut: ['s'],
        element: <CalendarsStatus />,
      },
      {
        path: '/events',
        shortcut: ['e'],
        element: <Events />,
      },
      {
        path: '/import',
        shortcut: ['i'],
        element: <ImportFile />,
      },
      {
        path: '/schedule',
        shortcut: ['s'],
        element: <Schedule />,
      },
      {
        path: '/table',
        shortcut: ['t'],
        element: <Table />,
      },
      {
        path: '*',
        element: <NotFound routesF={() => ROUTES} />,
        ignored: true,
      },
    ],
  },
];

function randomRoute(routes: typeof ROUTES) {
  const route = sample(routes[0].children.filter((f) => !f.ignored))!;

  return <Link to={route.path}>{route.path}</Link>;
}

function NotFound({ routesF }: { routesF: () => typeof ROUTES }) {
  return (
    <div>Try {randomRoute(routesF())}, it's better than a blank page.</div>
  );
}

function compareProperty(a?: string, b?: string) {
  return a || b ? (!a ? -1 : !b ? 1 : a.localeCompare(b)) : 0;
}

const NavLink = ({
  path,
  name,
  logo,
}: {
  path: string;
  name?: any;
  logo?: any;
}) => {
  let resolved = useResolvedPath(path);
  let match = useMatch({ path: resolved.pathname, end: true });

  return (
    <li
      style={{
        display: 'inline',
        marginLeft: '0.25em',
        fontWeight: match ? 'bold' : undefined,
      }}
    >
      <Link to={path}>{logo || name || path}</Link>
    </li>
  );
};

function Layout() {
  const [showFilter, setShowFilter] = useState(false);
  const hoverRef = useRef<HTMLLIElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef(document) as React.RefObject<Document>;

  useEventListener('mouseenter', () => setShowFilter(true), hoverRef as React.RefObject<HTMLLIElement>);
  useEventListener(
    'keydown',
    (e) => {
      if (e.code == 'Escape') {
        setShowFilter(false);
      }
    },
    documentRef,
  );
  useEventListener(
    'keydown',
    (e) => {
      if (e.code == 'Enter') {
        setShowFilter(false);
      }
    },
    filterRef as React.RefObject<HTMLDivElement>,
  );
  useOnClickOutside(filterRef as React.RefObject<HTMLElement>, () => setShowFilter(false));

  return (
    <div>
      <nav>
        <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
          {ROUTES[0]
            .children!.filter((r) => !r.ignored)
            .sort((a, b) => compareProperty(a.path, b.path))
            .map((r) => (
              <NavLink key={r.path} {...r} />
            ))}
          <li
            ref={hoverRef}
            onClick={() => setShowFilter((show) => !show)}
            style={{ display: 'inline', marginLeft: '0.25em' }}
          >
            ↓filters
          </li>
        </ul>
      </nav>
      <div
        ref={filterRef}
        style={{
          visibility: showFilter ? undefined : 'hidden',
          left: '10vw',
          position: 'fixed',
          zIndex: 10,
          top: '1em',
          width: '80vw',
        }}
      >
        <Filters />
      </div>
      <hr />
      <Outlet />
    </div>
  );
}

function ShowDefaultCalendar() {
  const defaultCalendar = useDefaultCalendar();

  return (
    <span title={defaultCalendar?.id}>
      {defaultCalendar?.summary ?? 'No default calendar'}
    </span>
  );
}

function RightBar({
  user,
  googleButton,
}: {
  user: GoogleUser | null;
  googleButton: any;
}) {
  useClientToFetch(user, 5 * 60 * 1000);

  return (
    <div style={{ float: 'right', clear: 'both' }}>
      <Suspense fallback={<span>...</span>}>
        <ShowDefaultCalendar />
        <Link to="/status">
          <CalendarUpdateStatus />
        </Link>
      </Suspense>{' '}
      - {googleButton}
    </div>
  );
}

const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement ||
    (e.target as HTMLElement).isContentEditable
  ) {
    return;
  }

  const myText = e.clipboardData.getData('text');
  console.log(myText);
  console.log(e.clipboardData.types);
  console.log(e);
};

function App() {
  const [user] = useLocalStorage<GoogleUser | null>('googleUser', null);
  const { button: googleButton, hasWriteAccess, requestWriteAccess } =
    useGoogleButton();
  return (
    <FilterStateProvider>
      <userContext.Provider value={user}>
        <authContext.Provider value={{ hasWriteAccess, requestWriteAccess }}>
          <SettingsProvider>
            <RightBar user={user} googleButton={googleButton} />
                {useRoutes(ROUTES)}
            <ToastContainer />
          </SettingsProvider>
        </authContext.Provider>
      </userContext.Provider>
    </FilterStateProvider>
  );
}

export default App;

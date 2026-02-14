// @ts-nocheck
import React, { useMemo } from 'react';
import { useFilterState } from './lib/FilterStateContext';
import { useFilteredEvents, useSelectedCalendarIds } from './lib/hooks';
import { asArray } from './utils';
import {
  useTable,
  useGroupBy,
  useExpanded,
  useRowSelect,
  useFlexLayout,
} from 'react-table';

import ViewEvent, { ViewStartAndEnd, ViewEventSummary } from './ViewEvent';

import makeData from './makeData';
import { DateTime } from 'luxon';
import { intersection, compact, uniqWith, isEqual } from 'lodash-es';

import deleteEvents from './google/deleteEvents';

import { userContext } from './userContext';
import { authContext } from './authContext';
import { toast } from 'react-toastify';

export function* days(
  start: DateTime,
  end: DateTime,
): Generator<string, void, unknown> {
  let cursor = start.startOf('day');
  while (cursor < end) {
    yield cursor.toISODate()!;
    cursor = cursor.plus({ days: 1 });
  }
}

function Table_({ columns, data, filters }) {
  const user = React.useContext(userContext);
  const { hasWriteAccess, requestWriteAccess } = React.useContext(authContext);
  const dates = React.useMemo(
    () => Array.from(days(filters.start, filters.end)),
    [filters.start, filters.end],
  );
  const initialExpanded = React.useMemo(
    () =>
      dates.reduce((prev, date) => {
        prev[`date:${date}`] = true;
        return prev;
      }, {}),
    [dates],
  );

  const groupByFn = React.useCallback(
    (rows, columnId) => {
      return rows.reduce((prev, row, i) => {
        const start = row.original?.start?.ms
          ? DateTime.fromMillis(row.original.start.ms)
          : undefined;
        const end = row.original?.end?.ms
          ? DateTime.fromMillis(row.original.end.ms)
          : undefined;
        if (start && end) {
          const keys = intersection(Array.from(days(start, end)), dates);
          for (const resKey of keys) {
            prev[resKey] = Array.isArray(prev[resKey]) ? prev[resKey] : [];
            prev[resKey].push(row);
          }
        }
        return prev;
      }, {});
    },
    [dates],
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    setGroupBy,
    prepareRow,
    state: { groupBy, expanded, selectedRowIds },
    selectedFlatRows,
  } = useTable(
    {
      columns,
      data,
      groupByFn,
      initialState: {
        expanded: initialExpanded,
      },
    },
    useGroupBy,
    useExpanded, // useGroupBy would be pretty useless without useExpanded ;)
    useRowSelect,
    (hooks) => {
      hooks.visibleColumns.push((columns) => [
        // Let's make a column for selection
        {
          id: 'selection',
          // The header can use the table's getToggleAllRowsSelectedProps method
          // to render a checkbox
          Header: ({ getToggleAllRowsSelectedProps }) => (
            <div>
              <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
            </div>
          ),
          // The cell can use the individual row's getToggleRowSelectedProps method
          // to the render a checkbox
          Cell: ({ row }) => (
            <div>
              <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
            </div>
          ),
        },
        ...columns,
      ]);
    },
  );

  React.useEffect(() => {
    setGroupBy(['date']);
  }, []);
  // We don't want to render all of the rows for this example, so cap

  const getLeafColumns = function (rootColumns) {
    return rootColumns.reduce((leafColumns, column) => {
      if (column.columns) {
        return [...leafColumns, ...getLeafColumns(column.columns)];
      } else {
        return [...leafColumns, column];
      }
    }, []);
  };

  const onDelete = async (e) => {
    if (!hasWriteAccess) {
      toast('Write permission needed. Please grant access in the popup.');
      await requestWriteAccess();
    }

    const eventsToDelete = uniqWith(
      compact(
        selectedFlatRows.map((e) => {
          const event = e.original;
          if (event) {
            return {
              calendarId: event.calendarId,
              eventId: event.id,
              summary: event.summary,
            };
          }
        }),
      ),
      isEqual,
    );
    console.log('eventsToDelete', eventsToDelete);
    await deleteEvents(user, eventsToDelete);
  };
  const IconBar = (
    <div>
      <button onClick={onDelete}>Delete</button>
    </div>
  );

  return (
    <>
      {IconBar}
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps()}>{column.render('Header')}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row, i) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  return (
                    <td
                      {...cell.getCellProps()}
                      style={{
                        fontWeight: cell.isGrouped ? 'bold' : undefined,
                        background: cell.isGrouped
                          ? 'bold'
                          : cell.isAggregated
                          ? 'white'
                          : cell.isPlaceholder
                          ? ''
                          : 'white',
                      }}
                    >
                      {cell.isGrouped ? (
                        // If it's a grouped cell, add an expander and row count
                        <> {row.groupByVal} </>
                      ) : cell.isAggregated ? (
                        // If the cell is aggregated, use the Aggregated
                        // renderer for cell
                        cell.render('Cell')
                      ) : cell.isPlaceholder ? null : ( // For cells with repeated values, render null
                        // Otherwise, just render the regular cell
                        cell.render('Cell')
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

const IndeterminateCheckbox = React.forwardRef(
  ({ indeterminate, ...rest }, ref) => {
    const defaultRef = React.useRef();
    const resolvedRef = ref || defaultRef;

    React.useEffect(() => {
      resolvedRef.current.indeterminate = indeterminate;
    }, [resolvedRef, indeterminate]);

    return (
      <>
        <input type="checkbox" ref={resolvedRef} {...rest} />
      </>
    );
  },
);

function dateOf(ms: number) {
  return DateTime.fromMillis(ms).toISODate();
}

export default function Table() {
  const columns = React.useMemo(() => [
    {
      id: 'date',
      Header: 'When',
      Cell: ({ row }) => {
        return row.original?.start ? (
          <span>{dateOf(row.original.start.ms)}</span>
        ) : null;
      },
    },
    {
      id: 'time',
      Header: 'Time',
      Cell: ({ row }) => {
        return (
          <ViewStartAndEnd
            start={row.original?.start}
            end={row.original?.end}
            showDate={!row.groupByID}
          />
        );
      },
    },
    {
      id: 'summary',
      Header: 'What',
      Cell: ({ row }) => {
        if (!row.original) return null;
        return <ViewEventSummary event={row.original} />;
      },
    },
  ]);

  const { eventFilters } = useFilterState();
  const [selectedCalendarIds] = useSelectedCalendarIds();

  const allFilters = useMemo(
    () => ({ ...eventFilters, calendarIds: asArray(selectedCalendarIds) }),
    [eventFilters, selectedCalendarIds],
  );

  const events = useFilteredEvents(allFilters);

  return <Table_ columns={columns} data={events} filters={allFilters} />;
}

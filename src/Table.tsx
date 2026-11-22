import React, { useMemo } from 'react';
import { useFilterState } from './lib/FilterStateContext';
import { useFilteredEvents, useSelectedCalendarIds } from './lib/hooks';
import { asArray } from './utils';
import {
  useTable,
  tableFeatures,
  rowSelectionFeature,
  flexRender,
  ColumnDef,
  RowSelectionState,
} from '@tanstack/react-table';

const features = tableFeatures({ rowSelectionFeature });
type Features = typeof features;
type Columns = ColumnDef<Features, any, any>[];
type ExpandedState = true | Record<string, boolean>;

import { ViewEventSummary } from './ViewEvent';
import { ViewStartAndEnd } from './ViewStartAndEnd';

import { DateTime } from 'luxon';
import { uniqWith, isEqual } from 'lodash-es';
import { intersection, days } from './lib/utils';

import deleteEvents from './google/deleteEvents';

import { userContext } from './userContext';
import { authContext } from './authContext';
import { toast } from 'react-toastify';

function Table_({
  columns,
  data,
  filters,
}: {
  columns: Columns;
  data: any[];
  filters: any;
}) {
  const user = React.useContext(userContext);
  const { hasWriteAccess, requestWriteAccess } = React.useContext(authContext);
  const dates = React.useMemo(
    () => Array.from(days(filters.start, filters.end)),
    [filters.start, filters.end],
  );
  const initialExpanded = React.useMemo(
    () =>
      dates.reduce(
        (prev, date) => {
          prev[`date:${date}`] = true;
          return prev;
        },
        {} as Record<string, boolean>,
      ),
    [dates],
  );

  const [expanded, setExpanded] =
    React.useState<ExpandedState>(initialExpanded);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Reset expanded state when dates change
  React.useEffect(() => {
    setExpanded(initialExpanded);
  }, [initialExpanded]);

  const allColumns = React.useMemo<Columns>(
    () => [
      {
        id: 'selection',
        header: ({ table }) => (
          <div>
            <IndeterminateCheckbox
              checked={table.getIsAllRowsSelected()}
              indeterminate={
                table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
              }
              onChange={table.getToggleAllRowsSelectedHandler()}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div>
            <IndeterminateCheckbox
              checked={row.getIsSelected()}
              indeterminate={row.getIsSomeSelected()}
              onChange={row.getToggleSelectedHandler()}
            />
          </div>
        ),
      },
      ...columns,
    ],
    [columns],
  );

  const table = useTable({
    features,
    columns: allColumns,
    data,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
  });

  // Custom grouping: assign rows to date buckets based on event start/end
  const customGroupedRows = React.useMemo(() => {
    const flatRows = table.getCoreRowModel().rows;
    const grouped: Record<string, typeof flatRows> = {};
    for (const row of flatRows) {
      const start = row.original?.start?.ms
        ? DateTime.fromMillis(row.original.start.ms)
        : undefined;
      const end = row.original?.end?.ms
        ? DateTime.fromMillis(row.original.end.ms)
        : undefined;
      if (start && end) {
        const keys = intersection(Array.from(days(start, end)), dates);
        for (const key of keys) {
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(row);
        }
      }
    }
    return grouped;
  }, [table.getCoreRowModel().rows, dates]);

  const onDelete = async () => {
    if (!hasWriteAccess) {
      toast('Write permission needed. Please grant access in the popup.');
      await requestWriteAccess();
    }

    const selectedRows = table
      .getSelectedRowModel()
      .flatRows.filter((r) => r.original);
    const eventsToDelete = uniqWith(
      selectedRows.flatMap((e) => {
        const event = e.original;
        if (event) {
          return [
            {
              calendarId: event.calendarId,
              eventId: event.id,
              summary: event.summary,
            },
          ];
        }
        return [];
      }),
      isEqual,
    );
    console.log('eventsToDelete', eventsToDelete);
    await deleteEvents(user, eventsToDelete);
  };

  const headerGroups = table.getHeaderGroups();

  // Build display rows: date group headers + their child rows
  const displayRows = React.useMemo(() => {
    const flatRows = table.getCoreRowModel().rows;
    const result: Array<
      | { type: 'group'; date: string; rowCount: number }
      | { type: 'row'; row: (typeof flatRows)[number] }
    > = [];
    const sortedDates = Object.keys(customGroupedRows).sort();
    for (const date of sortedDates) {
      const isExpanded =
        expanded === true ||
        (expanded as Record<string, boolean>)[`date:${date}`];
      result.push({
        type: 'group',
        date,
        rowCount: customGroupedRows[date].length,
      });
      if (isExpanded) {
        for (const row of customGroupedRows[date]) {
          result.push({ type: 'row', row });
        }
      }
    }
    return result;
  }, [customGroupedRows, expanded]);

  const toggleDateExpanded = (date: string) => {
    setExpanded((prev) => {
      if (prev === true) return { [`date:${date}`]: false };
      const p = prev as Record<string, boolean>;
      return { ...p, [`date:${date}`]: !p[`date:${date}`] };
    });
  };

  return (
    <>
      <div>
        <button onClick={onDelete}>Delete</button>
      </div>
      <table>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {displayRows.map((item, i) => {
            if (item.type === 'group') {
              return (
                <tr
                  key={`group-${item.date}`}
                  onClick={() => toggleDateExpanded(item.date)}
                  style={{ cursor: 'pointer' }}
                >
                  <td
                    colSpan={allColumns.length}
                    style={{ fontWeight: 'bold' }}
                  >
                    {item.date}
                  </td>
                </tr>
              );
            }
            const row = item.row;
            return (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} style={{ background: 'white' }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function IndeterminateCheckbox({
  indeterminate,
  ...rest
}: {
  indeterminate?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);

  return <input type="checkbox" ref={ref} {...rest} />;
}

function dateOf(ms: number) {
  return DateTime.fromMillis(ms).toISODate();
}

export default function Table() {
  const columns = React.useMemo<Columns>(
    () => [
      {
        id: 'date',
        header: 'When',
        cell: ({ row }) => {
          return row.original?.start ? (
            <span>{dateOf(row.original.start.ms)}</span>
          ) : null;
        },
      },
      {
        id: 'time',
        header: 'Time',
        cell: ({ row }) => {
          return (
            <ViewStartAndEnd
              start={row.original?.start}
              end={row.original?.end}
              showDate={false}
            />
          );
        },
      },
      {
        id: 'summary',
        header: 'What',
        cell: ({ row }) => {
          if (!row.original) return null;
          return <ViewEventSummary event={row.original} />;
        },
      },
    ],
    [],
  );

  const { eventFilters } = useFilterState();
  const [selectedCalendarIds] = useSelectedCalendarIds();

  const allFilters = useMemo(
    () => ({ ...eventFilters, calendarIds: asArray(selectedCalendarIds) }),
    [eventFilters, selectedCalendarIds],
  );

  const events = useFilteredEvents(allFilters);
  if (!events) return null;

  return <Table_ columns={columns} data={events} filters={allFilters} />;
}

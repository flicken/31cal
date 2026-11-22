import { eventDays } from './lib/events';
import { debug } from './lib/log';
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
import { intersection, days } from './lib/utils';

import { deleteEvents } from './google/writes';

import { userContext } from './userContext';
import { authContext } from './authContext';

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
  const { ensureWriteAccess } = React.useContext(authContext);
  const [busy, setBusy] = React.useState(false);
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
  const [prevInitial, setPrevInitial] = React.useState(initialExpanded);
  if (prevInitial !== initialExpanded) {
    setPrevInitial(initialExpanded);
    setExpanded(initialExpanded);
  }

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
  const coreRows = table.getCoreRowModel().rows;
  const customGroupedRows = React.useMemo(() => {
    const flatRows = coreRows;
    const grouped: Record<string, typeof flatRows> = {};
    for (const row of flatRows) {
      if (!row.original) continue;
      for (const key of intersection(eventDays(row.original), dates)) {
        (grouped[key] ??= []).push(row);
      }
    }
    return grouped;
  }, [coreRows, dates]);

  const selectedEvents = (() => {
    const seen = new Set<string>();
    return table
      .getSelectedRowModel()
      .flatRows.map((r) => r.original)
      .filter((e) => {
        const key = `${e?.calendarId}/${e?.id}`;
        if (!e || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  })();

  const onDelete = async () => {
    const n = selectedEvents.length;
    if (
      !window.confirm(
        `Delete ${n} event${n === 1 ? '' : 's'}? This cannot be undone here.`,
      )
    )
      return;
    if (!(await ensureWriteAccess())) return;
    setBusy(true);
    try {
      const { failed } = await deleteEvents(
        selectedEvents.map((event) => ({
          calendarId: event.calendarId,
          eventId: event.id,
          summary: event.summary,
        })),
        user?.email,
      );
      const failedKeys = new Set(
        failed.map(({ item }) => `${item.calendarId}/${item.eventId}`),
      );
      setRowSelection((sel) =>
        Object.fromEntries(
          Object.entries(sel).filter(([rowId]) => {
            const e = table.getRow(rowId, true)?.original;
            return e && failedKeys.has(`${e.calendarId}/${e.id}`);
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const headerGroups = table.getHeaderGroups();

  // Build display rows: date group headers + their child rows
  const displayRows = React.useMemo(() => {
    const result: Array<
      | { type: 'group'; date: string; rowCount: number }
      | { type: 'row'; row: (typeof coreRows)[number] }
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
        <button
          disabled={busy || selectedEvents.length === 0}
          onClick={onDelete}
        >
          Delete {selectedEvents.length || ''}
        </button>
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
                <tr key={`group-${item.date}`}>
                  <td
                    colSpan={allColumns.length}
                    style={{ fontWeight: 'bold' }}
                  >
                    <button
                      type="button"
                      className="link-button"
                      aria-expanded={
                        expanded === true || !!expanded[`date:${item.date}`]
                      }
                      onClick={() => toggleDateExpanded(item.date)}
                    >
                      {item.date} ({item.rowCount})
                    </button>
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

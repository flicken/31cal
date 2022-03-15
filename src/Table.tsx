// @ts-nocheck
import React from 'react';
import { useRecoilValue } from 'recoil';
import { filteredEvents, allEventFilters } from './lib/store';
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
import _ from 'lodash';

function* days(start: DateTime, end: DateTime) {
  let cursor = start.startOf('day');
  while (cursor < end) {
    yield cursor.toISODate();
    cursor = cursor.plus({ days: 1 });
  }
}

function Table({ columns, data }) {
  const filters = useRecoilValue(allEventFilters);
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
          const keys = _.intersection(Array.from(days(start, end)), dates);
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
  const firstPageRows = rows;

  const getLeafColumns = function (rootColumns) {
    return rootColumns.reduce((leafColumns, column) => {
      if (column.columns) {
        return [...leafColumns, ...getLeafColumns(column.columns)];
      } else {
        return [...leafColumns, column];
      }
    }, []);
  };

  return (
    <>
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
          {firstPageRows.map((row, i) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  return (
                    <td
                      // For educational purposes, let's color the
                      // cell depending on what type it is given
                      // from the useGroupBy hook
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

// This is a custom aggregator that
// takes in an array of leaf values and
// returns the rounded median
function roundedMedian(leafValues) {
  let min = leafValues[0] || 0;
  let max = leafValues[0] || 0;

  leafValues.forEach((value) => {
    min = Math.min(min, value);
    max = Math.max(max, value);
  });

  return Math.round((min + max) / 2);
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
  DateTime.fromMillis(ms).toISODate();
  if (!value) return undefined;
  if ('dateTime' in value) return value.dateTime?.slice(0, 10);
  else return value.date;
}

function App() {
  const columns = React.useMemo(() => [
    {
      id: 'date',
      Header: 'When',
      Cell: ({ row }) => {
        return row.original?.start ? (
          <span>dateOf(row.original.start)</span>
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

  const events = useRecoilValue(filteredEvents);

  return <Table columns={columns} data={events} />;
}

export default App;

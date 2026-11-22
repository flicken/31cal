import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Link } from 'wouter';
import { toast } from 'react-toastify';

import { saveEvents } from './google/writes';
import useDefaultCalendar from './lib/useDefaultCalendar';
import { userContext } from './userContext';
import { authContext } from './authContext';
import { ViewStartAndEnd } from './ViewStartAndEnd';
import { eventIdFor, ImportRow, parseCsv } from './lib/importCsv';

const baseStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  padding: '20px',
  borderWidth: 2,
  borderRadius: 2,
  borderColor: '#ccc',
  borderStyle: 'dashed',
  backgroundColor: '#fafafa',
  color: '#555',
  transition: 'border .24s ease-in-out',
};

const LARGE_IMPORT = 200;

function ImportFile() {
  const defaultCalendar = useDefaultCalendar();
  const user = React.useContext(userContext);
  const { ensureWriteAccess } = React.useContext(authContext);

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const parsed: ImportRow[] = [];
    for (const file of acceptedFiles) {
      try {
        parsed.push(...parseCsv(await file.text()));
      } catch (e) {
        toast.error(`Couldn't read ${file.name}: ${(e as Error).message}`);
      }
    }
    setRows(parsed);
    setFileNames(acceptedFiles.map((f) => f.name));
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragAccept,
    isDragReject,
    isDragActive,
  } = useDropzone({ accept: { 'text/*': ['.csv', '.tsv'] }, onDrop });

  const style = useMemo(
    () => ({
      ...baseStyle,
      ...(isDragActive ? { borderColor: '#2196f3' } : {}),
      ...(isDragAccept ? { borderColor: '#00a152' } : {}),
      ...(isDragReject ? { borderColor: '#d50000' } : {}),
    }),
    [isDragActive, isDragAccept, isDragReject],
  );

  const valid = rows.filter((r) => r.event && r.errors.length === 0);
  const invalid = rows.length - valid.length;

  const onImport = async () => {
    if (!defaultCalendar) return;
    if (
      valid.length > LARGE_IMPORT &&
      !window.confirm(
        `Import ${valid.length} events into ${defaultCalendar.summary}?`,
      )
    )
      return;
    if (!(await ensureWriteAccess())) return;
    setBusy(true);
    try {
      const events = await Promise.all(
        valid.map(async (r) => ({
          ...r.event!,
          id: await eventIdFor(defaultCalendar.id, r.event!),
        })),
      );
      const { failed } = await saveEvents(defaultCalendar, events, {
        account: user?.email,
      });
      const failedIds = new Set(failed.map((f) => f.item.id));
      const failedRows = new Set(
        valid.filter((_, i) => failedIds.has(events[i].id)),
      );
      // Keep only failed and invalid rows on screen so they can be fixed.
      setRows((old) =>
        old.filter((r) => !valid.includes(r) || failedRows.has(r)),
      );
    } finally {
      setBusy(false);
    }
  };

  if (!defaultCalendar) {
    return (
      <div>
        Choose a calendar in the calendar picker above before importing. The
        first selected calendar receives imported events (see{' '}
        <Link href="/status">status</Link>).
      </div>
    );
  }

  return (
    <>
      <div {...getRootProps({ style })}>
        <input {...getInputProps()} aria-label="CSV file to import" />
        <p>
          Drop a CSV file here, or click to choose one. Nothing is saved until
          you review it and press Import.
        </p>
        <p style={{ fontSize: 'smaller' }}>
          Columns: Subject, Start Date, Start Time, End Date, End Time,
          Description, Location (Google Calendar CSV format). Rows without a
          time become all-day events.
        </p>
      </div>
      {rows.length > 0 && (
        <div>
          <p>
            {fileNames.join(', ')}: {valid.length} event
            {valid.length === 1 ? '' : 's'} ready
            {invalid > 0 &&
              `, ${invalid} row${invalid === 1 ? '' : 's'} with problems (skipped)`}
            .{' '}
            <button disabled={busy || valid.length === 0} onClick={onImport}>
              Import {valid.length} to {defaultCalendar.summary}
            </button>{' '}
            <button disabled={busy} onClick={() => setRows([])}>
              Clear
            </button>
          </p>
          <table>
            <thead>
              <tr>
                <th>Row</th>
                <th>When</th>
                <th>What</th>
                <th>Problems</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.line}
                  style={r.errors.length ? { color: '#a00' } : undefined}
                >
                  <td>{r.line}</td>
                  <td>
                    {r.event && (
                      <ViewStartAndEnd
                        start={r.event.start}
                        end={r.event.end}
                      />
                    )}
                  </td>
                  <td>{r.event?.summary}</td>
                  <td>{r.errors.join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
export default ImportFile;

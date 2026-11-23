import React, { useState, useCallback, useEffect, useRef } from 'react';
import { setUnsavedWork } from './lib/newVersion';
import { Link } from 'wouter';
import { toast } from 'react-toastify';

import { saveEvents } from './google/writes';
import { useDefaultCalendar } from './lib/hooks';
import { userContext } from './userContext';
import { authContext } from './authContext';
import { ViewStartAndEnd } from './ViewStartAndEnd';
import {
  ACCEPT,
  eventIdFor,
  ImportRow,
  isImportable,
  parseCsv,
} from './lib/importCsv';

/** While dragging, browsers expose only MIME types, not names. */
const draggedLooksImportable = (dt: DataTransfer | null) =>
  !!dt &&
  [...dt.items].every(
    (i) =>
      i.kind === 'file' &&
      [
        '',
        'text/csv',
        'text/tab-separated-values',
        'text/plain',
        'application/vnd.ms-excel',
      ].includes(i.type),
  );

const LARGE_IMPORT = 200;

function ImportFile() {
  const defaultCalendar = useDefaultCalendar();
  const user = React.useContext(userContext);
  const { ensureWriteAccess } = React.useContext(authContext);

  const [rows, setRows] = useState<ImportRow[]>([]);
  // Don't auto-reload for a new version while a preview is on screen.
  useEffect(() => {
    setUnsavedWork(rows.length > 0);
    return () => setUnsavedWork(false);
  }, [rows.length]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const readFiles = useCallback(async (files: File[]) => {
    const acceptedFiles = files.filter(isImportable);
    const rejected = files.length - acceptedFiles.length;
    if (rejected > 0) {
      toast.error(
        `Skipped ${rejected} file${rejected === 1 ? '' : 's'}: only .csv and .tsv can be imported.`,
      );
    }
    if (acceptedFiles.length === 0) return;
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

  // Drop-zone state; a counter because dragenter/leave fire for children.
  const dragDepth = useRef(0);
  const [drag, setDrag] = useState<'none' | 'accept' | 'reject'>('none');
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current += 1;
    setDrag(draggedLooksImportable(e.dataTransfer) ? 'accept' : 'reject');
  };
  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDrag('none');
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDrag('none');
    readFiles([...e.dataTransfer.files]);
  };

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
      <label
        className={`dropzone dropzone-${drag}`}
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          type="file"
          className="visually-hidden"
          accept={ACCEPT.join(',')}
          multiple
          aria-label="CSV file to import"
          onChange={(e) => {
            readFiles([...(e.target.files ?? [])]);
            e.target.value = ''; // allow choosing the same file again
          }}
        />
        <p>
          Drop a CSV file here, or click to choose one. Nothing is saved until
          you review it and press Import.
        </p>
        <p style={{ fontSize: 'smaller' }}>
          Columns: Subject, Start Date, Start Time, End Date, End Time,
          Description, Location (Google Calendar CSV format). Rows without a
          time become all-day events.
        </p>
      </label>
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

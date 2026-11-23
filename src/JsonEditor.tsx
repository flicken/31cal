import React, { useId, useMemo, useRef } from 'react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
}

/** Validation message for the editor ("" when valid). */
export function jsonError(text: string): string {
  try {
    JSON.parse(text);
    return '';
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/**
 * Plain monospace JSON editor with live validation. Tab inserts two spaces;
 * press Escape first to move focus out with Tab (so the keyboard isn't trapped).
 */
export default function JsonEditor({ value, onChange }: JsonEditorProps) {
  const helpId = useId();
  const statusId = useId();
  const tabMovesFocus = useRef(false);
  const error = useMemo(() => jsonError(value), [value]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      tabMovesFocus.current = true;
      return;
    }
    if (e.key !== 'Tab' || e.shiftKey || tabMovesFocus.current) return;
    e.preventDefault();
    // execCommand keeps the browser's undo history; fall back if unsupported.
    if (!document.execCommand?.('insertText', false, '  ')) {
      e.currentTarget.setRangeText(
        '  ',
        e.currentTarget.selectionStart,
        e.currentTarget.selectionEnd,
        'end',
      );
      onChange(e.currentTarget.value);
    }
  };

  return (
    <div>
      <textarea
        className="json-editor"
        aria-label="Event JSON"
        aria-describedby={`${helpId} ${statusId}`}
        aria-invalid={!!error}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={14}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => {
          tabMovesFocus.current = false;
        }}
      />
      <div id={helpId} className="json-editor-help">
        Tab indents; press Esc then Tab to leave the editor.
      </div>
      <div
        id={statusId}
        role="status"
        className={error ? 'json-editor-error' : 'json-editor-ok'}
      >
        {error ? `Not valid JSON: ${error}` : 'Valid JSON'}
      </div>
    </div>
  );
}

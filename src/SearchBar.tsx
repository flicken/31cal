import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useOnClickOutside } from 'usehooks-ts';
import {
  DEFAULT_RANGE,
  defaultEventFilters,
  useFilterState,
} from './lib/FilterStateContext';
import {
  parseSearchText,
  toStructuredText,
  formatDate,
  ParsedSearch,
} from './lib/searchTextParser';
import { SEARCH_EXAMPLES } from './lib/syntaxExamples';

export default function SearchBar() {
  const { eventFilters: filters, setEventFilters: setFilters } =
    useFilterState();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inputText, setInputText] = useState(filters.rangeText ?? '');
  const [parsed, setParsed] = useState<ParsedSearch>({
    start: filters.start,
    end: filters.end,
    updatedSince: filters.updatedSince,
  });

  const barRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useOnClickOutside(barRef as React.RefObject<HTMLElement>, () => {
    setShowAdvanced(false);
  });

  const applyFilters = useCallback(
    (result: ParsedSearch) => {
      setParsed(result);
      setFilters((f) => ({
        ...f,
        ...(result.start && result.end
          ? { start: result.start, end: result.end, rangeText: inputText }
          : {}),
        updatedSince: result.updatedSince,
        updatedSinceText: result.updatedSince
          ? formatDate(result.updatedSince)
          : undefined,
      }));
    },
    [setFilters, inputText],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const result = parseSearchText(text);
      applyFilters(result);
    }, 300);
  };

  const commitText = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const result = parseSearchText(inputText);
    applyFilters(result);
    if (result.start || result.end || result.updatedSince) {
      const structured = toStructuredText(result);
      setInputText(structured);
      setFilters((f) => ({ ...f, rangeText: structured }));
    }
  }, [inputText, applyFilters, setFilters]);

  /** Fill the box with an example and apply it right away. */
  const applyExample = useCallback(
    (text: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const result = parseSearchText(text);
      setInputText(text);
      setParsed(result);
      setFilters((f) => ({
        ...f,
        ...(result.start && result.end
          ? { start: result.start, end: result.end, rangeText: text }
          : {}),
        updatedSince: result.updatedSince,
        updatedSinceText: result.updatedSince
          ? formatDate(result.updatedSince)
          : undefined,
      }));
    },
    [setFilters],
  );

  const clearFilters = useCallback(() => {
    const { start, end, rangeText } = defaultEventFilters();
    setInputText(rangeText);
    setParsed({ start, end, updatedSince: undefined });
    setFilters((f) => ({
      ...f,
      start,
      end,
      rangeText,
      updatedSince: undefined,
      updatedSinceText: undefined,
    }));
  }, [setFilters]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitText();
      setShowAdvanced(false);
    } else if (e.key === 'Escape') {
      setShowAdvanced(false);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={barRef} style={{ position: 'relative', minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: '#fff',
          padding: '0 4px',
        }}
      >
        <span
          style={{
            flex: '0 0 auto',
            padding: '0 4px',
            color: '#888',
            fontSize: '14px',
          }}
          title="Date filter"
          aria-hidden="true"
        >
          &#128197;
        </span>
        <input
          type="text"
          value={inputText}
          onChange={onInputChange}
          onFocus={() => setShowAdvanced(true)}
          onBlur={commitText}
          onKeyDown={onKeyDown}
          placeholder="next week, january to march, updated since last monday..."
          aria-label="Date range (for example: next week, january to march, updated since last monday)"
          style={{
            flex: 1,
            padding: '6px 4px',
            fontSize: '14px',
            border: 'none',
            background: 'transparent',
            minWidth: 0,
          }}
        />
        {inputText && inputText !== DEFAULT_RANGE && (
          <button
            onClick={clearFilters}
            title="Reset to default"
            aria-label="Reset date range to default"
            style={{
              flex: '0 0 auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              fontSize: '16px',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        )}
      </div>
      {showAdvanced && (
        <div
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowAdvanced(false);
          }}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ccc',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            padding: '8px 12px',
            zIndex: 10,
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            fontSize: '13px',
            color: '#444',
          }}
        >
          <div>
            <strong>Start:</strong> {formatDate(parsed.start)}
          </div>
          <div>
            <strong>End:</strong> {formatDate(parsed.end)}
          </div>
          <div>
            <strong>Updated since:</strong> {formatDate(parsed.updatedSince)}
          </div>
          <div style={{ marginTop: 6 }}>
            Try:{' '}
            {SEARCH_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="example-chip"
                // Keep focus in the input so blur doesn't commit the old text.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyExample(ex)}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

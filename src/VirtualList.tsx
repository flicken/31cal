import React, { useLayoutEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * Lists longer than this render only the rows near the viewport. Shorter
 * lists render fully, so the browser's find (Ctrl-F) still sees every row.
 */
export const VIRTUALIZE_AFTER = 200;

/** The app scrolls inside #root (see index.css), not the window. */
const scrollElement = () => document.getElementById('root');

/** Distance from the top of the scroll container's content to `el`. */
function offsetInScroller(el: HTMLElement): number {
  const scroller = scrollElement();
  if (!scroller) return el.offsetTop;
  return (
    el.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop
  );
}

export default function VirtualList<T>({
  items,
  getKey,
  renderItem,
  estimateSize = 40,
}: {
  items: readonly T[];
  getKey: (item: T, index: number) => React.Key;
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
}) {
  if (items.length <= VIRTUALIZE_AFTER) {
    return (
      <>
        {items.map((item, i) => (
          <React.Fragment key={getKey(item, i)}>
            {renderItem(item, i)}
          </React.Fragment>
        ))}
      </>
    );
  }
  return (
    <Virtualized
      items={items}
      getKey={getKey}
      renderItem={renderItem}
      estimateSize={estimateSize}
    />
  );
}

function Virtualized<T>({
  items,
  getKey,
  renderItem,
  estimateSize,
}: {
  items: readonly T[];
  getKey: (item: T, index: number) => React.Key;
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize: number;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    if (listRef.current) setScrollMargin(offsetInScroller(listRef.current));
  }, []);

  // This project doesn't use React Compiler, so its memoization caveat doesn't apply.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: scrollElement,
    estimateSize: () => estimateSize,
    overscan: 10,
    scrollMargin,
    getItemKey: (i) => getKey(items[i], i),
  });

  return (
    <div
      ref={listRef}
      style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
    >
      {virtualizer.getVirtualItems().map((row) => (
        <div
          key={row.key}
          data-index={row.index}
          ref={virtualizer.measureElement}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${row.start - scrollMargin}px)`,
          }}
        >
          {renderItem(items[row.index], row.index)}
        </div>
      ))}
    </div>
  );
}

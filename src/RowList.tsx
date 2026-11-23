import React from 'react';

/**
 * Renders every row, but with CSS `content-visibility: auto` (see .list-row
 * in App.css) so the browser skips layout and paint for rows off screen.
 * All rows stay in the DOM, so Ctrl-F finds any of them.
 */
export default function RowList<T>({
  items,
  getKey,
  renderItem,
}: {
  items: readonly T[];
  getKey: (item: T, index: number) => React.Key;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <>
      {items.map((item, i) => (
        <div className="list-row" key={getKey(item, i)}>
          {renderItem(item, i)}
        </div>
      ))}
    </>
  );
}

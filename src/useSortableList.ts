import { useRef, useState, useCallback } from 'react';

export interface DragState {
  fromIndex: number;
  overIndex: number;
}

interface UseSortableListOptions {
  /** Minimum px distance before a pointer movement counts as a drag */
  threshold?: number;
  /** CSS class added to the dragged element */
  draggingClass?: string;
  /** CSS selector — pointerdown on matching elements won't start a drag */
  ignoreSelector?: string;
}

/**
 * Generic hook for drag-to-reorder behaviour over a flat list of DOM elements.
 *
 * Returns:
 *  - `itemRefs`  – a stable ref holding a Map<index, HTMLElement> that each
 *                  item should register itself into (via useEffect).
 *  - `dragState` – which item is being dragged and where it currently hovers,
 *                  so consumers can render drop indicators.
 *  - `createPointerDownHandler(index, onReorder)` – factory that returns the
 *                  onPointerDown handler for a given list item.
 */
export function useSortableList(options: UseSortableListOptions = {}) {
  const {
    threshold = 4,
    draggingClass = 'sortableHelper',
    ignoreSelector = '[role="button"]',
  } = options;

  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());
  const [dragState, setDragState] = useState<DragState | null>(null);

  const createPointerDownHandler = useCallback(
    (
      index: number,
      onReorder: (fromIndex: number, toIndex: number) => void,
    ) => {
      return (e: React.PointerEvent) => {
        if (
          ignoreSelector &&
          (e.target as HTMLElement).closest(ignoreSelector)
        )
          return;

        e.preventDefault();

        const node = itemRefs.current.get(index);
        if (!node) return;

        const startX = e.clientX;
        const startY = e.clientY;
        let dragging = false;
        let currentOverIndex = index;

        const findClosestIndex = () => {
          const rect = node.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          let closest = index;
          let minDist = Infinity;
          itemRefs.current.forEach((el, i) => {
            if (i === index) return;
            const r = el.getBoundingClientRect();
            const d = Math.hypot(
              cx - (r.left + r.width / 2),
              cy - (r.top + r.height / 2),
            );
            if (d < minDist) {
              minDist = d;
              closest = i;
            }
          });
          return closest;
        };

        const onMove = (e: PointerEvent) => {
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;

          if (!dragging) {
            if (Math.hypot(dx, dy) < threshold) return;
            dragging = true;
            node.classList.add(draggingClass);
          }

          node.style.translate = `${dx}px ${dy}px`;

          const newOver = findClosestIndex();
          if (newOver !== currentOverIndex) {
            currentOverIndex = newOver;
            setDragState({ fromIndex: index, overIndex: currentOverIndex });
          }
        };

        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);

          node.classList.remove(draggingClass);
          node.style.removeProperty('translate');

          setDragState(null);

          if (dragging && currentOverIndex !== index) {
            onReorder(index, currentOverIndex);
          }
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };
    },
    [threshold, draggingClass, ignoreSelector],
  );

  return { itemRefs, dragState, createPointerDownHandler };
}

import { useRef, useState, useCallback, useEffect } from 'react';

export interface DragState {
  fromIndex: number;
  overIndex: number;
}

export type Rect = { left: number; top: number; width: number; height: number };

/**
 * Where a dragged item would land: the item whose ORIGINAL position (rects
 * snapshotted when the drag started) is closest to the pointer. The dragged
 * item's own slot counts, so dragging out and back cancels the move.
 */
export function dropIndex(
  rects: Map<number, Rect>,
  pointer: { x: number; y: number },
  fromIndex: number,
): number {
  let best = fromIndex;
  let bestDist = Infinity;
  rects.forEach((r, i) => {
    const d = Math.hypot(
      pointer.x - (r.left + r.width / 2),
      pointer.y - (r.top + r.height / 2),
    );
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

interface UseSortableListOptions {
  /** CSS class added to the dragged element */
  draggingClass?: string;
  /** Pointer-downs on (or inside) matching elements never start a drag */
  ignoreSelector?: string;
}

/** Movement before a press becomes a drag: fingers jitter more than mice. */
const THRESHOLD = { mouse: 5, pen: 8, touch: 12 } as Record<string, number>;

/**
 * Drag-to-reorder over a flat list of elements, for mouse, pen and touch.
 *
 * - Pointer capture keeps the drag even when the pointer leaves the item.
 * - pointercancel (the browser taking over the gesture) and Escape abort
 *   without reordering.
 * - The click that ends a real drag is swallowed, so releasing over a button
 *   inside the item (e.g. remove) doesn't also trigger it.
 * - Items need `touch-action: none` so touch drags aren't turned into scrolls.
 */
export function useSortableList(options: UseSortableListOptions = {}) {
  const { draggingClass = 'sortableHelper', ignoreSelector = 'button' } =
    options;

  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());
  const [dragState, setDragState] = useState<DragState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const createPointerDownHandler = useCallback(
    (
      index: number,
      onReorder: (fromIndex: number, toIndex: number) => void,
    ) => {
      return (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        if (ignoreSelector && (e.target as HTMLElement).closest(ignoreSelector))
          return;
        const node = itemRefs.current.get(index);
        if (!node) return;
        cleanupRef.current?.();

        const pointerId = e.pointerId;
        const startX = e.clientX;
        const startY = e.clientY;
        const threshold = THRESHOLD[e.pointerType] ?? 5;
        let dragging = false;
        let over = index;
        let rects = new Map<number, Rect>();

        const reset = () => {
          node.classList.remove(draggingClass);
          node.style.removeProperty('translate');
          if (node.hasPointerCapture?.(pointerId)) {
            node.releasePointerCapture(pointerId);
          }
          node.removeEventListener('pointermove', onMove);
          node.removeEventListener('pointerup', onUp);
          node.removeEventListener('pointercancel', onCancel);
          window.removeEventListener('keydown', onKey, true);
          cleanupRef.current = null;
          setDragState(null);
        };

        const onMove = (move: PointerEvent) => {
          if (move.pointerId !== pointerId) return;
          const dx = move.clientX - startX;
          const dy = move.clientY - startY;
          if (!dragging) {
            if (Math.hypot(dx, dy) < threshold) return;
            dragging = true;
            rects = new Map();
            itemRefs.current.forEach((el, i) =>
              rects.set(i, el.getBoundingClientRect()),
            );
            node.classList.add(draggingClass);
          }
          move.preventDefault();
          node.style.translate = `${dx}px ${dy}px`;
          const next = dropIndex(
            rects,
            { x: move.clientX, y: move.clientY },
            index,
          );
          if (next !== over) {
            over = next;
            setDragState(
              over === index ? null : { fromIndex: index, overIndex: over },
            );
          }
        };

        const onUp = (up: PointerEvent) => {
          if (up.pointerId !== pointerId) return;
          const moved = dragging;
          const target = over;
          reset();
          if (moved) {
            // Swallow the click the browser fires after this pointerup.
            const swallow = (c: MouseEvent) => {
              c.stopPropagation();
              c.preventDefault();
            };
            window.addEventListener('click', swallow, {
              capture: true,
              once: true,
            });
            setTimeout(
              () => window.removeEventListener('click', swallow, true),
              0,
            );
            if (target !== index) onReorder(index, target);
          }
        };

        const onCancel = (c: PointerEvent) => {
          if (c.pointerId === pointerId) reset();
        };

        const onKey = (k: KeyboardEvent) => {
          if (k.key === 'Escape' && dragging) {
            k.preventDefault();
            k.stopPropagation();
            reset();
          }
        };

        node.setPointerCapture?.(pointerId);
        node.addEventListener('pointermove', onMove);
        node.addEventListener('pointerup', onUp);
        node.addEventListener('pointercancel', onCancel);
        window.addEventListener('keydown', onKey, true);
        cleanupRef.current = reset;
      };
    },
    [draggingClass, ignoreSelector],
  );

  return { itemRefs, dragState, createPointerDownHandler };
}

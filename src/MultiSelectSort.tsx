import React, {
  useRef,
  useCallback,
  useContext,
  createContext,
  useEffect,
} from 'react';
import Select, {
  components,
  MultiValueProps,
  OnChangeValue,
} from 'react-select';
import { DragState, useSortableList } from './useSortableList';

function arrayMove<T>(array: readonly T[], from: number, to: number) {
  const slicedArray = array.slice();
  slicedArray.splice(
    to < 0 ? array.length + to : to,
    0,
    slicedArray.splice(from, 1)[0],
  );
  return slicedArray;
}

interface SortContextType {
  itemRefs: React.MutableRefObject<Map<number, HTMLElement>>;
  onReorder: (fromIndex: number, toIndex: number) => void;
  dragState: DragState | null;
  createPointerDownHandler: (
    index: number,
    onReorder: (from: number, to: number) => void,
  ) => (e: React.PointerEvent) => void;
  InnerMultiValue: React.ComponentType<MultiValueProps<any>>;
}

const SortCtx = createContext<SortContextType>(null!);

function DraggableMultiValue(props: MultiValueProps<any>) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const { itemRefs, onReorder, dragState, createPointerDownHandler, InnerMultiValue } =
    useContext(SortCtx);
  const index = props.index;

  useEffect(() => {
    const el = nodeRef.current;
    if (el) itemRefs.current.set(index, el);
    return () => {
      itemRefs.current.delete(index);
    };
  }, [index, itemRefs]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => createPointerDownHandler(index, onReorder)(e),
    [index, onReorder, createPointerDownHandler],
  );

  const onMouseDown: React.MouseEventHandler = (e) => {
    // Prevent react-select from toggling the menu on chip click,
    // but allow clicks on the remove button through.
    if (!(e.target as HTMLElement).closest('[role="button"]')) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const showLeft =
    dragState?.overIndex === index && dragState.fromIndex > index;
  const showRight =
    dragState?.overIndex === index && dragState.fromIndex < index;

  return (
    <div
      ref={nodeRef}
      onPointerDown={handlePointerDown}
      onMouseDown={onMouseDown}
      style={{
        cursor: 'grab',
        borderLeft: showLeft ? '3px solid #2684FF' : undefined,
        borderRight: showRight ? '3px solid #2684FF' : undefined,
        transition: 'border 150ms ease',
      }}
    >
      <InnerMultiValue {...props} />
    </div>
  );
}

export default function MultiSelectSort(props: any) {
  const { onChange, value, components: externalComponents, ...rest } = props;
  const { MultiValue: ExternalMultiValue, ...otherExternalComponents } =
    externalComponents || {};
  const { itemRefs, dragState, createPointerDownHandler } = useSortableList();

  const InnerMultiValue = ExternalMultiValue || components.MultiValue;

  const doOnChange = useCallback(
    (selectedOptions: OnChangeValue<any, true>) => {
      onChange(selectedOptions);
    },
    [onChange],
  );

  const onReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newValue = arrayMove(value, fromIndex, toIndex);
      doOnChange(newValue);
    },
    [value, doOnChange],
  );

  return (
    <SortCtx.Provider
      value={{ itemRefs, onReorder, dragState, createPointerDownHandler, InnerMultiValue }}
    >
      <Select
        isMulti
        value={value}
        onChange={doOnChange}
        closeMenuOnSelect={false}
        defaultValue={value}
        {...rest}
        components={{
          ...otherExternalComponents,
          // Must come AFTER spread — the animated ValueContainer from
          // makeAnimated() uses TransitionGroup which keeps removed chips
          // in the DOM indefinitely when the MultiValue component lacks
          // react-transition-group callbacks.
          MultiValue: DraggableMultiValue,
          ValueContainer: components.ValueContainer,
        }}
      />
    </SortCtx.Provider>
  );
}

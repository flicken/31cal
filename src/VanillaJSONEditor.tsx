import { JSONEditor, JSONEditorPropsOptional, Mode } from 'vanilla-jsoneditor';
import React, { useEffect, useRef } from 'react';

export default function VanillaJSONEditor(
  props: JSONEditorPropsOptional & { defaultMode: Mode },
) {
  const refContainer = useRef<HTMLDivElement>(null);
  const refEditor = useRef<JSONEditor | null>(null);

  useEffect(() => {
    refEditor.current = new JSONEditor({
      target: refContainer.current!,
      props: {
        ...(props.defaultMode ? { mode: props.defaultMode } : {}),
        ...props,
      },
    });

    return () => {
      if (refEditor.current) {
        refEditor.current.destroy();
        refEditor.current = null;
      }
    };
  }, []);

  // update props
  useEffect(() => {
    if (refEditor.current) {
      refEditor.current.updateProps({ ...props });
    }
  }, [props]);

  return <div style={{ display: 'flex', flex: 1 }} ref={refContainer}></div>;
}

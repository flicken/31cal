import React, { useRef, useEffect, useCallback } from 'react';
import { CodeJar } from 'codejar';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function JsonEditor({ value, onChange }: JsonEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const jarRef = useRef<ReturnType<typeof CodeJar> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const highlight = useCallback((el: HTMLElement) => {
    el.textContent = el.textContent ?? '';
    Prism.highlightElement(el);
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const jar = CodeJar(editorRef.current, highlight, { tab: '  ' });
    jar.updateCode(value);
    jar.onUpdate((code) => onChangeRef.current(code));
    jarRef.current = jar;

    return () => {
      jar.destroy();
      jarRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (jarRef.current && jarRef.current.toString() !== value) {
      jarRef.current.updateCode(value);
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className="language-json"
      style={{
        fontFamily: 'monospace',
        fontSize: 14,
        padding: 10,
        border: '1px solid #ccc',
        borderRadius: 4,
        minHeight: 200,
        whiteSpace: 'pre-wrap',
        overflowY: 'auto',
      }}
    />
  );
}

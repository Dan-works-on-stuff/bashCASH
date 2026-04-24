import { useEffect, useMemo, useState } from 'react';
import './TextEditorModal.css';

interface TextEditorModalProps {
  filePath: string;
  filename: string;
  initialContent: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

export function TextEditorModal({
  filePath,
  filename,
  initialContent,
  onSave,
  onClose,
}: TextEditorModalProps) {
  const [draft, setDraft] = useState(initialContent);
  const [isWriteOutArmed, setIsWriteOutArmed] = useState(false);

  useEffect(() => {
    setDraft(initialContent);
    setIsWriteOutArmed(false);
  }, [initialContent, filePath]);

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        // Keep browser save shortcut from interfering, but nano uses Ctrl+O.
        event.preventDefault();
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        setIsWriteOutArmed(true);
      }

      if (!event.ctrlKey && event.key === 'Enter' && isWriteOutArmed) {
        event.preventDefault();
        onSave(draft);
        setIsWriteOutArmed(false);
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'x') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [draft, isWriteOutArmed, onClose, onSave]);

  const lineCount = useMemo(() => {
    if (draft.length === 0) return 1;
    return draft.split('\n').length;
  }, [draft]);

  return (
    <div className="text-editor-overlay" onClick={onClose}>
      <div className="text-editor-shell" onClick={(event) => event.stopPropagation()}>
        <div className="text-editor-topbar">
          <span>BashCash nano</span>
          <span>{filename}</span>
          <span>{filePath}</span>
        </div>

        <textarea
          className="text-editor-area"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          spellCheck={false}
          autoFocus
        />

        <div className="text-editor-status">
          {lineCount} lines | Ctrl+O write out | Enter save | Ctrl+X close
        </div>
        {isWriteOutArmed ? (
          <div className="text-editor-prompt">File Name to Write: {filename} (press Enter)</div>
        ) : null}
      </div>
    </div>
  );
}


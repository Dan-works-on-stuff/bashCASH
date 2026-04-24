import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TextEditorModal } from './TextEditorModal';

describe('TextEditorModal', () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderModal = (overrides?: {
    onSave?: (content: string) => void;
    onClose?: () => void;
    initialContent?: string;
  }) => {
    const onSave = overrides?.onSave ?? vi.fn();
    const onClose = overrides?.onClose ?? vi.fn();

    act(() => {
      root.render(
        createElement(TextEditorModal, {
          filePath: '/docs/readme.txt',
          filename: 'readme.txt',
          initialContent: overrides?.initialContent ?? 'hello',
          onSave,
          onClose,
        }),
      );
    });

    return { onSave, onClose };
  };

  const fireWindowKey = (key: string, options?: KeyboardEventInit) => {
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...options }));
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('saves only after Ctrl+O then Enter', () => {
    const { onSave } = renderModal();

    fireWindowKey('Enter');
    expect(onSave).not.toHaveBeenCalled();

    fireWindowKey('o', { ctrlKey: true });
    fireWindowKey('Enter');

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith('hello');
  });

  it('does not save on Ctrl+S', () => {
    const { onSave } = renderModal();

    fireWindowKey('s', { ctrlKey: true });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('closes on Ctrl+X', () => {
    const { onClose } = renderModal();

    fireWindowKey('x', { ctrlKey: true });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('saves edited draft after Ctrl+O then Enter', () => {
    const { onSave } = renderModal({ initialContent: 'hello' });
    const textarea = container.querySelector('textarea');
    expect(textarea).not.toBeNull();

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(textarea, 'updated');
      textarea!.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'updated', inputType: 'insertText' }));
    });

    fireWindowKey('o', { ctrlKey: true });
    fireWindowKey('Enter');

    expect(onSave).toHaveBeenCalledWith('updated');
  });
});

import { act, createElement, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/client', () => ({
  deleteSession: vi.fn().mockResolvedValue(undefined),
  getSession: vi.fn().mockResolvedValue(null),
  parseZip: vi.fn(),
  saveSession: vi.fn().mockResolvedValue(undefined),
}));

import { deleteSession } from '../api/client';
import { useBashCashSession } from './useBashCashSession';

function SessionHarness() {
  const session = useBashCashSession();
  const [currentSessionId, setCurrentSessionId] = useState(session.sessionId);

  useEffect(() => {
    setCurrentSessionId(session.sessionId);
  }, [session.sessionId]);

  return createElement(
    'div',
    null,
    createElement('div', { 'data-testid': 'session-id' }, currentSessionId),
    createElement('div', { 'data-testid': 'workspace-state' }, session.vfs ? 'workspace-present' : 'workspace-empty'),
    createElement('button', { type: 'button', onClick: session.startWithDefaultFolder }, 'Use default folder'),
    createElement('button', { type: 'button', onClick: session.handleNewSession }, 'New session'),
  );
}

describe('useBashCashSession', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('resets the workspace and rotates the session id when starting a new session', async () => {
    act(() => {
      root.render(createElement(SessionHarness));
    });

    const startButton = container.querySelector('button:nth-of-type(1)') as HTMLButtonElement;
    const resetButton = container.querySelector('button:nth-of-type(2)') as HTMLButtonElement;
    const sessionIdNode = () => container.querySelector('[data-testid="session-id"]') as HTMLDivElement;
    const workspaceNode = () => container.querySelector('[data-testid="workspace-state"]') as HTMLDivElement;

    expect(workspaceNode().textContent).toBe('workspace-empty');
    const initialSessionId = sessionIdNode().textContent;
    expect(initialSessionId).toBeTruthy();

    await act(async () => {
      startButton.click();
    });

    expect(workspaceNode().textContent).toBe('workspace-present');

    await act(async () => {
      resetButton.click();
    });

    expect(deleteSession).toHaveBeenCalledWith(initialSessionId);
    expect(workspaceNode().textContent).toBe('workspace-empty');
    expect(sessionIdNode().textContent).not.toBe(initialSessionId);
  });
});


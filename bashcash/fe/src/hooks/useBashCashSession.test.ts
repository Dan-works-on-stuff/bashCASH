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

let capturedInitialCommandOutcome: ReturnType<typeof useBashCashSession>['handleCommandOutcome'] | null = null;

function SessionHarness() {
  const session = useBashCashSession();
  const [currentSessionId, setCurrentSessionId] = useState(session.sessionId);

  if (!capturedInitialCommandOutcome) {
    capturedInitialCommandOutcome = session.handleCommandOutcome;
  }

  useEffect(() => {
    setCurrentSessionId(session.sessionId);
  }, [session.sessionId]);

  return createElement(
    'div',
    null,
    createElement('div', { 'data-testid': 'session-id' }, currentSessionId),
    createElement('div', { 'data-testid': 'workspace-state' }, session.vfs ? 'workspace-present' : 'workspace-empty'),
    createElement('div', { 'data-testid': 'cash-balance' }, `${session.cashBalance}`),
    createElement('div', { 'data-testid': 'accuracy-multiplier' }, `${session.accuracyMultiplier.toFixed(1)}x`),
    createElement('button', { type: 'button', onClick: session.startWithDefaultFolder }, 'Use default folder'),
    createElement('button', { type: 'button', onClick: () => session.handleCommandOutcome({ scoreEvent: 'success', newPath: '/', updatedVfs: session.vfs ?? undefined }) }, 'Correct command'),
    createElement('button', { type: 'button', onClick: () => session.handleCommandOutcome({ scoreEvent: 'mistake', newPath: '/', updatedVfs: session.vfs ?? undefined }) }, 'Mistake'),
    createElement('button', { type: 'button', onClick: session.handleNewSession }, 'New session'),
  );
}

describe('useBashCashSession', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    capturedInitialCommandOutcome = null;
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
    const correctButton = container.querySelector('button:nth-of-type(2)') as HTMLButtonElement;
    const mistakeButton = container.querySelector('button:nth-of-type(3)') as HTMLButtonElement;
    const resetButton = container.querySelector('button:nth-of-type(4)') as HTMLButtonElement;
    const sessionIdNode = () => container.querySelector('[data-testid="session-id"]') as HTMLDivElement;
    const workspaceNode = () => container.querySelector('[data-testid="workspace-state"]') as HTMLDivElement;
    const cashNode = () => container.querySelector('[data-testid="cash-balance"]') as HTMLDivElement;
    const multiplierNode = () => container.querySelector('[data-testid="accuracy-multiplier"]') as HTMLDivElement;

    expect(workspaceNode().textContent).toBe('workspace-empty');
    expect(cashNode().textContent).toBe('0');
    expect(multiplierNode().textContent).toBe('1.0x');
    const initialSessionId = sessionIdNode().textContent;
    expect(initialSessionId).toBeTruthy();

    await act(async () => {
      startButton.click();
    });

    expect(workspaceNode().textContent).toBe('workspace-present');

    await act(async () => {
      correctButton.click();
    });

    expect(cashNode().textContent).toBe('10');
    expect(multiplierNode().textContent).toBe('1.1x');

    await act(async () => {
      capturedInitialCommandOutcome?.({ scoreEvent: 'success', newPath: '/', updatedVfs: undefined });
    });

    expect(cashNode().textContent).toBe('20');
    expect(multiplierNode().textContent).toBe('1.2x');

    await act(async () => {
      correctButton.click();
    });

    expect(cashNode().textContent).toBe('30');
    expect(multiplierNode().textContent).toBe('1.3x');

    await act(async () => {
      mistakeButton.click();
    });

    expect(cashNode().textContent).toBe('30');
    expect(multiplierNode().textContent).toBe('1.0x');

    await act(async () => {
      resetButton.click();
    });

    expect(deleteSession).toHaveBeenCalledWith(initialSessionId);
    expect(workspaceNode().textContent).toBe('workspace-empty');
    expect(cashNode().textContent).toBe('0');
    expect(multiplierNode().textContent).toBe('1.0x');
    expect(sessionIdNode().textContent).not.toBe(initialSessionId);
  });
});


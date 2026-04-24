import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { deleteSession, getSession, parseZip, saveSession } from '../api/client';
import { SessionSnapshot, VFSNode } from '../api/types';
import createDefaultVfs from '../utils/defaultVfs';
import { updateFileContent } from '../utils/vfs';
import { CommandModal, type CommandResult } from '../utils/vfs/types';

const SESSION_STORAGE_KEY = 'bashcash.session-id';
const SESSION_SNAPSHOT_STORAGE_PREFIX = 'bashcash.session-snapshot:';
const DEFAULT_CASH_BALANCE = 0;
const DEFAULT_ACCURACY_MULTIPLIER = 1.0;

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return createSessionId();
  }

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const created = createSessionId();
  window.localStorage.setItem(SESSION_STORAGE_KEY, created);
  return created;
}

function rotateSessionId(): string {
  const nextId = createSessionId();
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SESSION_STORAGE_KEY, nextId);
  }
  return nextId;
}

function sessionSnapshotStorageKey(sessionId: string): string {
  return `${SESSION_SNAPSHOT_STORAGE_PREFIX}${sessionId}`;
}

function readCachedSessionSnapshot(sessionId: string): SessionSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(sessionSnapshotStorageKey(sessionId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SessionSnapshot>;
    if (!parsed.vfs) return null;
    return {
      vfs: parsed.vfs,
      current_path: parsed.current_path ?? '/',
      cash_balance: parsed.cash_balance ?? DEFAULT_CASH_BALANCE,
      accuracy_multiplier: parsed.accuracy_multiplier ?? DEFAULT_ACCURACY_MULTIPLIER,
    };
  } catch {
    return null;
  }
}

function createSessionSnapshot(
  vfs: VFSNode | null,
  currentPath: string,
  cashBalance: number,
  accuracyMultiplier: number,
): SessionSnapshot | null {
  if (!vfs) {
    return null;
  }

  return {
    vfs,
    current_path: currentPath,
    cash_balance: cashBalance,
    accuracy_multiplier: accuracyMultiplier,
  };
}

function writeCachedSessionSnapshot(sessionId: string, snapshot: SessionSnapshot): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(sessionSnapshotStorageKey(sessionId), JSON.stringify(snapshot));
}

function clearCachedSessionSnapshot(sessionId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(sessionSnapshotStorageKey(sessionId));
}

export function useBashCashSession() {
  const [sessionId, setSessionId] = useState(() => getOrCreateSessionId());
  const [cachedSnapshot] = useState(() => readCachedSessionSnapshot(sessionId));
  const [vfs, setVfs] = useState<VFSNode | null>(() => cachedSnapshot?.vfs ?? null);
  const [currentPath, setCurrentPath] = useState<string>(() => cachedSnapshot?.current_path ?? '/');
  const [cashBalance, setCashBalance] = useState<number>(() => cachedSnapshot?.cash_balance ?? DEFAULT_CASH_BALANCE);
  const [accuracyMultiplier, setAccuracyMultiplier] = useState<number>(() => cachedSnapshot?.accuracy_multiplier ?? DEFAULT_ACCURACY_MULTIPLIER);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isResettingSession, setIsResettingSession] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<CommandModal | null>(null);
  const sessionIdRef = useRef(sessionId);
  const vfsRef = useRef<VFSNode | null>(vfs);
  const currentPathRef = useRef(currentPath);
  const cashBalanceRef = useRef(cashBalance);
  const accuracyMultiplierRef = useRef(accuracyMultiplier);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    vfsRef.current = vfs;
  }, [vfs]);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    cashBalanceRef.current = cashBalance;
  }, [cashBalance]);

  useEffect(() => {
    accuracyMultiplierRef.current = accuracyMultiplier;
  }, [accuracyMultiplier]);

  const persistSession = useCallback(
    async (snapshot: SessionSnapshot) => {
      const activeSessionId = sessionIdRef.current;
      writeCachedSessionSnapshot(activeSessionId, snapshot);
      try {
        await saveSession(activeSessionId, snapshot);
      } catch (err: any) {
        setError(err.message || 'Failed to save session');
      }
    },
    [],
  );

  const persistCurrentSession = useCallback(
    (nextVfs: VFSNode | null, nextPath: string, nextCashBalance: number, nextAccuracyMultiplier: number) => {
      const snapshot = createSessionSnapshot(nextVfs, nextPath, nextCashBalance, nextAccuracyMultiplier);
      if (!snapshot) return;

      void persistSession(snapshot);
    },
    [persistSession],
  );

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      setIsRestoringSession(true);
      try {
        const savedSession = await getSession(sessionId);
        if (cancelled) {
          return;
        }

        if (!savedSession) {
          const fallbackSession = readCachedSessionSnapshot(sessionId);
          if (fallbackSession) {
            setVfs(fallbackSession.vfs);
            setCurrentPath(fallbackSession.current_path);
            setCashBalance(fallbackSession.cash_balance);
            setAccuracyMultiplier(fallbackSession.accuracy_multiplier);
          } else {
            setVfs(null);
            setCurrentPath('/');
            setCashBalance(DEFAULT_CASH_BALANCE);
            setAccuracyMultiplier(DEFAULT_ACCURACY_MULTIPLIER);
          }
          return;
        }

        setVfs(savedSession.vfs);
        setCurrentPath(savedSession.current_path);
        setCashBalance(savedSession.cash_balance ?? DEFAULT_CASH_BALANCE);
        setAccuracyMultiplier(savedSession.accuracy_multiplier ?? DEFAULT_ACCURACY_MULTIPLIER);
        writeCachedSessionSnapshot(sessionId, {
          vfs: savedSession.vfs,
          current_path: savedSession.current_path,
          cash_balance: savedSession.cash_balance ?? DEFAULT_CASH_BALANCE,
          accuracy_multiplier: savedSession.accuracy_multiplier ?? DEFAULT_ACCURACY_MULTIPLIER,
        });
      } catch (err: any) {
        if (!cancelled) {
          const fallbackSession = readCachedSessionSnapshot(sessionId);
          if (fallbackSession) {
            setVfs(fallbackSession.vfs);
            setCurrentPath(fallbackSession.current_path);
            setCashBalance(fallbackSession.cash_balance);
            setAccuracyMultiplier(fallbackSession.accuracy_multiplier);
          } else {
            setError(err.message || 'Failed to restore session');
          }
        }
      } finally {
        if (!cancelled) {
          setIsRestoringSession(false);
        }
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const handlePathChange = useCallback(
    (nextPath: string) => {
      setCurrentPath(nextPath);
      persistCurrentSession(vfsRef.current, nextPath, cashBalanceRef.current, accuracyMultiplierRef.current);
    },
    [persistCurrentSession],
  );

  const handleVfsChange = useCallback(
    (nextVfs: VFSNode) => {
      setVfs(nextVfs);
      persistCurrentSession(nextVfs, currentPathRef.current, cashBalanceRef.current, accuracyMultiplierRef.current);
    },
    [persistCurrentSession],
  );

  const handleCommandOutcome = useCallback(
    (result: Pick<CommandResult, 'scoreEvent' | 'newPath' | 'updatedVfs'>) => {
      const { scoreEvent } = result;
      if (!scoreEvent || scoreEvent === 'none') {
        return;
      }

      const currentCashBalance = cashBalanceRef.current;
      const currentAccuracyMultiplier = accuracyMultiplierRef.current;
      const nextCashBalance = scoreEvent === 'success' ? currentCashBalance + 10 : currentCashBalance;
      const nextAccuracyMultiplier = scoreEvent === 'success' ? Number((currentAccuracyMultiplier + 0.1).toFixed(1)) : DEFAULT_ACCURACY_MULTIPLIER;

      setCashBalance(nextCashBalance);
      setAccuracyMultiplier(nextAccuracyMultiplier);
      persistCurrentSession(result.updatedVfs ?? vfsRef.current, result.newPath, nextCashBalance, nextAccuracyMultiplier);
    },
    [persistCurrentSession],
  );

  const handleNewSession = useCallback(() => {
    setError('');
    setIsResettingSession(true);

    const previousSessionId = sessionId;

    clearCachedSessionSnapshot(previousSessionId);
    setModal(null);
    setVfs(null);
    setCurrentPath('/');
    setCashBalance(DEFAULT_CASH_BALANCE);
    setAccuracyMultiplier(DEFAULT_ACCURACY_MULTIPLIER);
    setSessionId(rotateSessionId());
    setIsResettingSession(false);

    void Promise.resolve(deleteSession(previousSessionId)).catch((err: any) => {
      console.warn('[bashcash] deleteSession during reset failed', err);
    });
  }, [sessionId]);

  const handleEditorSave = useCallback(
    (filePath: string, content: string) => {
      const currentVfs = vfsRef.current;
      if (!currentVfs) return;

      const nextVfs = updateFileContent(currentVfs, filePath, content);
      setVfs(nextVfs);

      setModal((prev) => {
        if (!prev || prev.type !== 'text-editor' || prev.filePath !== filePath) return prev;
        return { ...prev, content };
      });

      persistCurrentSession(nextVfs, currentPathRef.current, cashBalanceRef.current, accuracyMultiplierRef.current);
    },
    [persistCurrentSession],
  );

  const startWithDefaultFolder = useCallback(() => {
    setError('');
    setIsLoading(false);
    setCashBalance(DEFAULT_CASH_BALANCE);
    setAccuracyMultiplier(DEFAULT_ACCURACY_MULTIPLIER);
    const defaultVfs = createDefaultVfs();
    setVfs(defaultVfs);
    setCurrentPath('/');
    persistCurrentSession(defaultVfs, '/', DEFAULT_CASH_BALANCE, DEFAULT_ACCURACY_MULTIPLIER);
  }, [persistCurrentSession]);

  const handleFileUpload = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setIsLoading(true);
      setError('');
      const reader = new FileReader();
      reader.onload = async (loadEvent) => {
        try {
          const result = loadEvent.target?.result as string;
          const base64Data = result.split(',')[1];
          if (!base64Data) {
            setError('Failed to read file as base64');
            return;
          }
          const response = await parseZip(base64Data);
          setCashBalance(DEFAULT_CASH_BALANCE);
          setAccuracyMultiplier(DEFAULT_ACCURACY_MULTIPLIER);
          setVfs(response.vfs);
          setCurrentPath('/');
          persistCurrentSession(response.vfs, '/', DEFAULT_CASH_BALANCE, DEFAULT_ACCURACY_MULTIPLIER);
        } catch (err: any) {
          setError(err.message || 'An error occurred');
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    },
    [persistCurrentSession],
  );

  return {
    vfs,
    currentPath,
    cashBalance,
    accuracyMultiplier,
    isLoading,
    isRestoringSession,
    isResettingSession,
    error,
    modal,
    sessionId,
    handlePathChange,
    handleVfsChange,
    handleCommandOutcome,
    handleNewSession,
    handleEditorSave,
    startWithDefaultFolder,
    handleFileUpload,
    setModal,
  };
}

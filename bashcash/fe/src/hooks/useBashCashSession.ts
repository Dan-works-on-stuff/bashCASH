import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { deleteSession, getSession, parseZip, saveSession } from '../api/client';
import { SessionSnapshot, VFSNode } from '../api/types';
import createDefaultVfs from '../utils/defaultVfs';
import { updateFileContent } from '../utils/vfs';
import { CommandModal } from '../utils/vfs/types';

const SESSION_STORAGE_KEY = 'bashcash.session-id';
const SESSION_SNAPSHOT_STORAGE_PREFIX = 'bashcash.session-snapshot:';

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
    return JSON.parse(raw) as SessionSnapshot;
  } catch {
    return null;
  }
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
  const [vfs, setVfs] = useState<VFSNode | null>(() => readCachedSessionSnapshot(sessionId)?.vfs ?? null);
  const [currentPath, setCurrentPath] = useState<string>(() => readCachedSessionSnapshot(sessionId)?.current_path ?? '/');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isResettingSession, setIsResettingSession] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<CommandModal | null>(null);

  const persistSession = useCallback(
    async (snapshot: SessionSnapshot) => {
      writeCachedSessionSnapshot(sessionId, snapshot);
      try {
        await saveSession(sessionId, snapshot);
      } catch (err: any) {
        setError(err.message || 'Failed to save session');
      }
    },
    [sessionId],
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
          } else {
            setVfs(null);
            setCurrentPath('/');
          }
          return;
        }

        setVfs(savedSession.vfs);
        setCurrentPath(savedSession.current_path);
        writeCachedSessionSnapshot(sessionId, {
          vfs: savedSession.vfs,
          current_path: savedSession.current_path,
        });
      } catch (err: any) {
        if (!cancelled) {
          const fallbackSession = readCachedSessionSnapshot(sessionId);
          if (fallbackSession) {
            setVfs(fallbackSession.vfs);
            setCurrentPath(fallbackSession.current_path);
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
      if (vfs) {
        const snapshot = {
          vfs,
          current_path: nextPath,
        };
        writeCachedSessionSnapshot(sessionId, snapshot);
        void persistSession(snapshot);
      }
    },
    [persistSession, sessionId, vfs],
  );

  const handleVfsChange = useCallback(
    (nextVfs: VFSNode) => {
      setVfs(nextVfs);
      const snapshot = {
        vfs: nextVfs,
        current_path: currentPath,
      };
      writeCachedSessionSnapshot(sessionId, snapshot);
      void persistSession(snapshot);
    },
    [currentPath, persistSession, sessionId],
  );

  const handleNewSession = useCallback(() => {
    setError('');
    setIsResettingSession(true);

    const previousSessionId = sessionId;

    clearCachedSessionSnapshot(previousSessionId);
    setModal(null);
    setVfs(null);
    setCurrentPath('/');
    setSessionId(rotateSessionId());
    setIsResettingSession(false);

    void Promise.resolve(deleteSession(previousSessionId)).catch((err: any) => {
      console.warn('[bashcash] deleteSession during reset failed', err);
    });
  }, [sessionId]);

  const handleEditorSave = useCallback(
    (filePath: string, content: string) => {
      if (!vfs) return;

      const nextVfs = updateFileContent(vfs, filePath, content);
      setVfs(nextVfs);

      setModal((prev) => {
        if (!prev || prev.type !== 'text-editor' || prev.filePath !== filePath) return prev;
        return { ...prev, content };
      });

      const snapshot = {
        vfs: nextVfs,
        current_path: currentPath,
      };
      writeCachedSessionSnapshot(sessionId, snapshot);
      void persistSession(snapshot);
    },
    [currentPath, persistSession, sessionId, vfs],
  );

  const startWithDefaultFolder = useCallback(() => {
    setError('');
    setIsLoading(false);
    const defaultVfs = createDefaultVfs();
    setVfs(defaultVfs);
    setCurrentPath('/');
    const snapshot = {
      vfs: defaultVfs,
      current_path: '/',
    };
    writeCachedSessionSnapshot(sessionId, snapshot);
    void persistSession(snapshot);
  }, [persistSession, sessionId]);

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
          setVfs(response.vfs);
          setCurrentPath('/');
          const snapshot = {
            vfs: response.vfs,
            current_path: '/',
          };
          writeCachedSessionSnapshot(sessionId, snapshot);
          void persistSession(snapshot);
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
    [persistSession, sessionId],
  );

  return {
    vfs,
    currentPath,
    isLoading,
    isRestoringSession,
    isResettingSession,
    error,
    modal,
    sessionId,
    handlePathChange,
    handleVfsChange,
    handleNewSession,
    handleEditorSave,
    startWithDefaultFolder,
    handleFileUpload,
    setModal,
  };
}

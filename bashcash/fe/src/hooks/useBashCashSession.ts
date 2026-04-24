import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { deleteSession, getSession, parseZip, saveSession } from '../api/client';
import { SessionSnapshot, VFSNode } from '../api/types';
import createDefaultVfs from '../utils/defaultVfs';
// @ts-ignore
import { updateFileContent } from '../utils/vfs';
import { CommandModal } from '../utils/vfs/types';

const SESSION_STORAGE_KEY = 'bashcash.session-id';

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

export function useBashCashSession() {
  const [vfs, setVfs] = useState<VFSNode | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isResettingSession, setIsResettingSession] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<CommandModal | null>(null);
  const [sessionId, setSessionId] = useState(() => getOrCreateSessionId());

  const persistSession = useCallback(
    async (snapshot: SessionSnapshot) => {
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
        if (cancelled || !savedSession) {
          if (!cancelled) {
            setVfs(null);
            setCurrentPath('/');
          }
          return;
        }

        setVfs(savedSession.vfs);
        setCurrentPath(savedSession.current_path);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to restore session');
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
        void persistSession({
          vfs,
          current_path: nextPath,
        });
      }
    },
    [persistSession, vfs],
  );

  const handleVfsChange = useCallback(
    (nextVfs: VFSNode) => {
      setVfs(nextVfs);
      void persistSession({
        vfs: nextVfs,
        current_path: currentPath,
      });
    },
    [currentPath, persistSession],
  );

  const handleNewSession = useCallback(async () => {
    setError('');
    setIsResettingSession(true);

    try {
      await deleteSession(sessionId);
      setModal(null);
      setVfs(null);
      setCurrentPath('/');
      setSessionId(rotateSessionId());
    } catch (err: any) {
      setError(err.message || 'Failed to reset session');
    } finally {
      setIsResettingSession(false);
    }
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

      void persistSession({
        vfs: nextVfs,
        current_path: currentPath,
      });
    },
    [currentPath, persistSession, vfs],
  );

  const startWithDefaultFolder = useCallback(() => {
    setError('');
    setIsLoading(false);
    const defaultVfs = createDefaultVfs();
    setVfs(defaultVfs);
    setCurrentPath('/');
    void persistSession({
      vfs: defaultVfs,
      current_path: '/',
    });
  }, [persistSession]);

  const handleFileUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
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
        void persistSession({
          vfs: response.vfs,
          current_path: '/',
        });
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
  }, [persistSession]);

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


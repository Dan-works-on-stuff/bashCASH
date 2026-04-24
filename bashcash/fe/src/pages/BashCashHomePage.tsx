import { TerminalUI } from '../components/TerminalUI';
import { VfsTree } from '../components/VfsTree';
import { ImageModal } from '../components/ImageModal';
import { TextEditorModal } from '../components/TextEditorModal';
import { useBashCashSession } from '../hooks/useBashCashSession';
import './BashCashHomePage.css';

export function BashCashHomePage() {
  const {
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
  } = useBashCashSession();

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <div style={{ width: '300px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '0.75rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
            Session: <code>{sessionId}</code>
          </p>
          <button
            type="button"
            onClick={() => void handleNewSession()}
            disabled={isLoading || isRestoringSession || isResettingSession}
            className={`start-session-action ${isLoading || isRestoringSession || isResettingSession ? 'is-disabled' : ''}`}
            style={{ marginBottom: 0, cursor: isLoading || isRestoringSession || isResettingSession ? 'not-allowed' : 'pointer' }}
          >
            {isResettingSession ? 'Resetting...' : 'New session'}
          </button>
        </div>
        {!vfs ? (
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>1. Start Session</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: '#888' }}>
              Upload a .zip file, or use the default folder template to start immediately.
            </p>
            <label
              htmlFor="zip-upload"
              className={`start-session-action ${isLoading ? 'is-disabled' : ''}`}
              style={{ marginBottom: '0.5rem', cursor: isLoading || isRestoringSession || isResettingSession ? 'not-allowed' : 'pointer' }}
            >
              Upload your own
            </label>
            <input
              id="zip-upload"
              type="file"
              accept=".zip"
              onChange={handleFileUpload}
              disabled={isLoading || isRestoringSession || isResettingSession}
              style={{ display: 'none' }}
            />
            <p
              style={{
                margin: '0.25rem 0 0.5rem',
                textAlign: 'center',
                color: '#888',
                fontSize: '0.8rem',
              }}
            >
              ------or------
            </p>
            <button
              type="button"
              onClick={startWithDefaultFolder}
              disabled={isLoading || isRestoringSession || isResettingSession}
              className={`start-session-action ${isLoading || isRestoringSession || isResettingSession ? 'is-disabled' : ''}`}
              style={{ marginBottom: '0.75rem', cursor: isLoading || isRestoringSession || isResettingSession ? 'not-allowed' : 'pointer' }}
            >
              Use default folder
            </button>
            {isRestoringSession && <p style={{ marginTop: '1rem', color: 'var(--primary-color)' }}>Restoring session...</p>}
            {isLoading && <p style={{ marginTop: '1rem', color: 'var(--primary-color)' }}>Parsing...</p>}
            {error && <p style={{ marginTop: '1rem', color: '#ef4444' }}>{error}</p>}
          </div>
        ) : (
          <VfsTree data={vfs} />
        )}
      </div>
      {/* Main Terminal Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TerminalUI 
            vfs={vfs} 
            currentPath={currentPath} 
            onPathChange={handlePathChange}
            onVfsChange={handleVfsChange}
            onModalOpen={setModal}
        />
      </div>
      {modal?.type === 'image' && (
        <ImageModal
          url={modal.url}
          filename={modal.filename}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'text-editor' && (
        <TextEditorModal
          filePath={modal.filePath}
          filename={modal.filename}
          initialContent={modal.content}
          onSave={(content) => handleEditorSave(modal.filePath, content)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

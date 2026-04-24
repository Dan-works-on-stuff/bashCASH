import { BashCashLayout } from './components/BashCashLayout';
import { BashCashHomePage } from './pages/BashCashHomePage';
import { useBashCashSession } from './hooks/useBashCashSession';
function App() {
  const session = useBashCashSession();

  return (
    <BashCashLayout cashBalance={session.cashBalance} accuracyMultiplier={session.accuracyMultiplier}>
      <BashCashHomePage
        vfs={session.vfs}
        currentPath={session.currentPath}
        isLoading={session.isLoading}
        isRestoringSession={session.isRestoringSession}
        isResettingSession={session.isResettingSession}
        error={session.error}
        modal={session.modal}
        sessionId={session.sessionId}
        handlePathChange={session.handlePathChange}
        handleVfsChange={session.handleVfsChange}
        handleCommandOutcome={session.handleCommandOutcome}
        handleNewSession={session.handleNewSession}
        handleEditorSave={session.handleEditorSave}
        startWithDefaultFolder={session.startWithDefaultFolder}
        handleFileUpload={session.handleFileUpload}
        setModal={session.setModal}
      />
    </BashCashLayout>
  );
}
export default App;
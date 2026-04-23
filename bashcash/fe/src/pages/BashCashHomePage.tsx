import { useState } from 'react';
import { TerminalUI } from '../components/TerminalUI';
import { VfsTree } from '../components/VfsTree';
import { parseZip } from '../api/client';
import { VFSNode } from '../api/types';
import createDefaultVfs from '../utils/defaultVfs';
export function BashCashHomePage() {
  const [vfs, setVfs] = useState<VFSNode | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const startWithDefaultFolder = () => {
    setError('');
    setIsLoading(false);
    setVfs(createDefaultVfs());
    setCurrentPath('/');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setError('');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = event.target?.result as string;
        const base64Data = result.split(',')[1];
        if (!base64Data) throw new Error('Failed to read file as base64');
        const response = await parseZip(base64Data);
        setVfs(response.vfs);
        setCurrentPath('/');
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
  };
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      {/* Sidebar: Either Upload or Tree */}
      <div style={{ width: '300px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        {!vfs ? (
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>1. Start Session</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: '#888' }}>
              Upload a .zip file, or use the default folder template to start immediately.
            </p>
            <button
              type="button"
              onClick={startWithDefaultFolder}
              disabled={isLoading}
              style={{
                display: 'block',
                width: '100%',
                marginBottom: '0.75rem',
                padding: '0.5rem 0.75rem',
                background: 'transparent',
                color: 'var(--primary-color)',
                border: '1px solid var(--primary-color)',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              Use default folder
            </button>
            <input 
              type="file" 
              accept=".zip" 
              onChange={handleFileUpload}
              disabled={isLoading}
              style={{ display: 'block', width: '100%', color: 'var(--text-color)' }}
            />
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
            onPathChange={setCurrentPath} 
        />
      </div>
    </div>
  );
}

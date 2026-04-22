import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { VFSNode } from '../api/types';
import { executeCommand } from '../utils/vfs';
interface TerminalProps {
  vfs: VFSNode | null;
  currentPath: string;
  onPathChange: (newPath: string) => void;
}
export function TerminalUI({ vfs, currentPath, onPathChange }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const inputBuffer = useRef<string>('');
  const stateRef = useRef({ vfs, currentPath });
  useEffect(() => {
    stateRef.current = { vfs, currentPath };
  }, [vfs, currentPath]);
  useEffect(() => {
    if (!terminalRef.current) return;
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#0a0a0a',
        foreground: '#f3f4f6',
        cursor: '#4ade80',
      },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    term.writeln('Welcome to BashCash Terminal \x1B[1;3;31m(v1.0)\x1B[0m');
    term.writeln('Upload a ZIP file to begin your session.\r\n');
    term.write('\r\nbashcash:/$ ');
    term.onData((data) => {
      const char = data;
      if (char === '\r') {
        const cmd = inputBuffer.current;
        inputBuffer.current = '';
        term.writeln('');
        const { output, newPath } = executeCommand(
            stateRef.current.vfs, 
            stateRef.current.currentPath, 
            cmd
        );
        if (output) {
            if (cmd.trim() === 'clear') {
                term.write(output);
            } else {
                term.writeln(output);
            }
        }
        if (newPath !== stateRef.current.currentPath) {
            onPathChange(newPath);
            term.write(`bashcash:${newPath}$ `);
        } else {
            term.write(`bashcash:${newPath}$ `);
        }
      } 
      else if (char === '\u007f') {
        if (inputBuffer.current.length > 0) {
          inputBuffer.current = inputBuffer.current.slice(0, -1);
          term.write('\b \b');
        }
      } 
      else {
        if (char >= String.fromCharCode(0x20) && char <= String.fromCharCode(0x7E)) {
            inputBuffer.current += char;
            term.write(char);
        }
      }
    });
    xtermRef.current = term;
    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 
  return <div ref={terminalRef} style={{ width: '100%', height: '100%', padding: '1rem', backgroundColor: '#0a0a0a' }} />;
}

import { VFSNode } from '../../api/types';
import { handleBasicCommands } from './command-handlers/basic';
import { handleInteractiveCommands } from './command-handlers/interactive';
// @ts-ignore
import { handleMutateCommands } from './command-handlers/mutate';
// @ts-ignore
import { handleReadCommands } from './command-handlers/read';
import { CommandResult } from './types';

export function executeCommand(
  vfs: VFSNode | null,
  currentPath: string,
  commandStr: string,
): CommandResult {
  const trimmed = commandStr.trim();
  if (!trimmed) return { output: '', newPath: currentPath };
  if (!vfs) {
    if (trimmed === 'clear') return { output: '\x1b[2J\x1b[H', newPath: currentPath };
    return { output: 'Error: No workspace uploaded. Please upload a .zip file first.', newPath: currentPath };
  }

  const args = trimmed.split(/\s+/);
  const cmd = args.shift()!;
  const handlers = [handleBasicCommands, handleReadCommands, handleMutateCommands, handleInteractiveCommands];

  for (const handler of handlers) {
    const result = handler(vfs, currentPath, cmd, args);
    if (result) {
      return result;
    }
  }

  return { output: `bashcash: ${cmd}: command not found`, newPath: currentPath };
}


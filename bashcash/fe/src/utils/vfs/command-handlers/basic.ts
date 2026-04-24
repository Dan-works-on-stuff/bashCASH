import { VFSNode } from '../../../api/types';
import { getNodeByPath, resolvePath } from '../path';
import { CommandResult } from '../types';

export function handleBasicCommands(
  vfs: VFSNode,
  currentPath: string,
  cmd: string,
  args: string[],
): CommandResult | null {
  switch (cmd) {
    case 'pwd':
      return { output: currentPath, newPath: currentPath, scoreEvent: 'success' };
    case 'ls': {
      const target = args[0] ? resolvePath(currentPath, args[0]) : currentPath;
      const node = getNodeByPath(vfs, target);
      if (!node) return { output: `ls: cannot access '${target}': No such file or directory`, newPath: currentPath, scoreEvent: 'mistake' };
      if (node.type !== 'directory') return { output: node.name, newPath: currentPath, scoreEvent: 'success' };
      if (!node.children || node.children.length === 0) return { output: '', newPath: currentPath, scoreEvent: 'success' };
      const out = node.children
        .map((child) => (child.type === 'directory' ? `\x1b[1;34m${child.name}/\x1b[0m` : child.name))
        .join('  ');
      return { output: out, newPath: currentPath, scoreEvent: 'success' };
    }
    case 'cd': {
      const target = args[0] || '/';
      const targetPath = resolvePath(currentPath, target);
      const node = getNodeByPath(vfs, targetPath);
      if (!node) return { output: `cd: ${target}: No such file or directory`, newPath: currentPath, scoreEvent: 'mistake' };
      if (node.type !== 'directory') return { output: `cd: ${target}: Not a directory`, newPath: currentPath, scoreEvent: 'mistake' };
      return { output: '', newPath: targetPath, scoreEvent: 'success' };
    }
    case 'clear':
      return { output: '\x1b[2J\x1b[H', newPath: currentPath, scoreEvent: 'success' };
    default:
      return null;
  }
}


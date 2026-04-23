import { VFSNode } from '../api/types';

export interface CommandResult {
  output: string;
  newPath: string;
  modal?: {
    type: 'image';
    url: string;
    filename: string;
  };
}

export function resolvePath(current: string, target: string): string {
  if (!target) return current;
  const parts = target.startsWith('/') 
      ? target.split('/') 
      : [...current.split('/'), ...target.split('/')];
  const resolved: string[] = [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') {
        resolved.pop();
    } else {
        resolved.push(p);
    }
  }
  return '/' + resolved.join('/');
}
export function getNodeByPath(vfs: VFSNode, path: string): VFSNode | null {
  if (path === '/') return vfs;
  const parts = path.split('/').filter(Boolean);
  let current = vfs;
  for (const p of parts) {
    if (!current.children) return null;
    const next = current.children.find(c => c.name === p);
    if (!next) return null;
    current = next;
  }
  return current;
}
export function executeCommand(
  vfs: VFSNode | null,
  currentPath: string,
  commandStr: string
): CommandResult {
  const trimmed = commandStr.trim();
  if (!trimmed) return { output: '', newPath: currentPath };
  if (!vfs) {
      if (trimmed === 'clear') return { output: '\x1b[2J\x1b[H', newPath: currentPath };
      return { output: 'Error: No workspace uploaded. Please upload a .zip file first.', newPath: currentPath };
  }
  const args = trimmed.split(/\s+/);
  const cmd = args.shift()!;
  switch (cmd) {
    case 'pwd':
      return { output: currentPath, newPath: currentPath };
    case 'ls': {
      const target = args[0] ? resolvePath(currentPath, args[0]) : currentPath;
      const node = getNodeByPath(vfs, target);
      if (!node) return { output: `ls: cannot access '${target}': No such file or directory`, newPath: currentPath };
      if (node.type !== 'directory') return { output: node.name, newPath: currentPath };
      if (!node.children || node.children.length === 0) return { output: '', newPath: currentPath };
      const out = node.children.map(c => {
         if (c.type === 'directory') return `\x1b[1;34m${c.name}/\x1b[0m`;
         return c.name;
      }).join('  ');
      return { output: out, newPath: currentPath };
    }
    case 'cd': {
      const target = args[0] || '/';
      const targetPath = resolvePath(currentPath, target);
      const node = getNodeByPath(vfs, targetPath);
      if (!node) return { output: `cd: ${target}: No such file or directory`, newPath: currentPath };
      if (node.type !== 'directory') return { output: `cd: ${target}: Not a directory`, newPath: currentPath };
      return { output: '', newPath: targetPath };
    }
    case 'xdg-open': {
      if (args.length === 0) return { output: 'xdg-open: missing file argument', newPath: currentPath };
      const filePath = resolvePath(currentPath, args[0]);
      const node = getNodeByPath(vfs, filePath);
      if (!node) return { output: `xdg-open: cannot open '${filePath}': No such file or directory`, newPath: currentPath };
      if (node.type === 'directory') return { output: `xdg-open: '${filePath}': Is a directory`, newPath: currentPath };
      if (!node.url) return { output: `xdg-open: '${filePath}': Cannot open (no URL available)`, newPath: currentPath };
      return {
        output: `Opening ${node.name}...`,
        newPath: currentPath,
        modal: {
          type: 'image',
          url: node.url,
          filename: node.name,
        },
      };
    }
    case 'clear':
      return { output: '\x1b[2J\x1b[H', newPath: currentPath };
    default:
      return { output: `bashcash: ${cmd}: command not found`, newPath: currentPath };
  }
}

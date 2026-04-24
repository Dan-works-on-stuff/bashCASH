import { VFSNode } from '../../api/types';

export function resolvePath(current: string, target: string): string {
  if (!target) return current;
  const parts = target.startsWith('/')
    ? target.split('/')
    : [...current.split('/'), ...target.split('/')];
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  return '/' + resolved.join('/');
}

export function getNodeByPath(vfs: VFSNode, path: string): VFSNode | null {
  if (path === '/') return vfs;
  const parts = path.split('/').filter(Boolean);
  let current = vfs;
  for (const part of parts) {
    if (!current.children) return null;
    const next = current.children.find((candidate) => candidate.name === part);
    if (!next) return null;
    current = next;
  }
  return current;
}


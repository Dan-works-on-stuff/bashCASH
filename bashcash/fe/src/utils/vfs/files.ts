import { VFSNode } from '../../api/types';
import { byteLength, nowIso, pathParts, transformNodeAtPath } from './shared';

export function isEditableTextFile(filename: string): boolean {
  const normalized = filename.toLowerCase();
  return normalized.endsWith('.txt') || normalized.endsWith('.sh');
}

export function updateFileContent(vfs: VFSNode, filePath: string, content: string): VFSNode {
  const updated = transformNodeAtPath(vfs, pathParts(filePath), (node) => {
    if (node.type !== 'file') {
      return node;
    }

    return {
      ...node,
      content,
      size: byteLength(content),
      modified: nowIso(),
    };
  });

  return updated ?? vfs;
}


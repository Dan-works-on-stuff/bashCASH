import { VFSNode } from '../../../api/types';
import { getNodeByPath, resolvePath } from '../path';
import { CommandResult } from '../types';

function isEditableTextFile(filename: string): boolean {
  const normalized = filename.toLowerCase();
  return normalized.endsWith('.txt') || normalized.endsWith('.sh');
}

export function handleInteractiveCommands(
  vfs: VFSNode,
  currentPath: string,
  cmd: string,
  args: string[],
): CommandResult | null {
  switch (cmd) {
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
    case 'nano': {
      if (args.length === 0) return { output: 'nano: missing file argument', newPath: currentPath };
      const filePath = resolvePath(currentPath, args[0]);
      const node = getNodeByPath(vfs, filePath);
      if (!node) return { output: `nano: ${args[0]}: No such file or directory`, newPath: currentPath };
      if (node.type === 'directory') return { output: `nano: ${args[0]}: Is a directory`, newPath: currentPath };
      if (!isEditableTextFile(node.name)) {
        return { output: `nano: ${args[0]}: Unsupported file type (only .txt and .sh)`, newPath: currentPath };
      }

      return {
        output: `Opening ${node.name} in editor...`,
        newPath: currentPath,
        modal: {
          type: 'text-editor',
          filePath,
          filename: node.name,
          content: node.content ?? '',
        },
      };
    }
    default:
      return null;
  }
}


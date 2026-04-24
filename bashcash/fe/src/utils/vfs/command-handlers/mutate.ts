import { VFSNode } from '../../../api/types';
import {
  createDirectoryNode,
  createFileNode,
  ensureDirectoryTree,
  insertChildAtPath,
  pathParts,
  removeChildAtPath,
  transformNodeAtPath,
  nowIso,
} from '../shared';
import { getNodeByPath, resolvePath } from '../path';
import { CommandResult } from '../types';

export function handleMutateCommands(
  vfs: VFSNode,
  currentPath: string,
  cmd: string,
  args: string[],
): CommandResult | null {
  switch (cmd) {
    case 'touch': {
      if (args.length === 0) {
        return { output: 'touch: missing file argument', newPath: currentPath, scoreEvent: 'mistake' };
      }

      let nextVfs = vfs;
      for (const targetArg of args) {
        const filePath = resolvePath(currentPath, targetArg);
        const parts = pathParts(filePath);
        if (parts.length === 0) {
          return { output: `touch: ${targetArg}: Is a directory`, newPath: currentPath, scoreEvent: 'mistake' };
        }

        const existing = getNodeByPath(nextVfs, filePath);
        if (existing) {
          if (existing.type === 'directory') {
            return { output: `touch: ${targetArg}: Is a directory`, newPath: currentPath, scoreEvent: 'mistake' };
          }

          const updated = transformNodeAtPath(nextVfs, parts, (node) => ({
            ...node,
            modified: nowIso(),
          }));
          if (!updated) {
            return { output: `touch: ${targetArg}: Failed to update file`, newPath: currentPath, scoreEvent: 'mistake' };
          }
          nextVfs = updated;
          continue;
        }

        const parentParts = parts.slice(0, -1);
        const parentPath = parentParts.length > 0 ? `/${parentParts.join('/')}` : '/';
        const parent = getNodeByPath(nextVfs, parentPath);
        if (!parent) {
          return { output: `touch: ${targetArg}: No such file or directory`, newPath: currentPath, scoreEvent: 'mistake' };
        }
        if (parent.type !== 'directory') {
          return { output: `touch: ${targetArg}: Not a directory`, newPath: currentPath, scoreEvent: 'mistake' };
        }

        const inserted = insertChildAtPath(nextVfs, parentParts, createFileNode(parts[parts.length - 1]));
        if (!inserted) {
          return { output: `touch: ${targetArg}: Failed to create file`, newPath: currentPath, scoreEvent: 'mistake' };
        }
        nextVfs = inserted;
      }

      return { output: '', newPath: currentPath, updatedVfs: nextVfs !== vfs ? nextVfs : undefined, scoreEvent: 'success' };
    }
    case 'mkdir': {
      const recursive = args.includes('-p');
      const targets = args.filter((arg) => arg !== '-p');

      if (targets.length === 0) {
        return { output: 'mkdir: missing directory operand', newPath: currentPath, scoreEvent: 'mistake' };
      }

      let nextVfs = vfs;
      for (const targetArg of targets) {
        const dirPath = resolvePath(currentPath, targetArg);
        const parts = pathParts(dirPath);

        if (parts.length === 0) {
          if (recursive) {
            continue;
          }
          return { output: `mkdir: cannot create directory '${targetArg}': File exists`, newPath: currentPath, scoreEvent: 'mistake' };
        }

        const existing = getNodeByPath(nextVfs, dirPath);
        if (existing) {
          if (existing.type === 'directory' && recursive) {
            continue;
          }
          return { output: `mkdir: cannot create directory '${targetArg}': File exists`, newPath: currentPath, scoreEvent: 'mistake' };
        }

        if (recursive) {
          const created = ensureDirectoryTree(nextVfs, parts);
          if (!created) {
            return { output: `mkdir: cannot create directory '${targetArg}': No such file or directory`, newPath: currentPath, scoreEvent: 'mistake' };
          }
          nextVfs = created;
          continue;
        }

        const parentParts = parts.slice(0, -1);
        const parentPath = parentParts.length > 0 ? `/${parentParts.join('/')}` : '/';
        const parent = getNodeByPath(nextVfs, parentPath);
        if (!parent) {
          return { output: `mkdir: cannot create directory '${targetArg}': No such file or directory`, newPath: currentPath, scoreEvent: 'mistake' };
        }
        if (parent.type !== 'directory') {
          return { output: `mkdir: cannot create directory '${targetArg}': Not a directory`, newPath: currentPath, scoreEvent: 'mistake' };
        }

        const inserted = insertChildAtPath(nextVfs, parentParts, createDirectoryNode(parts[parts.length - 1]));
        if (!inserted) {
          return { output: `mkdir: cannot create directory '${targetArg}': File exists`, newPath: currentPath, scoreEvent: 'mistake' };
        }
        nextVfs = inserted;
      }

      return { output: '', newPath: currentPath, updatedVfs: nextVfs !== vfs ? nextVfs : undefined, scoreEvent: 'success' };
    }
    case 'rm': {
      if (args.length === 0) {
        return { output: 'rm: missing operand', newPath: currentPath, scoreEvent: 'mistake' };
      }

      const recursive = args.some((arg) => arg.includes('r') || arg.includes('R'));
      const targets = args.filter((arg) => !arg.startsWith('-'));

      if (targets.length === 0) {
        return { output: 'rm: missing operand', newPath: currentPath, scoreEvent: 'mistake' };
      }

      let nextVfs = vfs;
      for (const targetArg of targets) {
        const targetPath = resolvePath(currentPath, targetArg);
        const parts = pathParts(targetPath);

        if (parts.length === 0) {
          return { output: 'rm: refusing to remove root directory', newPath: currentPath, scoreEvent: 'mistake' };
        }

        const existing = getNodeByPath(nextVfs, targetPath);
        if (!existing) {
          return { output: `rm: cannot remove '${targetArg}': No such file or directory`, newPath: currentPath, scoreEvent: 'mistake' };
        }
        if (existing.type === 'directory' && !recursive) {
          return { output: `rm: cannot remove '${targetArg}': Is a directory`, newPath: currentPath, scoreEvent: 'mistake' };
        }

        const removed = removeChildAtPath(nextVfs, parts, recursive);
        if (!removed) {
          return { output: `rm: cannot remove '${targetArg}': Failed to remove`, newPath: currentPath, scoreEvent: 'mistake' };
        }
        nextVfs = removed;
      }

      return { output: '', newPath: currentPath, updatedVfs: nextVfs !== vfs ? nextVfs : undefined, scoreEvent: 'success' };
    }
    default:
      return null;
  }
}

export { handleMutateCommands as handleMutateCommand };


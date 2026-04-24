import { VFSNode } from '../../../api/types';
import { getNodeByPath, resolvePath } from '../path';
import { collectGrepMatches } from '../shared';
import { CommandResult } from '../types';

export function handleReadCommands(
  vfs: VFSNode,
  currentPath: string,
  cmd: string,
  args: string[],
): CommandResult | null {
  switch (cmd) {
    case 'cat': {
      if (args.length === 0) {
        return { output: 'cat: missing file argument', newPath: currentPath };
      }

      const contents: string[] = [];
      for (const targetArg of args) {
        const filePath = resolvePath(currentPath, targetArg);
        const node = getNodeByPath(vfs, filePath);
        if (!node) {
          return { output: `cat: ${targetArg}: No such file or directory`, newPath: currentPath };
        }
        if (node.type === 'directory') {
          return { output: `cat: ${targetArg}: Is a directory`, newPath: currentPath };
        }

        contents.push(node.content ?? '');
      }

      return { output: contents.join('\n'), newPath: currentPath };
    }
    case 'grep': {
      if (args.length === 0) {
        return { output: 'grep: missing search pattern', newPath: currentPath };
      }

      const [pattern, ...targets] = args;
      const matcher = (() => {
        try {
          const regex = new RegExp(pattern);
          return (line: string) => regex.test(line);
        } catch {
          return (line: string) => line.includes(pattern);
        }
      })();

      const searchTargets = targets.length > 0 ? targets : ['.'];
      const matches: string[] = [];

      for (const targetArg of searchTargets) {
        const targetPath = resolvePath(currentPath, targetArg);
        const node = getNodeByPath(vfs, targetPath);
        if (!node) {
          return { output: `grep: ${targetArg}: No such file or directory`, newPath: currentPath };
        }

        if (node.type === 'file') {
          const content = node.content ?? '';
          content.split(/\r?\n/).forEach((line, index) => {
            if (matcher(line)) {
              matches.push(`${targetPath}:${index + 1}:${line}`);
            }
          });
          continue;
        }

        collectGrepMatches(node, targetPath, matcher, matches);
      }

      return { output: matches.join('\n'), newPath: currentPath };
    }
    default:
      return null;
  }
}

export { handleReadCommands as handleReadCommand };


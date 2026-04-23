import { VFSNode } from '../api/types';

const DEFAULT_MODIFIED = '2026-01-01T00:00:00Z';

export function createDefaultVfs(): VFSNode {
  return {
    name: '/',
    type: 'directory',
    children: [
      {
        name: 'son1',
        type: 'directory',
        children: [
          {
            name: 'grandson1.txt',
            type: 'file',
            size: 42,
            modified: DEFAULT_MODIFIED,
          },
        ],
      },
      {
        name: 'son2',
        type: 'directory',
        children: [
          {
            name: 'nested',
            type: 'directory',
            children: [
              {
                name: 'worker.sh',
                type: 'file',
                size: 64,
                modified: DEFAULT_MODIFIED,
              },
            ],
          },
        ],
      },
      {
        name: 'son3',
        type: 'directory',
        children: [
          {
            name: 'unemployed.png',
            type: 'file',
            size: 1024,
            modified: DEFAULT_MODIFIED,
          },
        ],
      },
    ],
  };
}

export default createDefaultVfs;


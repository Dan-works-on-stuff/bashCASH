import { VFSNode } from '../api/types';

const DEFAULT_MODIFIED = '2026-01-01T00:00:00Z';
const DEFAULT_GRANDSON_TEXT = '';
const DEFAULT_WORKER_SCRIPT = '#!/usr/bin/env bash\necho "Running worker task"\n';

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

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
            size: byteLength(DEFAULT_GRANDSON_TEXT),
            modified: DEFAULT_MODIFIED,
            content: DEFAULT_GRANDSON_TEXT,
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
                size: byteLength(DEFAULT_WORKER_SCRIPT),
                modified: DEFAULT_MODIFIED,
                content: DEFAULT_WORKER_SCRIPT,
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
            url: '/default-vfs/unemployed.png',
          },
        ],
      },
    ],
  };
}

export default createDefaultVfs;


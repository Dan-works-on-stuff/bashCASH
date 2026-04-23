import createDefaultVfs from './defaultVfs';
import { VFSNode } from '../api/types';
import { executeCommand } from './vfs';

describe('createDefaultVfs', () => {
  it('builds the required deterministic folder structure', () => {
    const vfs = createDefaultVfs();

    expect(vfs.name).toBe('/');
    expect(vfs.type).toBe('directory');
    expect(vfs.children?.map((child: VFSNode) => child.name)).toEqual(['son1', 'son2', 'son3']);

    const son1 = vfs.children?.[0];
    expect(son1?.children?.[0]?.name).toBe('grandson1.txt');

    const son2Nested = vfs.children?.[1]?.children?.[0];
    expect(son2Nested?.name).toBe('nested');
    expect(son2Nested?.children?.[0]?.name).toBe('worker.sh');

    const son3File = vfs.children?.[2]?.children?.[0];
    expect(son3File?.name).toBe('unemployed.png');
  });

  it('supports navigation commands against the default tree', () => {
    const vfs = createDefaultVfs();

    const cdResult = executeCommand(vfs, '/', 'cd son2/nested');
    expect(cdResult.newPath).toBe('/son2/nested');

    const lsResult = executeCommand(vfs, '/son2/nested', 'ls');
    expect(lsResult.output).toContain('worker.sh');
  });
});


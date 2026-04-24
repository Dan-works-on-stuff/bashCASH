import { executeCommand, CommandResult, getNodeByPath, updateFileContent } from './vfs';
import createDefaultVfs from './defaultVfs';

describe('xdg-open command', () => {
  it('opens a file with URL and returns modal data', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/son3', 'xdg-open unemployed.png') as CommandResult;

    expect(result.output).toContain('Opening');
    expect(result.modal).toBeDefined();
    expect(result.modal?.type).toBe('image');
    if (result.modal?.type === 'image') {
      expect(result.modal.url).toBe('/default-vfs/unemployed.png');
      expect(result.modal.filename).toBe('unemployed.png');
    }
    expect(result.scoreEvent).toBe('success');
  });

  it('handles missing file argument', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/', 'xdg-open');

    expect(result.output).toContain('missing file argument');
    expect(result.modal).toBeUndefined();
    expect(result.scoreEvent).toBe('mistake');
  });

  it('handles file not found', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/', 'xdg-open nonexistent.txt');

    expect(result.output).toContain('No such file or directory');
    expect(result.modal).toBeUndefined();
    expect(result.scoreEvent).toBe('mistake');
  });

  it('handles directory argument', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/', 'xdg-open son1');

    expect(result.output).toContain('Is a directory');
    expect(result.modal).toBeUndefined();
  });

  it('supports relative paths', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/son3', 'xdg-open ./unemployed.png') as CommandResult;

    expect(result.modal?.type).toBe('image');
    if (result.modal?.type === 'image') {
      expect(result.modal.url).toBe('/default-vfs/unemployed.png');
    }
    expect(result.scoreEvent).toBe('success');
  });
});

describe('nano command', () => {
  it('opens text files in text-editor modal payload', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/son2/nested', 'nano worker.sh');

    expect(result.output).toContain('Opening worker.sh in editor');
    expect(result.modal?.type).toBe('text-editor');
    if (result.modal?.type === 'text-editor') {
      expect(result.modal.filePath).toBe('/son2/nested/worker.sh');
      expect(result.modal.content).toContain('Running worker task');
    }
  });

  it('rejects unsupported file extensions', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/son3', 'nano unemployed.png');

    expect(result.output).toContain('Unsupported file type');
    expect(result.modal).toBeUndefined();
  });
});

describe('safe local filesystem commands', () => {
  it('reads file contents with cat', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/son2/nested', 'cat worker.sh');

    expect(result.output).toContain('Running worker task');
    expect(result.newPath).toBe('/son2/nested');
    expect(result.scoreEvent).toBe('success');
  });

  it('searches recursively with grep', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/', 'grep worker');

    expect(result.output).toContain('/son2/nested/worker.sh');
    expect(result.output).toContain('Running worker task');
    expect(result.scoreEvent).toBe('success');
  });

  it('creates files with touch and returns an updated VFS snapshot', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/son1', 'touch notes.txt');

    expect(result.updatedVfs).toBeDefined();
    const updated = result.updatedVfs ?? vfs;
    const node = getNodeByPath(updated, '/son1/notes.txt');

    expect(node?.type).toBe('file');
    if (node?.type === 'file') {
      expect(node.content).toBe('');
      expect(node.size).toBe(0);
      expect(node.modified).toBeTruthy();
    }
    expect(result.scoreEvent).toBe('success');
  });

  it('creates nested directories with mkdir -p', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/', 'mkdir -p projects/app/src');

    expect(result.updatedVfs).toBeDefined();
    const updated = result.updatedVfs ?? vfs;
    expect(getNodeByPath(updated, '/projects/app/src')?.type).toBe('directory');
    expect(result.scoreEvent).toBe('success');
  });

  it('removes files and directories recursively with rm -r', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/', 'rm -r son2');

    expect(result.updatedVfs).toBeDefined();
    const updated = result.updatedVfs ?? vfs;
    expect(getNodeByPath(updated, '/son2')).toBeNull();
    expect(result.scoreEvent).toBe('success');
  });
});

describe('command score events', () => {
  it('does not change score on blank input', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/', '   ');

    expect(result.scoreEvent).toBe('none');
  });

  it('marks unknown commands as mistakes', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/', 'definitely-not-a-command');

    expect(result.scoreEvent).toBe('mistake');
  });
});

describe('updateFileContent', () => {
  it('updates content and metadata for existing file', () => {
    const vfs = createDefaultVfs();

    const updated = updateFileContent(vfs, '/son1/grandson1.txt', 'hello from editor');
    const node = getNodeByPath(updated, '/son1/grandson1.txt');

    expect(node?.type).toBe('file');
    if (node?.type === 'file') {
      expect(node.content).toBe('hello from editor');
      expect(node.size).toBe('hello from editor'.length);
      expect(node.modified).toBeTruthy();
    }
  });
});


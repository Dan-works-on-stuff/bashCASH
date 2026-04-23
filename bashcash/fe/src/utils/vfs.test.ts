import { executeCommand, CommandResult } from './vfs';
import createDefaultVfs from './defaultVfs';

describe('xdg-open command', () => {
  it('opens a file with URL and returns modal data', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/son3', 'xdg-open unemployed.png') as CommandResult;

    expect(result.output).toContain('Opening');
    expect(result.modal).toBeDefined();
    expect(result.modal?.type).toBe('image');
    expect(result.modal?.url).toBe('/default-vfs/unemployed.png');
    expect(result.modal?.filename).toBe('unemployed.png');
  });

  it('handles missing file argument', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/', 'xdg-open');

    expect(result.output).toContain('missing file argument');
    expect(result.modal).toBeUndefined();
  });

  it('handles file not found', () => {
    const vfs = createDefaultVfs();

    const result = executeCommand(vfs, '/', 'xdg-open nonexistent.txt');

    expect(result.output).toContain('No such file or directory');
    expect(result.modal).toBeUndefined();
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

    expect(result.modal?.url).toBe('/default-vfs/unemployed.png');
  });
});


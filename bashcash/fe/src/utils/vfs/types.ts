import { VFSNode } from '../../api/types';

export interface ImageModalPayload {
  type: 'image';
  url: string;
  filename: string;
}

export interface TextEditorModalPayload {
  type: 'text-editor';
  filePath: string;
  filename: string;
  content: string;
}

export type CommandModal = ImageModalPayload | TextEditorModalPayload;

export interface CommandResult {
  output: string;
  newPath: string;
  modal?: CommandModal;
  updatedVfs?: VFSNode;
  scoreEvent?: 'success' | 'mistake' | 'none';
}


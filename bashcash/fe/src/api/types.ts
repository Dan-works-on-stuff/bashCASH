export interface VFSNode {
  name: string;
  type: 'directory' | 'file';
  size?: number;
  modified?: string;
  children?: VFSNode[];
}
export interface ParseZipResponse {
  vfs: VFSNode;
}

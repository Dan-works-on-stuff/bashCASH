export interface VFSNode {
  name: string;
  type: 'directory' | 'file';
  size?: number;
  modified?: string;
  url?: string;  // URL to fetch file content (for images, etc.)
  children?: VFSNode[];
}
export interface ParseZipResponse {
  vfs: VFSNode;
}

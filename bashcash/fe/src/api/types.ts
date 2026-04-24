export interface VFSNode {
  name: string;
  type: 'directory' | 'file';
  size?: number;
  modified?: string;
  url?: string;  // URL to fetch file content (for images, etc.)
  content?: string;
  children?: VFSNode[];
}
export interface ParseZipResponse {
  vfs: VFSNode;
}

export interface SessionSnapshot {
  vfs: VFSNode;
  current_path: string;
}

export interface SessionRecord extends SessionSnapshot {
  session_id: string;
  updated_at: string;
  ttl: number;
}


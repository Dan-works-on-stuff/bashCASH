import { VFSNode } from '../api/types';
import './VfsTree.css';
interface VfsTreeProps {
  data: VFSNode;
}
export function VfsTree({ data }: VfsTreeProps) {
  return (
    <div className="vfs-tree">
      <h4>Workspace Explorer</h4>
      <TreeNode node={data} />
    </div>
  );
}
function TreeNode({ node }: { node: VFSNode }) {
  return (
    <div className="vfs-node">
      <div className="vfs-node-label">
        <span className="vfs-icon">{node.type === 'directory' ? '📁' : '📄'}</span>
        <span className="vfs-name">{node.name}</span>
        {node.size !== undefined && (
          <span className="vfs-size">{(node.size / 1024).toFixed(1)}kb</span>
        )}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="vfs-children">
          {node.children.map((child, idx) => (
            <TreeNode key={`${child.name}-${idx}`} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

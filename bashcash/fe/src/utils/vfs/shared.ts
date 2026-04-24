import { VFSNode } from '../../api/types';

export function nowIso(): string {
  return new Date().toISOString();
}

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function pathParts(path: string): string[] {
  return path.split('/').filter(Boolean);
}

export function createFileNode(name: string, content = ''): VFSNode {
  return {
    name,
    type: 'file',
    size: byteLength(content),
    modified: nowIso(),
    content,
  };
}

export function createDirectoryNode(name: string, children: VFSNode[] = []): VFSNode {
  return {
    name,
    type: 'directory',
    children,
  };
}

export function transformNodeAtPath(
  node: VFSNode,
  parts: string[],
  transform: (target: VFSNode) => VFSNode,
): VFSNode | null {
  if (parts.length === 0) {
    return transform(node);
  }

  if (node.type !== 'directory' || !node.children) {
    return null;
  }

  const [segment, ...rest] = parts;
  let found = false;
  let failed = false;

  const children = node.children.map((child) => {
    if (child.name !== segment) {
      return child;
    }

    found = true;
    const updated = transformNodeAtPath(child, rest, transform);
    if (!updated) {
      failed = true;
      return child;
    }

    return updated;
  });

  if (!found || failed) {
    return null;
  }

  return { ...node, children };
}

export function mutateDirectoryAtPath(
  node: VFSNode,
  parts: string[],
  mutate: (directory: VFSNode) => VFSNode | null,
): VFSNode | null {
  if (parts.length === 0) {
    if (node.type !== 'directory') {
      return null;
    }
    return mutate(node);
  }

  if (node.type !== 'directory' || !node.children) {
    return null;
  }

  const [segment, ...rest] = parts;
  let found = false;
  let failed = false;

  const children = node.children.map((child) => {
    if (child.name !== segment) {
      return child;
    }

    found = true;
    const updated = mutateDirectoryAtPath(child, rest, mutate);
    if (!updated) {
      failed = true;
      return child;
    }

    return updated;
  });

  if (!found || failed) {
    return null;
  }

  return { ...node, children };
}

export function insertChildAtPath(root: VFSNode, parentParts: string[], child: VFSNode): VFSNode | null {
  return mutateDirectoryAtPath(root, parentParts, (directory) => {
    const children = directory.children ? [...directory.children] : [];
    if (children.some((candidate) => candidate.name === child.name)) {
      return null;
    }

    return { ...directory, children: [...children, child] };
  });
}

export function ensureDirectoryTree(root: VFSNode, parts: string[]): VFSNode | null {
  if (parts.length === 0) {
    return root.type === 'directory' ? root : null;
  }

  if (root.type !== 'directory') {
    return null;
  }

  const [segment, ...rest] = parts;
  const children = root.children ? [...root.children] : [];
  const index = children.findIndex((candidate) => candidate.name === segment);

  if (index === -1) {
    const created = ensureDirectoryTree(createDirectoryNode(segment), rest);
    if (!created) {
      return null;
    }

    return { ...root, children: [...children, created] };
  }

  const child = children[index];
  if (child.type !== 'directory') {
    return null;
  }

  const updatedChild = ensureDirectoryTree(child, rest);
  if (!updatedChild) {
    return null;
  }

  if (updatedChild === child) {
    return root;
  }

  children[index] = updatedChild;
  return { ...root, children };
}

export function removeChildAtPath(root: VFSNode, targetParts: string[], recursive: boolean): VFSNode | null {
  if (targetParts.length === 0) {
    return null;
  }

  const parentParts = targetParts.slice(0, -1);
  const targetName = targetParts[targetParts.length - 1];

  return mutateDirectoryAtPath(root, parentParts, (directory) => {
    const children = directory.children ? [...directory.children] : [];
    const targetIndex = children.findIndex((candidate) => candidate.name === targetName);

    if (targetIndex === -1) {
      return null;
    }

    const targetNode = children[targetIndex];
    if (targetNode.type === 'directory' && !recursive) {
      return null;
    }

    children.splice(targetIndex, 1);
    return { ...directory, children };
  });
}

export function collectGrepMatches(
  node: VFSNode,
  absolutePath: string,
  matcher: (line: string) => boolean,
  matches: string[],
): void {
  if (node.type === 'file') {
    const content = node.content ?? '';
    content.split(/\r?\n/).forEach((line, index) => {
      if (matcher(line)) {
        matches.push(`${absolutePath}:${index + 1}:${line}`);
      }
    });
    return;
  }

  for (const child of node.children ?? []) {
    const nextPath = absolutePath === '/' ? `/${child.name}` : `${absolutePath}/${child.name}`;
    collectGrepMatches(child, nextPath, matcher, matches);
  }
}


import { createHash } from 'node:crypto';

export type FileNode = { path: string; content: string; fileHash: string };
export type FileTree = { files: FileNode[]; treeHash: string };

export function buildDeterministicFileTree(entries: Array<{ path: string; content: string }>): FileTree {
  const seen = new Set<string>();
  const files = entries.map((e) => {
    const clean = normalizePath(e.path);
    if (seen.has(clean)) throw new Error('DSG_DUPLICATE_PATH_BLOCKED');
    seen.add(clean);
    const fileHash = sha(`${clean}\n${e.content}`);
    return { path: clean, content: e.content, fileHash };
  }).sort((a,b)=>a.path.localeCompare(b.path));
  const treeHash = sha(files.map((f)=>`${f.path}:${f.fileHash}`).join('\n'));
  return { files, treeHash };
}

function normalizePath(input: string): string {
  if (input.includes('..')) throw new Error('DSG_PATH_TRAVERSAL_BLOCKED');
  const p = input.replace(/^\/+/, '');
  const n = p.toLowerCase();
  if ((n === '.env' || n.endsWith('/.env')) && !n.endsWith('.env.example')) throw new Error('DSG_DOTENV_BLOCKED');
  return p;
}

const sha = (x: string) => createHash('sha256').update(x).digest('hex');

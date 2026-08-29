import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Task, AppFile, AppFolder, Role, User } from '../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
export const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'workflow.json');

export const mockUsers: Record<Role, User> = {
  editor: { id: 'editor', name: 'Chris', roleTitle: '主剪辑师', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Chris&backgroundColor=FAF9F6' },
  aigc: { id: 'aigc', name: 'Alex', roleTitle: 'AIGC 创作者', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Alex&backgroundColor=FAF9F6' },
  aigc2: { id: 'aigc2', name: 'Alex 2', roleTitle: 'AIGC 创作者', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Alex2&backgroundColor=FAF9F6' },
  aigc3: { id: 'aigc3', name: 'Alex 3', roleTitle: 'AIGC 创作者', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Alex3&backgroundColor=FAF9F6' },
  audio: { id: 'audio', name: 'Sam', roleTitle: '音效设计师', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sam&backgroundColor=FAF9F6' },
  audio2: { id: 'audio2', name: 'Sam 2', roleTitle: '音效设计师', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sam2&backgroundColor=FAF9F6' },
  audio3: { id: 'audio3', name: 'Sam 3', roleTitle: '音效设计师', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sam3&backgroundColor=FAF9F6' },
};

const defaultTasks: Task[] = [
  {
    id: 't1',
    title: '生成赛博朋克城市片头',
    description: '需要一个5秒的霓虹赛博朋克城市的跟踪镜头。使用 Midjourney/Runway。以照片级写实为目标。确保霓虹灯效果清晰。',
    status: 'review',
    type: 'video',
    assigneeId: 'aigc',
    comments: [],
    files: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 't2',
    title: '赛博朋克环境音与霓虹蜂鸣',
    description: '为片头镜头叠加一些远处的警笛声、雨声和霓虹灯的嗡嗡声。使其具有电影感。',
    status: 'todo',
    type: 'audio',
    assigneeId: null,
    comments: [],
    files: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 't3',
    title: '自然B-Roll - 苔藓微距',
    description: '在绿色苔藓上缓慢平移，用于过渡序列。首选柔和的、亲自然的照明。',
    status: 'in-progress',
    type: 'video',
    assigneeId: 'aigc',
    comments: [],
    files: [],
    createdAt: new Date().toISOString(),
  },
];

const defaultFolders: AppFolder[] = [
  { id: 'image-character', name: '人设图', theme: 'image' },
  { id: 'image-scene', name: '场景图', theme: 'image' },
  { id: 'project-cyberpunk', name: '「赛博朋克」项目', theme: 'project' },
];

interface DbSchema {
  tasks: Task[];
  driveFiles: AppFile[];
  folders: AppFolder[];
  settings: { storyboardUrl: string };
  passwordOverrides: Record<string, string>;
}

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function readDb(): DbSchema {
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) {
    const initial: DbSchema = { tasks: defaultTasks, driveFiles: [], folders: defaultFolders, settings: { storyboardUrl: '' }, passwordOverrides: {} };
    writeDb(initial);
    return initial;
  }
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as DbSchema;
  if (!data.folders) data.folders = defaultFolders;
  if (!data.settings) data.settings = { storyboardUrl: '' };
  if (!data.passwordOverrides) data.passwordOverrides = {};
  for (const defaultFolder of defaultFolders) {
    if (!data.folders.find(f => f.id === defaultFolder.id)) {
      data.folders.push(defaultFolder);
    }
  }
  return data;
}

function writeDb(data: DbSchema) {
  ensureDirs();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, DB_FILE);
}

export function getTasks(): Task[] {
  return readDb().tasks;
}

export function getDriveFiles(): AppFile[] {
  return readDb().driveFiles;
}

export function saveTask(task: Task) {
  const db = readDb();
  const idx = db.tasks.findIndex(t => t.id === task.id);
  if (idx >= 0) db.tasks[idx] = task;
  else db.tasks.unshift(task);
  writeDb(db);
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const db = readDb();
  const idx = db.tasks.findIndex(t => t.id === id);
  if (idx < 0) return null;
  db.tasks[idx] = { ...db.tasks[idx], ...updates };
  writeDb(db);
  return db.tasks[idx];
}

export function addDriveFile(file: AppFile) {
  const db = readDb();
  db.driveFiles.unshift(file);
  writeDb(db);
}

export function updateDriveFiles(ids: string[], updates: Partial<AppFile>) {
  const db = readDb();
  db.driveFiles = db.driveFiles.map(f => ids.includes(f.id) ? { ...f, ...updates } : f);
  writeDb(db);
}

export function getDriveFile(id: string): AppFile | undefined {
  return readDb().driveFiles.find(f => f.id === id);
}

export function deleteDriveFile(id: string): boolean {
  const db = readDb();
  const idx = db.driveFiles.findIndex(f => f.id === id);
  if (idx < 0) return false;
  const file = db.driveFiles[idx];
  const filePath = path.join(UPLOADS_DIR, file.storedName || '');
  if (file.storedName && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  db.driveFiles.splice(idx, 1);
  writeDb(db);
  return true;
}

export function deleteDriveFiles(ids: string[]): string[] {
  const db = readDb();
  const deleted: string[] = [];
  ids.forEach(id => {
    const idx = db.driveFiles.findIndex(f => f.id === id);
    if (idx >= 0) {
      const file = db.driveFiles[idx];
      const filePath = path.join(UPLOADS_DIR, file.storedName || '');
      if (file.storedName && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      db.driveFiles.splice(idx, 1);
      deleted.push(id);
    }
  });
  if (deleted.length > 0) writeDb(db);
  return deleted;
}

export function deleteTask(id: string): boolean {
  const db = readDb();
  const idx = db.tasks.findIndex(t => t.id === id);
  if (idx < 0) return false;
  db.tasks.splice(idx, 1);
  writeDb(db);
  return true;
}

export function getFolders(): AppFolder[] {
  return readDb().folders;
}

export function addFolder(folder: AppFolder): void {
  const db = readDb();
  db.folders.push(folder);
  writeDb(db);
}

export function updateFolder(id: string, updates: Partial<AppFolder>): AppFolder | null {
  const db = readDb();
  const idx = db.folders.findIndex(f => f.id === id);
  if (idx < 0) return null;
  db.folders[idx] = { ...db.folders[idx], ...updates };
  writeDb(db);
  return db.folders[idx];
}

export function deleteFolder(id: string): boolean {
  const db = readDb();
  const idx = db.folders.findIndex(f => f.id === id);
  if (idx < 0) return false;
  db.folders.splice(idx, 1);
  db.driveFiles = db.driveFiles.map(f => f.folder === id ? { ...f, folder: undefined } : f);
  writeDb(db);
  return true;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getSettings(): { storyboardUrl: string } {
  return readDb().settings;
}

export function updateSettings(updates: Partial<{ storyboardUrl: string }>): { storyboardUrl: string } {
  const db = readDb();
  db.settings = { ...db.settings, ...updates };
  writeDb(db);
  return db.settings;
}

export function getPasswordOverride(username: string): string | undefined {
  return readDb().passwordOverrides[username];
}

export function setPasswordOverride(username: string, hash: string): void {
  const db = readDb();
  db.passwordOverrides[username] = hash;
  writeDb(db);
}

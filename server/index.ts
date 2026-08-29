import 'dotenv/config';
import bcrypt from 'bcryptjs';
import express from 'express';
import session from 'express-session';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  UPLOADS_DIR,
  mockUsers,
  getTasks,
  getDriveFiles,
  saveTask,
  updateTask,
  addDriveFile,
  updateDriveFiles,
  getDriveFile,
  deleteDriveFile,
  deleteDriveFiles,
  deleteTask,
  getFolders,
  addFolder,
  updateFolder,
  deleteFolder,
  generateId,
  getSettings,
  updateSettings,
  setPasswordOverride,
} from './db.js';
import {
  findAccount,
  verifyPassword,
  getSessionUser,
  requireAuth,
  clearAccountsCache,
} from './auth.js';
import type { AppFile, AppFolder, Task, TaskType } from '../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_MB || 500) * 1024 * 1024;
const SESSION_SECRET = process.env.SESSION_SECRET || 'floraflow-change-me-in-production';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function detectFileType(mimetype: string, filename: string): 'video' | 'audio' | 'image' | 'other' {
  if (mimetype.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(filename)) return 'video';
  if (mimetype.startsWith('audio/') || /\.(wav|mp3|aac|flac|ogg|m4a)$/i.test(filename)) return 'audio';
  if (mimetype.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(filename)) return 'image';
  return 'other';
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${generateId()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const type = detectFileType(file.mimetype, file.originalname);
    if (type === 'other') {
      cb(new Error('仅支持视频、音频和图片文件'));
      return;
    }
    cb(null, true);
  },
});

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

// --- Public routes ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username?.trim() || !password) {
    res.status(400).json({ error: '请输入用户名和密码' });
    return;
  }
  const account = findAccount(username.trim());
  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }
  req.session.userId = account.role;
  req.session.username = account.username;
  res.json(mockUsers[account.role]);
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.status(204).end();
  });
});

app.get('/api/auth/me', (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: '未登录' });
    return;
  }
  res.json(user);
});

// --- Protected routes ---
app.use('/api', requireAuth);

app.post('/api/auth/change-password', async (req, res) => {
  const { oldPassword, newPassword } = req.body as { oldPassword?: string; newPassword?: string };
  const username = req.session.username!;

  if (!oldPassword || !newPassword) {
    res.status(400).json({ error: '请输入旧密码和新密码' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: '新密码至少 6 位' });
    return;
  }

  const account = findAccount(username);
  if (!account || !(await verifyPassword(oldPassword, account.passwordHash))) {
    res.status(401).json({ error: '旧密码错误' });
    return;
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  setPasswordOverride(username, hash);
  clearAccountsCache();
  res.json({ success: true });
});

app.get('/api/users', (_req, res) => {
  res.json(mockUsers);
});

app.get('/api/tasks', (_req, res) => {
  res.json(getTasks());
});

app.post('/api/tasks', (req, res) => {
  const { title, description, type } = req.body as {
    title?: string;
    description?: string;
    type?: TaskType;
  };

  if (!title?.trim() || !description?.trim() || !type) {
    res.status(400).json({ error: '标题、描述和类型为必填项' });
    return;
  }

  const task: Task = {
    id: generateId(),
    title: title.trim(),
    description: description.trim(),
    status: 'todo',
    type,
    assigneeId: null,
    comments: [],
    files: [],
    createdAt: new Date().toISOString(),
  };
  saveTask(task);
  res.status(201).json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const updates = req.body as Partial<Task>;
  const existing = getTasks().find(t => t.id === req.params.id);
  if (!existing) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  const filtered: Partial<Task> = {};

  if ('status' in updates && updates.status) {
    filtered.status = updates.status;
  }

  if ('assigneeId' in updates) {
    if (existing.status !== 'todo') {
      res.status(400).json({ error: '仅待认领任务可分配' });
      return;
    }
    filtered.assigneeId = req.session.userId!;
    filtered.status = 'in-progress';
  }

  if ('title' in updates) filtered.title = updates.title;
  if ('description' in updates) filtered.description = updates.description;

  const updated = updateTask(req.params.id, filtered);
  res.json(updated);
});

app.post('/api/tasks/:id/approve', (req, res) => {
  const existing = getTasks().find(t => t.id === req.params.id);
  if (!existing) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }
  if (existing.status !== 'review') {
    res.status(400).json({ error: '仅待审核任务可批准' });
    return;
  }
  // Transfer task files to drive
  for (const file of existing.files) {
    addDriveFile(file);
  }
  const updated = updateTask(req.params.id, { status: 'approved' });
  res.json(updated);
});

app.delete('/api/tasks/:id', (req, res) => {
  const existing = getTasks().find(t => t.id === req.params.id);
  if (!existing) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }
  deleteTask(req.params.id);
  res.status(204).end();
});

app.post('/api/tasks/:id/comments', (req, res) => {
  const { text } = req.body as { text?: string };
  const authorId = req.session.userId!;
  if (!text?.trim()) {
    res.status(400).json({ error: '评论内容不能为空' });
    return;
  }
  const task = getTasks().find(t => t.id === req.params.id);
  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }
  const comment = {
    id: generateId(),
    authorId,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  task.comments.push(comment);
  saveTask(task);
  res.status(201).json(comment);
});

app.get('/api/files', (_req, res) => {
  res.json(getDriveFiles());
});

app.post('/api/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: '未收到文件' });
    return;
  }

  const uploadedBy = req.session.userId!;
  const { folder, taskId } = req.body as { folder?: string; taskId?: string };

  const fileType = detectFileType(req.file.mimetype, req.file.originalname);

  const IMAGE_FOLDERS = ['image-character', 'image-scene'];
  if (fileType === 'image' && !IMAGE_FOLDERS.includes(folder || '')) {
    const filePath = path.join(UPLOADS_DIR, req.file.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(400).json({ error: '图片只能上传到人设图或场景图文件夹' });
    return;
  }

  let targetFolder = folder;

  const fileId = generateId();
  const appFile: AppFile = {
    id: fileId,
    name: req.file.originalname,
    size: formatFileSize(req.file.size),
    type: fileType,
    url: `/api/files/${fileId}/download`,
    uploadedBy,
    createdAt: new Date().toISOString(),
    folder: targetFolder || undefined,
    storedName: req.file.filename,
    sizeBytes: req.file.size,
  };

  if (taskId) {
    const task = getTasks().find(t => t.id === taskId);
    if (task) {
      task.files.push(appFile);
      saveTask(task);
    }
    // Task files are not added to drive until the task is approved
  } else {
    addDriveFile(appFile);
  }

  res.status(201).json(appFile);
});

app.patch('/api/files/bulk', (req, res) => {
  const { ids, updates } = req.body as { ids?: string[]; updates?: Partial<AppFile> };
  if (!ids?.length || !updates) {
    res.status(400).json({ error: 'ids 和 updates 为必填项' });
    return;
  }
  updateDriveFiles(ids, updates);
  res.json(getDriveFiles());
});

app.delete('/api/files/:id', (req, res) => {
  const ok = deleteDriveFile(req.params.id);
  if (!ok) {
    res.status(404).json({ error: '文件不存在' });
    return;
  }
  res.status(204).end();
});

app.post('/api/files/bulk-delete', (req, res) => {
  const { ids } = req.body as { ids?: string[] };
  if (!ids?.length) {
    res.status(400).json({ error: 'ids 为必填项' });
    return;
  }
  deleteDriveFiles(ids);
  res.status(204).end();
});

// --- Folder routes ---
app.get('/api/folders', (_req, res) => {
  res.json(getFolders());
});

app.post('/api/folders', (req, res) => {
  const { name, theme } = req.body as { name?: string; theme?: 'video' | 'audio' | 'project' };
  if (!name?.trim()) {
    res.status(400).json({ error: '文件夹名称不能为空' });
    return;
  }
  const folder: AppFolder = {
    id: generateId(),
    name: name.trim(),
    theme: theme || 'project',
  };
  addFolder(folder);
  res.status(201).json(folder);
});

app.patch('/api/folders/:id', (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: '名称不能为空' });
    return;
  }
  const updated = updateFolder(req.params.id, { name: name.trim() });
  if (!updated) {
    res.status(404).json({ error: '文件夹不存在' });
    return;
  }
  res.json(updated);
});

app.delete('/api/folders/:id', (req, res) => {
  if (req.params.id === 'video-default' || req.params.id === 'audio-default') {
    res.status(400).json({ error: '默认文件夹不可删除' });
    return;
  }
  const ok = deleteFolder(req.params.id);
  if (!ok) {
    res.status(404).json({ error: '文件夹不存在' });
    return;
  }
  res.status(204).end();
});

app.get('/api/files/:id/download', (req, res) => {
  const file = getDriveFile(req.params.id);
  if (!file?.storedName) {
    res.status(404).json({ error: '文件不存在' });
    return;
  }
  const filePath = path.join(UPLOADS_DIR, file.storedName);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: '文件已丢失' });
    return;
  }
  res.download(filePath, file.name);
});

app.get('/api/files/:id/preview', (req, res) => {
  const file = getDriveFile(req.params.id);
  if (!file?.storedName) {
    res.status(404).end();
    return;
  }
  const filePath = path.join(UPLOADS_DIR, file.storedName);
  if (!fs.existsSync(filePath)) {
    res.status(404).end();
    return;
  }
  res.sendFile(filePath);
});

// --- Settings routes ---
app.get('/api/settings', (_req, res) => {
  res.json(getSettings());
});

app.patch('/api/settings', (req, res) => {
  const updates = req.body as Partial<{ storyboardUrl: string }>;
  const settings = updateSettings(updates);
  res.json(settings);
});

// Serve frontend in production
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message.includes('File too large')) {
    res.status(413).json({ error: `文件超过 ${process.env.MAX_FILE_SIZE_MB || 500}MB 限制` });
    return;
  }
  res.status(500).json({ error: err.message || '服务器错误' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FloraFlow server running on http://0.0.0.0:${PORT}`);
});

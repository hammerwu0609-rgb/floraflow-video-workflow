import type { Task, AppFile, AppFolder, Role, User, TaskType } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
  });
  if (res.status === 401) {
    throw new AuthError('未登录');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || '请求失败');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  health: () => request<{ status: string }>('/api/health'),

  login: (username: string, password: string) =>
    request<User>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    request<void>('/api/auth/logout', { method: 'POST' }),

  me: () => request<User>('/api/auth/me'),

  getUsers: () => request<Record<Role, User>>('/api/users'),

  getTasks: () => request<Task[]>('/api/tasks'),

  createTask: (data: { title: string; description: string; type: TaskType }) =>
    request<Task>('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  updateTask: (id: string, updates: Partial<Task>) =>
    request<Task>(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }),

  addComment: (taskId: string, text: string) =>
    request(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }),

  getFiles: () => request<AppFile[]>('/api/files'),

  uploadFile: async (file: File, opts: { folder?: string; taskId?: string }) => {
    const form = new FormData();
    if (opts.folder) form.append('folder', opts.folder);
    if (opts.taskId) form.append('taskId', opts.taskId);
    form.append('file', file);
    return request<AppFile>('/api/files/upload', { method: 'POST', body: form });
  },

  updateDriveFiles: (ids: string[], updates: Partial<AppFile>) =>
    request<AppFile[]>('/api/files/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates }),
    }),

  deleteFile: (id: string) =>
    request<void>(`/api/files/${id}`, { method: 'DELETE' }),

  deleteFiles: (ids: string[]) =>
    request<void>('/api/files/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    }),

  deleteTask: (id: string) =>
    request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),

  approveTask: (id: string) =>
    request<Task>(`/api/tasks/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }),

  getFolders: () => request<AppFolder[]>('/api/folders'),

  addFolder: (name: string, theme: 'video' | 'audio' | 'project' = 'project') =>
    request<AppFolder>('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, theme }),
    }),

  renameFolder: (id: string, name: string) =>
    request<AppFolder>(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),

  deleteFolder: (id: string) =>
    request<void>(`/api/folders/${id}`, { method: 'DELETE' }),

  downloadUrl: (fileId: string) => `${API_BASE}/api/files/${fileId}/download`,
  previewUrl: (fileId: string) => `${API_BASE}/api/files/${fileId}/preview`,

  getSettings: () => request<{ storyboardUrl: string }>('/api/settings'),

  updateSettings: (data: { storyboardUrl: string }) =>
    request<{ storyboardUrl: string }>('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ success: true }>('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword }),
    }),
};

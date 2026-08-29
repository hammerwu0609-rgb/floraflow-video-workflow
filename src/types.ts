export type Role = 'editor' | 'aigc' | 'aigc2' | 'aigc3' | 'audio' | 'audio2' | 'audio3';

export interface User {
  id: Role;
  name: string;
  avatar: string;
  roleTitle: string;
}

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'approved';
export type TaskType = 'video' | 'audio' | 'general';

export interface Comment {
  id: string;
  authorId: Role;
  text: string;
  createdAt: string;
}

export interface AppFile {
  id: string;
  name: string;
  size: string;
  type: 'video' | 'audio' | 'image' | 'other';
  url: string;
  uploadedBy: Role;
  createdAt: string;
  folder?: string;
  storedName?: string;
  sizeBytes?: number;
}

export interface AppFolder {
  id: string;
  name: string;
  theme: 'video' | 'audio' | 'image' | 'project';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  type: TaskType;
  assigneeId: Role | null;
  comments: Comment[];
  files: AppFile[];
  createdAt: string;
}

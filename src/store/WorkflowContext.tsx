import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Task, AppFile, AppFolder, Role, User, TaskType } from '../types';
import { api, AuthError } from '../api/client';
import { LoginPage } from '../components/LoginPage';

interface WorkflowState {
  currentUser: User;
  users: Record<Role, User>;
  tasks: Task[];
  driveFiles: AppFile[];
  folders: AppFolder[];
  storyboardUrl: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  createTask: (title: string, description: string, type: TaskType) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  addComment: (taskId: string, text: string) => Promise<void>;
  uploadFileToTask: (taskId: string, file: File) => Promise<void>;
  uploadFileToDrive: (file: File, folder?: string) => Promise<void>;
  updateDriveFiles: (ids: string[], updates: Partial<AppFile>) => Promise<void>;
  deleteDriveFiles: (ids: string[]) => Promise<void>;
  addFolder: (name: string, theme?: 'video' | 'audio' | 'project') => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  updateStoryboardUrl: (url: string) => Promise<void>;
}

const WorkflowContext = createContext<WorkflowState | undefined>(undefined);

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<Record<Role, User> | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [driveFiles, setDriveFiles] = useState<AppFile[]>([]);
  const [folders, setFolders] = useState<AppFolder[]>([]);
  const [storyboardUrl, setStoryboardUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [usersData, tasksData, filesData, foldersData, settingsData] = await Promise.all([
        api.getUsers(),
        api.getTasks(),
        api.getFiles(),
        api.getFolders(),
        api.getSettings(),
      ]);
      setUsers(usersData);
      setTasks(tasksData);
      setDriveFiles(filesData);
      setFolders(foldersData);
      setStoryboardUrl(settingsData.storyboardUrl);
    } catch (e) {
      if (e instanceof AuthError) {
        setAuthenticated(false);
        setCurrentUser(null);
        return;
      }
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const initAuth = useCallback(async () => {
    try {
      const user = await api.me();
      setCurrentUser(user);
      setAuthenticated(true);
      await refresh();
    } catch (e) {
      if (!(e instanceof AuthError)) {
        setError(e instanceof Error ? e.message : '连接失败');
      }
      setAuthenticated(false);
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [authenticated, refresh]);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    setAuthenticated(true);
    setLoading(true);
    await refresh();
  };

  const logout = async () => {
    await api.logout();
    setAuthenticated(false);
    setCurrentUser(null);
    setUsers(null);
    setTasks([]);
    setDriveFiles([]);
    setFolders([]);
  };

  const updateTaskFn = async (id: string, updates: Partial<Task>) => {
    const updated = await api.updateTask(id, updates);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
  };

  const addComment = async (taskId: string, text: string) => {
    await api.addComment(taskId, text);
    await refresh();
  };

  const uploadFileToTask = async (taskId: string, file: File) => {
    await api.uploadFile(file, { taskId });
    await refresh();
  };

  const uploadFileToDrive = async (file: File, folder?: string) => {
    await api.uploadFile(file, { folder });
    await refresh();
  };

  const updateDriveFilesFn = async (ids: string[], updates: Partial<AppFile>) => {
    const files = await api.updateDriveFiles(ids, updates);
    setDriveFiles(files);
  };

  const deleteDriveFilesFn = async (ids: string[]) => {
    await api.deleteFiles(ids);
    setDriveFiles(prev => prev.filter(f => !ids.includes(f.id)));
  };

  const deleteTaskFn = async (id: string) => {
    await api.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addFolderFn = async (name: string, theme: 'video' | 'audio' | 'project' = 'project') => {
    const folder = await api.addFolder(name, theme);
    setFolders(prev => [...prev, folder]);
  };

  const renameFolderFn = async (id: string, name: string) => {
    const updated = await api.renameFolder(id, name);
    setFolders(prev => prev.map(f => f.id === id ? updated : f));
  };

  const deleteFolderFn = async (id: string) => {
    await api.deleteFolder(id);
    setFolders(prev => prev.filter(f => f.id !== id));
    setDriveFiles(prev => prev.map(f => f.folder === id ? { ...f, folder: undefined } : f));
  };

  const createTask = async (title: string, description: string, type: TaskType) => {
    await api.createTask({ title, description, type });
    await refresh();
  };

  const updateStoryboardUrl = async (url: string) => {
    const settings = await api.updateSettings({ storyboardUrl: url });
    setStoryboardUrl(settings.storyboardUrl);
  };

  if (!authenticated) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-sand">
          <div className="w-10 h-10 border-2 border-moss border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    return <LoginPage onLogin={handleLogin} />;
  }

  if (!currentUser || !users) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand">
        <div className="text-center">
          <p className="text-earth font-medium">{error ? `连接失败: ${error}` : '正在加载...'}</p>
          {error && (
            <button onClick={refresh} className="mt-4 px-6 py-2 bg-moss text-white rounded-2xl text-sm">
              重试
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <WorkflowContext.Provider value={{
      currentUser, users, tasks, driveFiles, folders, storyboardUrl, loading, error, refresh, logout,
      createTask, deleteTask: deleteTaskFn, updateTask: updateTaskFn, addComment, uploadFileToTask, uploadFileToDrive,
      updateDriveFiles: updateDriveFilesFn, deleteDriveFiles: deleteDriveFilesFn,
      addFolder: addFolderFn, renameFolder: renameFolderFn, deleteFolder: deleteFolderFn,
      updateStoryboardUrl,
    }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error('useWorkflow must be used within WorkflowProvider');
  return context;
};

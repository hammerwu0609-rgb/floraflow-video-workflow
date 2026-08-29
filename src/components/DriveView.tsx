import React, { useState } from 'react';
import { useWorkflow } from '../store/WorkflowContext';
import { HardDrive, FileVideo, FileAudio, Image, Download, UploadCloud, Folder, FolderOpen, Check, X, RotateCcw, CheckCircle2, Plus, Edit2, Trash2, Loader2, Play, Search } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import { AppFile, AppFolder } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const PAPER_TEXTURE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.25'/%3E%3C/svg%3E")`;

export const DriveView: React.FC = () => {
  const { driveFiles, users, uploadFileToDrive, currentUser, updateDriveFiles, deleteDriveFiles, folders, addFolder, renameFolder, deleteFolder } = useWorkflow();
  const [activeTab, setActiveTab] = useState<'all' | string>('all');
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [undoToast, setUndoToast] = useState<{ items: { id: string; prevFolder?: string }[]; count: number; targetName: string } | null>(null);

  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [playingFile, setPlayingFile] = useState<AppFile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all');

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(folderId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
  };

  const handleDrop = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);

    if (!e.dataTransfer.files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(e.dataTransfer.files)) {
        await uploadFileToDrive(file, folderId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleMainDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleMainDrop = (e: React.DragEvent) => e.preventDefault();

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleMoveToFolder = async (folderId: string) => {
    const targetFolder = folders.find(f => f.id === folderId);
    if (!targetFolder) return;

    const ids = Array.from(selectedIds);
    const prevStates = ids.map(id => ({
      id,
      prevFolder: driveFiles.find(f => f.id === id)?.folder,
    }));

    setUndoToast({ items: prevStates, count: ids.length, targetName: targetFolder.name });
    await updateDriveFiles(ids, { folder: folderId });
    setSelectedIds(new Set());
    setShowMoveMenu(false);

    setTimeout(() => setUndoToast(null), 8000);
  };

  const handleUndo = async () => {
    if (undoToast) {
      for (const item of undoToast.items) {
        await updateDriveFiles([item.id], { folder: item.prevFolder });
      }
      setUndoToast(null);
    }
  };

  const submitAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await addFolder(newFolderName, 'project');
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  const finishRename = () => {
    if (editFolderName.trim() && editingFolderId) {
      renameFolder(editingFolderId, editFolderName);
    }
    setEditingFolderId(null);
  };

  const submitRenameFolder = (e: React.FormEvent) => {
    e.preventDefault();
    finishRename();
  };

  const displayFiles = (activeTab === 'all' ? driveFiles : driveFiles.filter(f => f.folder === activeTab))
    .filter(f => {
      const matchName = f.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = typeFilter === 'all' || f.type === typeFilter;
      return matchName && matchType;
    });

  const renderFolderCard = (folder: AppFolder) => {
    const isActive = activeTab === folder.id;
    const isDragOver = dragOverFolder === folder.id;
    const type = folder.theme;

    const Icon = type === 'video' ? FileVideo : type === 'audio' ? FileAudio : type === 'image' ? Image : FolderOpen;
    const filesInFolder = driveFiles.filter(f => f.folder === folder.id);

    return (
      <div
        key={folder.id}
        onClick={() => setActiveTab(isActive ? 'all' : folder.id)}
        onDragOver={(e) => handleDragOver(e, folder.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, folder.id)}
        className={cn(
          "relative overflow-hidden rounded-[2rem] border-2 transition-all duration-300 cursor-pointer p-6 flex flex-col group min-w-[280px]",
          isActive ? "border-moss bg-white shadow-[0_8px_30px_rgb(137,168,128,0.12)] scale-[1.01]" : "border-earth-light/40 bg-white/40 shadow-sm hover:bg-white/70",
          isDragOver && "border-leaf border-dashed scale-[1.02] shadow-[0_8px_30px_rgb(137,168,128,0.3)]"
        )}
      >
        <div
          className="absolute inset-0 pointer-events-none mix-blend-multiply transition-opacity duration-300"
          style={{ backgroundImage: PAPER_TEXTURE, opacity: isDragOver ? 0.8 : 0.1 }}
        />
        <div className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none",
          isDragOver && "opacity-100",
            type === 'video' ? "bg-gradient-to-br from-leaf/30 to-transparent" : type === 'audio' ? "bg-gradient-to-br from-sky/30 to-transparent" : type === 'image' ? "bg-gradient-to-br from-violet-300/40 to-transparent" : "bg-gradient-to-br from-orange-200/40 to-transparent"
        )} />

        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className={cn(
            "p-4 rounded-2xl transition-all duration-300 relative",
            type === 'video' ? "bg-leaf/15 text-moss group-hover:bg-leaf/25" : type === 'audio' ? "bg-sky/15 text-sky-700 group-hover:bg-sky/25" : type === 'image' ? "bg-violet-100 text-violet-700 group-hover:bg-violet-200" : "bg-orange-100 text-orange-700 group-hover:bg-orange-200",
            isDragOver && "scale-110 shadow-inner"
          )}>
            <Icon className={cn("w-8 h-8 transition-transform duration-300", isDragOver && "-rotate-6 scale-110")} />
            <AnimatePresence>
              {isDragOver && (
                <motion.div initial={{ opacity: 0, scale: 0.5, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5 }} className="absolute -right-3 -bottom-3 bg-white rounded-full p-1 shadow-md text-moss">
                  <UploadCloud className="w-5 h-5 animate-pulse" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-earth shadow-sm border border-earth-light/20">
              {filesInFolder.length} 个项目
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setEditFolderName(folder.name); }}
              className="p-1.5 text-earth/50 hover:text-moss hover:bg-moss/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {folder.id !== 'video-default' && folder.id !== 'audio-default' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFolder(folder.id);
                  if (activeTab === folder.id) setActiveTab('all');
                }}
                className="p-1.5 text-earth/50 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {editingFolderId === folder.id ? (
          <form onSubmit={submitRenameFolder} onClick={e => e.stopPropagation()} className="relative z-20 mb-1.5">
            <input
              autoFocus
              type="text"
              value={editFolderName}
              onChange={e => setEditFolderName(e.target.value)}
              onBlur={finishRename}
              className="w-full bg-white border border-moss/50 focus:ring-1 ring-moss/50 rounded-lg px-2 py-1 text-xl font-serif text-bark outline-none"
            />
          </form>
        ) : (
          <h3 className="relative z-10 text-xl font-serif font-medium text-bark mb-1.5 truncate pr-2" title={folder.name}>{folder.name}</h3>
        )}

        <p className={cn("relative z-10 text-sm font-medium transition-colors duration-300", isDragOver ? "text-bark" : "text-earth")}>
          {isDragOver ? "松开即可上传..." : "点击筛选或拖拽上传"}
        </p>
      </div>
    );
  };

  return (
    <div className="relative flex-1 min-h-0 bg-white/40 border border-earth-light/40 rounded-3xl p-8 shadow-[0_8px_30px_rgb(140,123,109,0.03)] backdrop-blur-sm flex flex-col" onDragOver={handleMainDragOver} onDrop={handleMainDrop}>
      <div className="flex items-center justify-between mb-8 shrink-0">
        <h2 className="text-2xl font-serif text-moss flex items-center gap-3">
          <HardDrive className="text-earth" /> 团队云盘与素材库
        </h2>
        <div className="flex items-center gap-3">
          {uploading && <span className="text-sm text-moss animate-pulse flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> 正在上传...</span>}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth/50 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索文件名..."
                className="bg-white border border-earth-light/50 focus:ring-1 ring-moss/50 rounded-xl pl-9 pr-3 py-2 text-sm text-bark outline-none w-48 transition-all focus:w-56"
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as 'all' | 'video' | 'audio' | 'image')}
              className="bg-white border border-earth-light/50 focus:ring-1 ring-moss/50 rounded-xl px-3 py-2 text-sm text-bark outline-none cursor-pointer"
            >
              <option value="all">全部类型</option>
              <option value="video">视频</option>
              <option value="audio">音频</option>
              <option value="image">图片</option>
            </select>
          </div>
          <button
            onClick={() => setIsAddingFolder(true)}
            className="bg-white border border-earth-light hover:border-moss hover:text-moss text-earth px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> 新建文件夹
          </button>
        </div>
      </div>

      {/* Folders Section */}
      <div
        className="flex gap-6 mb-10 shrink-0 overflow-x-auto pb-4 px-1"
        onWheel={e => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.currentTarget.scrollLeft += e.deltaY;
            e.preventDefault();
          }
        }}
      >
        {folders.map(folder => renderFolderCard(folder))}

        {isAddingFolder && (
          <div className="relative overflow-hidden rounded-[2rem] border-2 border-dashed border-earth-light/50 bg-white/20 p-6 flex flex-col min-w-[280px]">
            <div className="p-4 rounded-2xl bg-white/50 text-earth w-max mb-6">
              <FolderOpen className="w-8 h-8" />
            </div>
            <form onSubmit={submitAddFolder} className="mt-auto">
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="文件夹名称..."
                className="w-full bg-white border border-moss/50 focus:ring-1 ring-moss/50 rounded-xl px-3 py-2 text-bark outline-none mb-2"
              />
              <div className="flex gap-2">
                <button type="submit" className="bg-moss hover:bg-leaf text-white px-3 py-1.5 rounded-lg text-sm font-medium flex-1">创建</button>
                <button type="button" onClick={() => setIsAddingFolder(false)} className="bg-white hover:bg-sand text-earth px-3 py-1.5 rounded-lg text-sm font-medium">取消</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* File List Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h3 className="text-lg font-medium text-bark flex items-center gap-2">
          <Folder className="w-5 h-5 text-earth" />
          {activeTab === 'all' ? '所有文件' : folders.find(f => f.id === activeTab)?.name}
        </h3>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <span className="text-sm font-medium text-moss px-3 bg-leaf/10 rounded-full py-1 border border-leaf/20">
              已选 {selectedIds.size} 项
            </span>
          )}
          <span className="bg-sand-light border border-earth-light/30 px-4 py-1.5 rounded-full text-sm font-medium text-earth shadow-sm">
            显示 {displayFiles.length} 项{(searchQuery || typeFilter !== 'all') && ` / 共 ${activeTab === 'all' ? driveFiles.length : driveFiles.filter(f => f.folder === activeTab).length} 项`}
          </span>
        </div>
      </div>

      {/* Files Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-none pr-1 relative min-h-0">
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
          <AnimatePresence mode="popLayout">
            {displayFiles.map(file => {
              const isSelected = selectedIds.has(file.id);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ duration: 0.25, type: "spring", bounce: 0.3 }}
                  key={file.id}
                  onClick={() => handleToggleSelect(file.id)}
                  className={cn(
                    "relative p-5 rounded-[1.5rem] border shadow-sm transition-all duration-300 group flex flex-col cursor-pointer overflow-hidden",
                    isSelected ? "bg-moss/5 border-moss shadow-[0_8px_20px_rgb(74,93,78,0.15)] ring-1 ring-moss" : "bg-white border-earth-light/30 hover:shadow-[0_12px_30px_rgb(74,93,78,0.08)] hover:border-leaf/40"
                  )}
                >
                  {isSelected && <div className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-30" style={{ backgroundImage: PAPER_TEXTURE }} />}

                  <div
                    className={cn(
                      "absolute top-3 left-3 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                      isSelected ? "bg-moss border-moss text-white scale-110 shadow-md" : "bg-white/80 border-earth-light/80 text-transparent opacity-0 group-hover:opacity-100 hover:border-moss/50 backdrop-blur-sm shadow-sm"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(file.id);
                    }}
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </div>

                  <div className={cn(
                    "relative aspect-[4/3] rounded-2xl mb-4 flex items-center justify-center transition-colors overflow-hidden z-10",
                    file.type === 'video' ? "bg-sand text-earth/50 group-hover:bg-leaf/10 group-hover:text-leaf" : file.type === 'audio' ? "bg-sand text-earth/50 group-hover:bg-sky/10 group-hover:text-sky-600" : "bg-sand text-earth/50 group-hover:bg-violet-100 group-hover:text-violet-600",
                    isSelected && "bg-white/50 text-moss"
                  )}>
                    {file.type === 'video'
                      ? <video src={api.previewUrl(file.id)} preload="metadata" muted playsInline className="w-full h-full object-cover rounded-2xl" />
                      : file.type === 'image'
                        ? <img src={api.previewUrl(file.id)} alt={file.name} className="w-full h-full object-cover rounded-2xl" />
                        : <FileAudio className="w-12 h-12" />}

                    <div className="absolute inset-0 bg-moss/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex items-center justify-center backdrop-blur-[2px] gap-3">
                      {(file.type === 'video' || file.type === 'audio') && (
                        <button
                          className="bg-white text-moss p-3 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform"
                          onClick={(e) => { e.stopPropagation(); setPlayingFile(file); }}
                          title="播放"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        className="bg-white text-moss p-3 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform"
                        onClick={(e) => { e.stopPropagation(); window.open(api.downloadUrl(file.id), '_blank'); }}
                        title="下载"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        className="bg-white text-red-500 p-3 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform"
                        onClick={(e) => { e.stopPropagation(); deleteDriveFiles([file.id]); }}
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="relative z-10 font-medium text-bark truncate mb-1 pr-2 tracking-tight" title={file.name}>{file.name}</h3>

                  <div className="relative z-10 flex items-center justify-between mt-auto pt-4 border-t border-earth-light/20 text-xs text-earth">
                    <span className="font-mono bg-white/50 px-2 py-0.5 rounded-md backdrop-blur-sm border border-earth-light/30">{file.size}</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <img src={users[file.uploadedBy].avatar} alt="" className="w-5 h-5 rounded-full bg-sand shadow-sm border border-earth-light/30" />
                      {users[file.uploadedBy].name}
                    </span>
                  </div>
                  <p className="relative z-10 text-[10px] text-earth/60 mt-1.5 uppercase tracking-wider">{format(new Date(file.createdAt), 'MMM d, yyyy')}</p>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {displayFiles.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full h-48 border-2 border-dashed border-earth-light/50 rounded-[2rem] flex flex-col items-center justify-center text-earth bg-white/30">
              <Folder className="w-10 h-10 mb-3 opacity-40" />
              <p className="font-medium">当前分类下暂无文件</p>
              <p className="text-xs mt-1 text-earth/60">可将文件直接拖拽至上方进行上传</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Floating Action Bar for Bulk Select */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 100, opacity: 0, x: '-50%' }}
            className="absolute bottom-8 left-1/2 bg-bark text-sand px-6 py-4 rounded-3xl flex items-center gap-6 shadow-[0_20px_60px_rgb(45,42,38,0.3)] z-50 overflow-visible"
          >
            <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-20 rounded-3xl" style={{ backgroundImage: PAPER_TEXTURE }} />

            <div className="relative flex items-center gap-3">
              <span className="bg-sand/10 px-4 py-1.5 rounded-full text-sm font-medium">{selectedIds.size} 项已选择</span>
            </div>
            <div className="relative w-px h-6 bg-sand/20" />

            <div className="relative">
              <button
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                className="relative flex items-center gap-2 hover:text-leaf transition-colors text-sm font-medium bg-sand/5 hover:bg-sand/10 px-4 py-2 rounded-2xl"
              >
                <FolderOpen className="w-4 h-4" /> 移动至...
              </button>

              {showMoveMenu && (
                <div className="absolute bottom-full left-0 mb-4 bg-white border border-earth-light/40 shadow-xl rounded-2xl p-2 min-w-[200px] text-bark">
                  <div className="text-xs font-semibold text-earth mx-2 my-2 tracking-wider">选择目标文件夹</div>
                  {folders.map(f => (
                    <button
                      key={f.id}
                      onClick={() => handleMoveToFolder(f.id)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-moss/10 hover:text-moss text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Folder className="w-4 h-4" /> {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                deleteDriveFiles(Array.from(selectedIds));
                setSelectedIds(new Set());
              }}
              className="relative flex items-center gap-2 hover:text-red-400 transition-colors text-sm font-medium bg-sand/5 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent px-4 py-2 rounded-2xl ml-2 text-red-300"
            >
              <Trash2 className="w-4 h-4" /> 删除选中项
            </button>

            <button onClick={() => { setSelectedIds(new Set()); setShowMoveMenu(false); }} className="relative p-2 hover:bg-white/10 rounded-full transition-colors ml-2">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo Toast Confirmation */}
      <AnimatePresence>
        {undoToast && (
          <motion.div
            initial={{ y: 50, scale: 0.9, opacity: 0, x: '-50%' }}
            animate={{ y: 0, scale: 1, opacity: 1, x: '-50%' }}
            exit={{ y: 20, scale: 0.9, opacity: 0, x: '-50%' }}
            className="absolute bottom-32 left-1/2 bg-white border border-moss/20 px-6 py-4 rounded-3xl flex items-center gap-6 shadow-[0_20px_50px_rgb(74,93,78,0.15)] z-50 text-bark overflow-hidden"
          >
            <div className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-40 rounded-3xl" style={{ backgroundImage: PAPER_TEXTURE }} />

            <div className="relative flex items-center gap-3 text-sm font-medium text-moss">
              <CheckCircle2 className="w-5 h-5" />
              成功将 {undoToast.count} 个素材移动至「{undoToast.targetName}」
            </div>
            <div className="relative w-px h-6 bg-earth-light/50" />
            <button
              onClick={handleUndo}
              className="relative flex items-center gap-1.5 text-bark hover:text-moss bg-sand hover:bg-leaf/15 px-4 py-2 rounded-2xl transition-all text-sm font-semibold shadow-sm"
            >
              <RotateCcw className="w-4 h-4" /> 撤销操作
            </button>
            <button onClick={() => setUndoToast(null)} className="relative p-1.5 text-earth hover:text-bark rounded-full transition-colors ml-1 bg-white/50 hover:bg-sand">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {playingFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
            onClick={() => setPlayingFile(null)}
          >
            <button onClick={() => setPlayingFile(null)} className="absolute top-6 right-6 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
              <X className="w-8 h-8" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="max-w-5xl w-full"
            >
              {playingFile.type === 'video' ? (
                <video src={api.previewUrl(playingFile.id)} controls autoPlay className="w-full rounded-2xl shadow-2xl" />
              ) : (
                <audio src={api.previewUrl(playingFile.id)} controls autoPlay className="w-full" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

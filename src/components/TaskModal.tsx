import React, { useState, useRef } from 'react';
import { Task, AppFile } from '../types';
import { useWorkflow } from '../store/WorkflowContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ArrowRight, MessageSquare, UploadCloud, FileVideo, FileAudio, CornerDownRight, Download, Trash2, Play } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { api } from '../api/client';

export const TaskModal: React.FC<{ task: Task; onClose: () => void }> = ({ task: initialTask, onClose }) => {
  const { tasks, currentUser, updateTask, addComment, uploadFileToTask, users, deleteTask } = useWorkflow();
  const task = tasks.find(t => t.id === initialTask.id) || initialTask;
  const [commentText, setCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [acting, setActing] = useState(false);
  const [playingFile, setPlayingFile] = useState<AppFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canClaim = task.status === 'todo';
  const canSubmitReview = task.status === 'in-progress' && task.assigneeId === currentUser.id;
  const canApprove = task.status === 'review';

  const handleClaim = async () => {
    setActing(true);
    try {
      await updateTask(task.id, { assigneeId: currentUser.id });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setActing(false);
    }
  };

  const handleSubmitReview = async () => {
    setActing(true);
    try {
      await updateTask(task.id, { status: 'review' });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setActing(false);
    }
  };

  const handleApprove = async () => {
    setActing(true);
    try {
      await api.approveTask(task.id);
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!commentText.trim()) {
      alert('请在评论框中输入退回理由。');
      return;
    }
    setActing(true);
    try {
      const text = commentText;
      setCommentText('');
      await addComment(task.id, text);
      await updateTask(task.id, { status: 'in-progress' });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setActing(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await addComment(task.id, commentText);
      setCommentText('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '评论失败');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const rawFile = e.target.files[0];
    setIsUploading(true);
    try {
      await uploadFileToTask(task.id, rawFile);
    } catch (err) {
      alert(err instanceof Error ? err.message : '上传失败');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = (file: AppFile) => {
    window.open(api.downloadUrl(file.id), '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-bark/30 backdrop-blur-sm" />

      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-sand-light rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-full border border-white"
      >
        <header className="px-8 py-6 border-b border-earth-light/30 flex justify-between items-start bg-white/50 backdrop-blur-md">
          <div>
            <div className="flex gap-3 items-center mb-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold capitalize",
                task.status === 'todo' ? "bg-earth-light/30 text-earth" :
                task.status === 'in-progress' ? "bg-sky/20 text-sky" :
                task.status === 'review' ? "bg-orange-100 text-orange-600" :
                "bg-leaf/20 text-moss"
              )}>
                {task.status === 'todo' ? '待认领' : task.status === 'in-progress' ? '制作中' : task.status === 'review' ? '待审核' : '已批准'}
              </span>
              <span className="text-earth text-sm font-medium flex items-center gap-1">
                {task.type === 'video' ? <FileVideo className="w-4 h-4" /> : <FileAudio className="w-4 h-4" />}
                {task.type === 'video' ? '视频需求' : task.type === 'audio' ? '音频需求' : '需求'}
              </span>
            </div>
            <h2 className="text-3xl font-serif text-bark">{task.title}</h2>
          </div>
          <div className="flex items-center gap-2">
              <button
                onClick={() => { deleteTask(task.id); onClose(); }}
                className="p-2 hover:bg-red-50 rounded-full text-red-500/80 hover:text-red-600 transition-colors"
                title="删除任务"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full text-earth transition-colors">
            <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h3 className="text-sm font-bold text-moss uppercase tracking-wider mb-2">任务描述</h3>
              <p className="text-bark bg-white/60 p-5 rounded-2xl border border-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] leading-relaxed">
                {task.description}
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-moss uppercase tracking-wider mb-3">审核文件</h3>
              {task.files.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {task.files.map(file => (
                    <div key={file.id} className="bg-white p-4 rounded-2xl border border-earth-light/40 flex flex-col gap-2 group hover:border-moss/40 transition-colors">
                      <div className="w-full aspect-video bg-sand rounded-xl flex items-center justify-center text-earth group-hover:text-leaf transition-colors relative overflow-hidden">
                        {file.type === 'video' ? (
                          <video src={api.previewUrl(file.id)} preload="metadata" muted playsInline className="w-full h-full object-cover rounded-xl" />
                        ) : file.type === 'image' ? (
                          <img src={api.previewUrl(file.id)} alt={file.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <FileAudio className="w-8 h-8 opacity-50" />
                        )}
                        <div className="absolute inset-0 bg-moss/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                          {(file.type === 'video' || file.type === 'audio') && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setPlayingFile(file); }}
                              className="bg-white text-moss p-2.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform"
                              title="播放"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(file)}
                            className="bg-white text-moss p-2.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform"
                            title="下载"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="truncate text-sm font-medium text-bark">{file.name}</div>
                      <div className="flex justify-between text-xs text-earth">
                        <span>{file.size}</span>
                        <span>上传者: {users[file.uploadedBy].name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-earth-light/50 rounded-2xl flex flex-col items-center justify-center text-earth/60 bg-white/30">
                  <UploadCloud className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm font-medium">暂无文件上传。</p>
                </div>
              )}

              {task.status !== 'approved' && (
                <div className="mt-4">
                  <input type="file" ref={fileInputRef} className="hidden" accept="video/*,audio/*,.mp4,.mov,.wav,.mp3,.flac" onChange={handleUpload} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex w-full items-center justify-center gap-2 bg-leaf/10 text-moss hover:bg-leaf/20 py-3 rounded-2xl font-medium transition-colors disabled:opacity-50"
                  >
                    {isUploading ? <span className="animate-pulse">正在上传至云端...</span> : <><UploadCloud className="w-5 h-5" /> 上传媒体文件</>}
                  </button>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-8 flex flex-col h-full">
            <section className="bg-white/60 rounded-3xl p-5 border border-white shadow-sm">
              <h3 className="text-sm font-bold text-moss uppercase tracking-wider mb-4">负责人</h3>
              <div className="flex items-center gap-3">
                {task.assigneeId ? (
                  <>
                    <img src={users[task.assigneeId].avatar} alt="" className="w-10 h-10 rounded-full border border-earth-light/40 bg-sand" />
                    <div>
                      <p className="font-medium text-bark">{users[task.assigneeId].name}</p>
                      <p className="text-xs text-earth">{users[task.assigneeId].roleTitle}</p>
                    </div>
                  </>
                ) : (
                  <span className="text-earth text-sm italic">未分配</span>
                )}
              </div>
            </section>

            <section className="flex-1 flex flex-col min-h-[250px]">
              <h3 className="text-sm font-bold text-moss uppercase tracking-wider mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> 讨论区
              </h3>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                {task.comments.length === 0 ? (
                  <p className="text-sm text-earth/60 italic text-center mt-4">暂无评论</p>
                ) : (
                  task.comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <img src={users[comment.authorId].avatar} alt="" className="w-8 h-8 rounded-full bg-sand shrink-0" />
                      <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-earth-light/20 flex-1">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-xs font-semibold text-bark">{users[comment.authorId].name}</span>
                          <span className="text-[10px] text-earth">{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</span>
                        </div>
                        <p className="text-sm text-bark/90 leading-relaxed">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handlePostComment} className="mt-auto relative">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="输入评论或退回理由..."
                  className="w-full bg-white border border-earth-light/50 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-moss/50 focus:ring-1 focus:ring-moss/50 transition-all placeholder:text-earth/60 shadow-inner"
                />
                <button type="submit" disabled={!commentText.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-leaf text-white rounded-xl hover:bg-moss transition-colors disabled:opacity-50">
                  <CornerDownRight className="w-4 h-4" />
                </button>
              </form>
            </section>
          </div>
        </div>

        <footer className="p-6 border-t border-earth-light/30 bg-white/70 backdrop-blur flex justify-end gap-3">
          {canClaim && (
            <button onClick={handleClaim} disabled={acting} className="bg-bark text-sand hover:bg-black px-6 py-3 rounded-2xl font-medium tracking-wide flex items-center gap-2 transition-all active:scale-95 shadow-lg disabled:opacity-50">
              <Check className="w-5 h-5" /> 认领任务
            </button>
          )}
          {canSubmitReview && (
            <button onClick={handleSubmitReview} disabled={acting || task.files.length === 0} className="bg-leaf text-white hover:bg-moss px-6 py-3 rounded-2xl font-medium tracking-wide flex items-center gap-2 transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
              <ArrowRight className="w-5 h-5" /> 提交审核
            </button>
          )}
          {canApprove && (
            <>
              <button onClick={handleReject} disabled={acting} className="bg-white border border-earth hover:bg-sand text-earth hover:text-bark px-6 py-3 rounded-2xl font-medium tracking-wide transition-all active:scale-95 disabled:opacity-50">
                退回并要求修改
              </button>
              <button onClick={handleApprove} disabled={acting} className="bg-moss text-white hover:bg-moss-light px-6 py-3 rounded-2xl font-medium tracking-wide flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_20px_rgb(74,93,78,0.3)] disabled:opacity-50">
                <Check className="w-5 h-5" /> 批准资产
              </button>
            </>
          )}
        </footer>
      </motion.div>

      <AnimatePresence>
        {playingFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
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

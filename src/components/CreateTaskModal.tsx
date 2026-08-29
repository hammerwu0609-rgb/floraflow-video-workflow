import React, { useState } from 'react';
import { useWorkflow } from '../store/WorkflowContext';
import { motion } from 'motion/react';
import { X, FileVideo, FileAudio, Check } from 'lucide-react';
import { TaskType, Role, User } from '../types';
import { cn } from '../lib/utils';

export const CreateTaskModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { createTask, users } = useWorkflow();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('video');
  const [assigneeId, setAssigneeId] = useState<Role | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await createTask(title.trim(), description.trim(), type);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-bark/30 backdrop-blur-sm"
      />

      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-sand-light rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-full border border-white"
      >
        <header className="px-8 py-6 border-b border-earth-light/30 flex justify-between items-center bg-white/50 backdrop-blur-md">
          <h2 className="text-2xl font-serif text-bark">发布新需求</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full text-earth transition-colors">
            <X className="w-6 h-6" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-8 space-y-6">
          <div>
            <label className="text-sm font-bold text-moss uppercase tracking-wider mb-2 block">需求类型</label>
            <div className="flex gap-3">
              {(['video', 'audio', 'general'] as TaskType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-medium transition-all",
                    type === t ? "border-moss bg-leaf/10 text-moss" : "border-earth-light/40 text-earth hover:bg-white/60"
                  )}
                >
                  {t === 'video' ? <FileVideo className="w-5 h-5" /> : t === 'audio' ? <FileAudio className="w-5 h-5" /> : <span className="w-5 h-5 text-center text-xs">···</span>}
                  {t === 'video' ? 'AIGC 视频' : t === 'audio' ? '音效素材' : '其他'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-moss uppercase tracking-wider mb-2">需求标题 *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white border border-earth-light/50 rounded-2xl py-3 px-4 focus:outline-none focus:border-moss/50 focus:ring-1 focus:ring-moss/50 transition-all font-medium text-bark"
              placeholder="一句话描述要完成的工作"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-moss uppercase tracking-wider mb-2">详细描述</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-white border border-earth-light/50 rounded-2xl py-3 px-4 focus:outline-none focus:border-moss/50 focus:ring-1 focus:ring-moss/50 transition-all text-bark h-32 resize-none"
              placeholder="描述画面/音效要求、参考风格、时长等..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-moss uppercase tracking-wider mb-2">指派给</label>
            <select
              value={assigneeId}
              onChange={e => setAssigneeId(e.target.value as Role | '')}
              className="w-full bg-white border border-earth-light/50 rounded-2xl py-3 px-4 text-bark focus:outline-none focus:border-moss/50 focus:ring-1 focus:ring-moss/50 appearance-none"
            >
              <option value="">（待认领）</option>
              {(Object.values(users) as User[]).map(user => (
                <option key={user.id} value={user.id}>{user.name} - {user.roleTitle}</option>
              ))}
            </select>
          </div>
        </form>

        <footer className="p-6 border-t border-earth-light/30 bg-white/70 backdrop-blur flex justify-end gap-3">
          <button onClick={onClose} type="button" className="bg-white border border-earth hover:bg-sand text-earth hover:text-bark px-6 py-3 rounded-2xl font-medium tracking-wide transition-all active:scale-95">
            取消
          </button>
          <button
            onClick={handleSubmit}
            type="button"
            disabled={submitting || !title.trim() || !description.trim()}
            className="bg-moss text-white hover:bg-moss-light px-8 py-3 rounded-2xl font-medium tracking-wide flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_20px_rgb(74,93,78,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5" /> {submitting ? '发布中...' : '发布至待认领'}
          </button>
        </footer>
      </motion.div>
    </div>
  );
};

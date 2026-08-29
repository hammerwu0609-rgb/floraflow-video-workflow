import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import { useWorkflow } from '../store/WorkflowContext';
import { motion, AnimatePresence } from 'motion/react';
import { FileVideo, FileAudio, HardDrive, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { TaskModal } from './TaskModal';
import { CreateTaskModal } from './CreateTaskModal';

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: '待认领' },
  { id: 'in-progress', label: '制作中' },
  { id: 'review', label: '待审核' },
  { id: 'approved', label: '已批准' },
];

export const TaskBoard: React.FC = () => {
  const { tasks, users, currentUser } = useWorkflow();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex justify-end shrink-0">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-moss text-white hover:bg-moss-light px-5 py-2.5 rounded-2xl font-medium transition-all active:scale-95 shadow-lg"
        >
          <Plus className="w-5 h-5" /> 发布新需求
        </button>
      </div>

      <div className="flex gap-6 h-full overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="flex-1 min-w-[300px] flex flex-col bg-white/40 border border-earth-light/40 rounded-3xl p-4 shadow-[0_8px_30px_rgb(140,123,109,0.03)] backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="font-serif text-lg text-moss font-medium">{col.label}</h3>
              <span className="text-xs font-medium bg-sand px-2.5 py-1 rounded-full text-earth">
                {tasksByStatus[col.id].length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-2 scrollbar-none">
              <AnimatePresence>
                {tasksByStatus[col.id].map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                ))}
              </AnimatePresence>
              {tasksByStatus[col.id].length === 0 && (
                <div className="h-24 border-2 border-dashed border-earth-light/50 rounded-2xl flex items-center justify-center text-earth/50 text-sm font-medium">
                  暂无任务
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}
    </div>
  );
};

const TaskCard: React.FC<{ task: Task; onClick: () => void }> = ({ task, onClick }) => {
  const { users } = useWorkflow();
  const assignee = task.assigneeId ? users[task.assigneeId] : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="bg-white border border-earth-light/30 rounded-2xl p-5 shadow-sm hover:shadow-[0_8px_20px_rgb(74,93,78,0.08)] cursor-pointer transition-shadow duration-200"
    >
      <div className="flex justify-between items-start mb-3">
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5",
          task.type === 'video' ? "bg-leaf/10 text-moss" : "bg-sky/20 text-sky"
        )}>
          {task.type === 'video' ? <FileVideo className="w-3 h-3" /> : <FileAudio className="w-3 h-3" />}
          <span className="capitalize">{task.type === 'video' ? '视频' : task.type === 'audio' ? '音频' : task.type}</span>
        </span>
        {task.status === 'review' && <AlertCircle className="w-4 h-4 text-orange-400" />}
        {task.status === 'approved' && <CheckCircle2 className="w-4 h-4 text-leaf" />}
      </div>

      <h4 className="font-medium text-bark leading-snug mb-2">{task.title}</h4>
      <p className="text-sm text-earth line-clamp-2 leading-relaxed mb-4">{task.description}</p>

      <div className="flex items-center justify-between pt-3 border-t border-earth-light/20">
        <div className="flex items-center gap-2">
          {assignee ? (
            <img src={assignee.avatar} alt={assignee.name} className="w-6 h-6 rounded-full bg-sand" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-sand-light border border-dashed border-earth flex items-center justify-center text-[10px] text-earth">?</div>
          )}
          <span className="text-xs font-medium text-earth">{assignee ? assignee.name : '未分配'}</span>
        </div>

        {task.files.length > 0 && (
          <div className="text-xs text-earth flex items-center gap-1">
            <HardDrive className="w-3 h-3" /> {task.files.length}
          </div>
        )}
      </div>
    </motion.div>
  );
};

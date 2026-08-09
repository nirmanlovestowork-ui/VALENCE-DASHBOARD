import React, { useState } from 'react';
import { Task, Assignee } from '../types';
import TaskItem from './TaskItem';
import { Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface TaskColumnProps {
  assignee: Assignee;
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleCompletion: (id: string) => void;
  onDropTask?: (taskId: string) => void;
}

export default function TaskColumn({
  assignee,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleCompletion,
  onDropTask
}: TaskColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const pendingTasks = tasks.filter(t => !t.status);
  const completedTasks = tasks.filter(t => t.status);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onDropTask) {
      onDropTask(taskId);
    }
  };

  return (
    <section 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`h-full flex flex-col p-6 md:p-8 overflow-hidden transition-colors duration-200 ${
      assignee === 'BIBHU' ? 'border-r border-slate-200/60' : ''
    } ${
      isDragOver ? 'bg-blue-50/50' : assignee === 'BIBHU' ? 'bg-white' : 'bg-slate-50/50'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 shrink-0 pb-4 border-b border-slate-100">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${
            assignee === 'BIBHU' ? 'text-[#0056D2]' : 'text-slate-800'
          }`}>
            {assignee === 'BIBHU' ? 'Bibhu\'s Tasks' : 'Admin Tasks'}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {pendingTasks.length} {pendingTasks.length === 1 ? 'Task' : 'Tasks'} Remaining
          </p>
        </div>
        <button
          onClick={onAddTask}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all active:scale-[0.98] ${
            assignee === 'BIBHU'
              ? 'bg-[#0056D2] hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm hover:border-slate-300'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span>Add Task</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar -mr-2">
        {tasks.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
              <Plus className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-600 mb-1 font-semibold text-lg">No tasks yet</p>
            <p className="text-sm text-slate-500">Click "Add Task" to get started.</p>
          </div>
        ) : (
          <div className="space-y-4 pb-8">
            <AnimatePresence mode="popLayout">
              {pendingTasks.map((task) => (
                <TaskItem
                  key={task.task_id}
                  task={task}
                  onEdit={() => onEditTask(task)}
                  onDelete={() => onDeleteTask(task.task_id)}
                  onToggle={() => onToggleCompletion(task.task_id)}
                />
              ))}
              {completedTasks.length > 0 && (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-8 mt-8 border-t border-slate-200/60"
                >
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5 px-1 flex items-center gap-3">
                    <span>Completed Tasks</span>
                    <span className="flex-1 h-px bg-slate-200/60"></span>
                  </h3>
                  <div className="space-y-4 opacity-80">
                    {completedTasks.map((task) => (
                      <TaskItem
                        key={task.task_id}
                        task={task}
                        onEdit={() => onEditTask(task)}
                        onDelete={() => onDeleteTask(task.task_id)}
                        onToggle={() => onToggleCompletion(task.task_id)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}

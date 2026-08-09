import React, { useState, useEffect } from 'react';
import { Task, Assignee } from '../types';
import { X, Calendar as CalendarIcon, Type, Repeat } from 'lucide-react';
import { motion } from 'motion/react';

interface TaskFormModalProps {
  assignee: Assignee;
  initialData: Task | null;
  onSave: (task: Omit<Task, 'task_id'> | Task) => void;
  onClose: () => void;
}

export default function TaskFormModal({ assignee, initialData, onSave, onClose }: TaskFormModalProps) {
  const [title, setTitle] = useState(initialData?.task_name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  };
  
  const [hasDueDate, setHasDueDate] = useState(!!initialData?.due_date);
  const [isRecurring, setIsRecurring] = useState(initialData?.recurring || false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>(initialData?.frequency || 'daily');
  
  const [dueDate, setDueDate] = useState(
    initialData?.due_date ? new Date(new Date(initialData.due_date).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : getDefaultDateTime()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || (hasDueDate && !dueDate)) return;

    onSave({
      ...(initialData || {}),
      task_name: title.trim(),
      description: description.trim(),
      due_date: hasDueDate ? new Date(dueDate).toISOString() : null,
      assignee,
      status: initialData?.status || false,
      recurring: isRecurring,
      frequency: isRecurring ? frequency : undefined,
    } as Omit<Task, 'task_id'> | Task);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white/20 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            {initialData ? 'Edit Task' : `New Task for ${assignee}`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="title" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Type className="w-4 h-4 text-blue-500" />
              Task Name
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 font-medium"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Type className="w-4 h-4 text-blue-500" />
              Task Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details about this task..."
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 font-medium resize-none h-24"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="dueDate" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <CalendarIcon className="w-4 h-4 text-blue-500" />
                Due Date & Time
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={hasDueDate}
                onClick={() => setHasDueDate(!hasDueDate)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  hasDueDate ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    hasDueDate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {hasDueDate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-slate-800 font-medium"
                  required={hasDueDate}
                />
              </motion.div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="recurring" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Repeat className="w-4 h-4 text-blue-500" />
                Recurring Task
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={isRecurring}
                onClick={() => setIsRecurring(!isRecurring)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isRecurring ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isRecurring ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {isRecurring && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-slate-800 font-medium outline-none appearance-none cursor-pointer"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </motion.div>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || (hasDueDate && !dueDate)}
              className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
            >
              {initialData ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

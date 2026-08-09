import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Assignee } from '../types';

interface QuickAddTaskProps {
  onAdd: (name: string, assignee: Assignee) => void;
}

export default function QuickAddTask({ onAdd }: QuickAddTaskProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [assignee, setAssignee] = useState<Assignee>('BIBHU');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskName.trim()) {
      onAdd(taskName.trim(), assignee);
      setTaskName('');
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end" ref={containerRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl shadow-blue-900/10 border border-slate-200/60 p-5 mb-4 w-80 origin-bottom-right"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-semibold text-slate-800">Quick Add Task</h3>
                <button type="button" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 -mr-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <input
                ref={inputRef}
                type="text"
                placeholder="Task name..."
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAssignee('BIBHU')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors border ${
                    assignee === 'BIBHU'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Bibhu
                </button>
                <button
                  type="button"
                  onClick={() => setAssignee('ADMIN')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors border ${
                    assignee === 'ADMIN'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Admin
                </button>
              </div>
              
              <button
                type="submit"
                disabled={!taskName.trim()}
                className="w-full py-2.5 bg-[#0056D2] text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-[#0056D2] flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Add Task
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#0056D2] hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 border-2 border-white"
        title="Quick Add"
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-6 h-6" />
        </motion.div>
      </button>
    </div>
  );
}

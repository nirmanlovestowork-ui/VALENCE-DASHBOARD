import { Task } from '../types';
import { Check, Clock, Pencil, Trash2, Calendar, X, Repeat, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';
import { motion } from 'motion/react';

interface TaskItemProps {
  key?: React.Key;
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

export default function TaskItem({ task, onEdit, onDelete, onToggle }: TaskItemProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const formatTiming = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  const isOverdue = task.due_date ? new Date(task.due_date) < new Date() && !task.status : false;
  const isDueSoon = task.due_date ? !task.status && !isOverdue && (new Date(task.due_date).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000) : false;

  return (
    <motion.div
      layout
      draggable
      onDragStart={(e: any) => {
        e.dataTransfer.setData('taskId', task.task_id);
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={`group relative p-5 rounded-2xl flex items-center transition-all duration-300 ${
        task.status 
          ? 'bg-slate-50/50 border border-slate-200 opacity-70' 
          : isOverdue 
            ? 'bg-white shadow-[0_4px_20px_-4px_rgba(239,68,68,0.1)] border border-red-200' 
            : isDueSoon
              ? 'bg-white shadow-[0_4px_20px_-4px_rgba(245,158,11,0.1)] border border-amber-300 ring-1 ring-amber-100'
              : 'bg-white shadow-[0_2px_10px_-4px_rgba(0,86,210,0.1)] border border-slate-200/60 hover:shadow-[0_8px_30px_-4px_rgba(0,86,210,0.15)] hover:border-blue-200'
      }`}
    >
      <div className="flex-1 min-w-0 pr-4">
        <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${
          task.status 
            ? 'text-slate-400' 
            : isOverdue 
              ? 'text-red-500' 
              : isDueSoon
                ? 'text-amber-500'
                : 'text-[#0056D2]'
        }`}>
          {isOverdue && !task.status ? (
            <>
              <Clock className="w-3.5 h-3.5" />
              <span>OVERDUE • {formatTiming(task.due_date!)}</span>
            </>
          ) : isDueSoon && !task.status ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
              <span>DUE SOON • {formatTiming(task.due_date!)}</span>
            </>
          ) : task.status ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>COMPLETED</span>
            </>
          ) : task.due_date ? (
            <>
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatTiming(task.due_date)}</span>
            </>
          ) : (
            <span>NO DUE DATE</span>
          )}
          {task.recurring && task.frequency && (
            <span className="flex items-center gap-1 ml-2 text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md text-[10px]">
              <Repeat className="w-3 h-3" />
              {task.frequency}
            </span>
          )}
        </div>
        <div className={`text-lg font-semibold truncate transition-colors ${
          task.status ? 'text-slate-400 line-through' : 'text-slate-800 group-hover:text-[#0056D2]'
        }`}>
          {task.task_name}
        </div>
        {task.description && (
          <div className={`text-sm mt-1.5 line-clamp-2 leading-relaxed ${
            task.status ? 'text-slate-400/80' : 'text-slate-500 group-hover:text-slate-600'
          }`}>
            {task.description}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isConfirmingDelete ? (
          <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
            <span className="text-sm font-semibold text-red-600 mr-1">Delete?</span>
            <button
              onClick={onDelete}
              className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              title="Confirm Delete"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </button>
            <button
              onClick={() => setIsConfirmingDelete(false)}
              className="p-1.5 text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" strokeWidth={3} />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="p-2 text-slate-400 hover:text-black hover:bg-slate-100 rounded-xl transition-colors"
              title="Edit Task"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            
            <button
              onClick={onToggle}
              className={`w-9 h-9 ml-1.5 rounded-full flex items-center justify-center transition-all duration-300 ${
                task.status
                  ? 'bg-green-600 text-white scale-100 shadow-sm shadow-green-600/30'
                  : 'border-2 border-slate-200 text-slate-300 hover:text-green-600 hover:border-green-600 hover:bg-green-50 scale-95 hover:scale-100'
              }`}
              title={task.status ? "Mark as Pending" : "Mark as Completed"}
            >
              <Check className="w-5 h-5" strokeWidth={3} />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

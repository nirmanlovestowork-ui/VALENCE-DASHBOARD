import { useState, useEffect, FormEvent } from 'react';
import { Eye, EyeOff, ListTodo, Receipt, Menu, X, Wallet, Search, Landmark, Download, FileText } from 'lucide-react';
import { Task, Assignee } from './types';
import TaskColumn from './components/TaskColumn';
import TaskFormModal from './components/TaskFormModal';
import QuickAddTask from './components/QuickAddTask';
import InvoicesView from './components/InvoicesView';
import ExpenseTrackerView from './components/ExpenseTrackerView';
import { GSTINLookupView } from './components/GSTINLookupView';
import { IFSCLookupView } from './components/IFSCLookupView';
import BankStatementView from './components/BankStatementView';
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAssignee, setModalAssignee] = useState<Assignee>('BIBHU');
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('partner-dashboard-auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'work-list' | 'invoices' | 'expenses' | 'gstin-lookup' | 'ifsc-lookup'>('work-list');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          task_id: doc.id,
          task_name: data.task_name,
          description: data.description || '',
          due_date: data.due_date?.toDate ? data.due_date.toDate().toISOString() : data.due_date,
          status: data.status,
          assignee: data.assignee as Assignee,
        };
      });
      setTasks(fetchedTasks);
    }, (error) => {
      console.error('Firestore Error: ', error);
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType: 'get',
        path: 'tasks',
        authInfo: {}
      };
      throw new Error(JSON.stringify(errInfo));
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (assignee: Assignee, task?: Task) => {
    setModalAssignee(assignee);
    setTaskToEdit(task || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTaskToEdit(null);
  };

  const handleSaveTask = async (taskData: Omit<Task, 'task_id'> | Task) => {
    const firestoreDueDate = taskData.due_date ? Timestamp.fromDate(new Date(taskData.due_date)) : null;
    
    if ('task_id' in taskData && taskData.task_id) {
      await updateDoc(doc(db, 'tasks', taskData.task_id), {
        task_name: taskData.task_name,
        description: taskData.description || '',
        due_date: firestoreDueDate,
        status: taskData.status,
        assignee: taskData.assignee,
        recurring: taskData.recurring || false,
        frequency: taskData.frequency || null
      });
    } else {
      if (taskData.recurring && taskData.due_date && taskData.frequency) {
        const instancesToCreate = taskData.frequency === 'daily' ? 7 : taskData.frequency === 'weekly' ? 4 : 3;
        
        for (let i = 0; i < instancesToCreate; i++) {
          const newRef = doc(collection(db, 'tasks'));
          const instanceDate = new Date(taskData.due_date);
          
          if (taskData.frequency === 'daily') {
            instanceDate.setDate(instanceDate.getDate() + i);
          } else if (taskData.frequency === 'weekly') {
            instanceDate.setDate(instanceDate.getDate() + (i * 7));
          } else if (taskData.frequency === 'monthly') {
            instanceDate.setMonth(instanceDate.getMonth() + i);
          }
          
          await setDoc(newRef, {
            task_name: taskData.task_name,
            description: taskData.description || '',
            due_date: Timestamp.fromDate(instanceDate),
            status: taskData.status,
            assignee: taskData.assignee,
            recurring: true,
            frequency: taskData.frequency,
            created_at: serverTimestamp()
          });
        }
      } else {
        const newRef = doc(collection(db, 'tasks'));
        await setDoc(newRef, {
          task_name: taskData.task_name,
          description: taskData.description || '',
          due_date: firestoreDueDate,
          status: taskData.status,
          assignee: taskData.assignee,
          recurring: taskData.recurring || false,
          frequency: taskData.frequency || null,
          created_at: serverTimestamp()
        });
      }
    }
    handleCloseModal();
  };

  const handleQuickAdd = async (taskName: string, assignee: Assignee) => {
    await setDoc(doc(collection(db, 'tasks')), {
      task_name: taskName,
      description: '',
      due_date: null,
      status: false,
      assignee,
      recurring: false,
      frequency: null,
      created_at: serverTimestamp()
    });
  };

  const handleDeleteTask = async (id: string) => {
    await deleteDoc(doc(db, 'tasks', id));
  };

  const handleDropTask = async (taskId: string, targetAssignee: Assignee) => {
    const task = tasks.find(t => t.task_id === taskId);
    if (task && task.assignee !== targetAssignee) {
      await updateDoc(doc(db, 'tasks', taskId), {
        assignee: targetAssignee,
        updated_at: serverTimestamp()
      });
    }
  };

  const handleToggleCompletion = async (id: string) => {
    const task = tasks.find(t => t.task_id === id);
    if (task) {
      await updateDoc(doc(db, 'tasks', id), {
        status: !task.status
      });
    }
  };

  const sortTasks = (a: Task, b: Task) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  };

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'pending' && t.status) return false;
    if (taskFilter === 'completed' && !t.status) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.task_name.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q));
  });

  const bibhuTasks = filteredTasks.filter(t => t.assignee === 'BIBHU').sort(sortTasks);
  const adminTasks = filteredTasks.filter(t => t.assignee === 'ADMIN').sort(sortTasks);

  const handleExportCSV = () => {
    const headers = ['Task Name', 'Description', 'Assignee', 'Status', 'Due Date'];
    const csvContent = [
      headers.join(','),
      ...filteredTasks.map(t => {
        return [
          `"${(t.task_name || '').replace(/"/g, '""')}"`,
          `"${(t.description || '').replace(/"/g, '""')}"`,
          `"${t.assignee}"`,
          `"${t.status ? 'Completed' : 'Pending'}"`,
          `"${t.due_date || ''}"`
        ].join(',');
      })
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `tasks_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (password.trim() === 'Bibhu@2026') {
      setIsAuthenticated(true);
      localStorage.setItem('partner-dashboard-auth', 'true');
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    localStorage.removeItem('partner-dashboard-auth');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 font-sans selection:bg-blue-200">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-sm border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Partner Dashboard</h1>
            <p className="text-slate-500 text-sm mt-2">Enter the password to access.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setAuthError(false);
                  }}
                  placeholder="Password"
                  className={`w-full px-4 py-3.5 pr-12 rounded-xl border ${authError ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100'} bg-slate-50 focus:bg-white outline-none focus:ring-4 transition-all`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {authError && <p className="text-red-500 text-xs mt-2.5 font-medium ml-1">Incorrect password.</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-4 focus:ring-slate-200 shadow-sm"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-blue-50 flex overflow-hidden font-sans text-slate-800 selection:bg-blue-200 selection:text-blue-900 print:bg-white print:h-auto print:overflow-visible">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-blue-100 flex flex-col shrink-0 hidden md:flex z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] print:hidden">
        <div className="h-20 flex items-center gap-3 px-6 border-b border-blue-100/50">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
            <span className="text-white font-bold tracking-tighter text-lg">PD</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-blue-900">Partner Dashboard</h1>
        </div>
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveTab('work-list')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'work-list' 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ListTodo className={`w-5 h-5 ${activeTab === 'work-list' ? 'text-blue-600' : 'text-slate-400'}`} />
            Work List
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'invoices' 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Receipt className={`w-5 h-5 ${activeTab === 'invoices' ? 'text-blue-600' : 'text-slate-400'}`} />
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'expenses' 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Wallet className={`w-5 h-5 ${activeTab === 'expenses' ? 'text-blue-600' : 'text-slate-400'}`} />
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('gstin-lookup')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'gstin-lookup' 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Search className={`w-5 h-5 ${activeTab === 'gstin-lookup' ? 'text-blue-600' : 'text-slate-400'}`} />
            GSTIN Lookup
          </button>
          <button
            onClick={() => setActiveTab('ifsc-lookup')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'ifsc-lookup' 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Landmark className={`w-5 h-5 ${activeTab === 'ifsc-lookup' ? 'text-blue-600' : 'text-slate-400'}`} />
            IFSC Lookup
          </button>
          <button
            onClick={() => setActiveTab('bank-statement')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'bank-statement' 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FileText className={`w-5 h-5 ${activeTab === 'bank-statement' ? 'text-blue-600' : 'text-slate-400'}`} />
            Bank Statement
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative flex w-full max-w-xs flex-col bg-white shadow-xl">
            <div className="h-20 flex items-center justify-between px-6 border-b border-blue-100/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
                  <span className="text-white font-bold tracking-tighter text-lg">PD</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-blue-900">Dashboard</h1>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 focus:outline-none"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
              <button
                onClick={() => {
                  setActiveTab('work-list');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'work-list' 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <ListTodo className={`w-5 h-5 ${activeTab === 'work-list' ? 'text-blue-600' : 'text-slate-400'}`} />
                Work List
              </button>
              <button
                onClick={() => {
                  setActiveTab('invoices');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'invoices' 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Receipt className={`w-5 h-5 ${activeTab === 'invoices' ? 'text-blue-600' : 'text-slate-400'}`} />
                Invoices
              </button>
              <button
                onClick={() => {
                  setActiveTab('expenses');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'expenses' 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Wallet className={`w-5 h-5 ${activeTab === 'expenses' ? 'text-blue-600' : 'text-slate-400'}`} />
                Expenses
              </button>
              <button
                onClick={() => {
                  setActiveTab('gstin-lookup');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'gstin-lookup' 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Search className={`w-5 h-5 ${activeTab === 'gstin-lookup' ? 'text-blue-600' : 'text-slate-400'}`} />
                GSTIN Lookup
              </button>
              <button
                onClick={() => {
                  setActiveTab('ifsc-lookup');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'ifsc-lookup' 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Landmark className={`w-5 h-5 ${activeTab === 'ifsc-lookup' ? 'text-blue-600' : 'text-slate-400'}`} />
                IFSC Lookup
              </button>
              <button
                onClick={() => {
                  setActiveTab('bank-statement');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'bank-statement' 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <FileText className={`w-5 h-5 ${activeTab === 'bank-statement' ? 'text-blue-600' : 'text-slate-400'}`} />
                Bank Statement
              </button>
            </div>
            <div className="p-4 border-t border-blue-100/50">
              <button 
                onClick={handleLogout}
                className="w-full flex justify-center text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/60 hover:border-slate-300 hover:bg-slate-50 px-4 py-3 rounded-xl transition-colors shadow-sm"
              >
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative print:overflow-visible">
        <header className="h-20 bg-white/80 backdrop-blur-md md:bg-transparent md:backdrop-blur-none md:border-none border-b border-blue-100 flex items-center justify-between px-6 md:px-10 shrink-0 z-10 print:hidden">
          <div className="flex items-center gap-3 md:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold tracking-tighter text-sm">PD</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-blue-900">Partner Dashboard</h1>
          </div>
          <div className="hidden md:block">
            <h2 className="text-2xl font-bold tracking-tight text-blue-900">
              {activeTab === 'work-list' ? 'Work List' : activeTab === 'invoices' ? 'Invoices' : activeTab === 'expenses' ? 'Expenses' : activeTab === 'ifsc-lookup' ? 'IFSC Lookup' : activeTab === 'bank-statement' ? 'Bank Statement' : 'GSTIN Lookup'}
            </h2>
          </div>
          
          {activeTab === 'work-list' && (
            <div className="hidden md:flex flex-1 max-w-lg mx-6 gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
              <select
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value as 'all' | 'pending' | 'completed')}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer hover:bg-slate-100"
              >
                <option value="all">All Tasks</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-full hidden lg:block border border-slate-200/60 shadow-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <button 
              onClick={handleLogout}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/60 hover:border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-sm"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex flex-col flex-1 w-full h-[calc(100vh-5rem)] overflow-hidden print:h-auto print:overflow-visible relative">
          {activeTab === 'work-list' && (
            <div className="md:hidden p-4 bg-white border-b border-slate-100 z-10 w-full shrink-0 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
              <select
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value as 'all' | 'pending' | 'completed')}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}
          {activeTab === 'work-list' ? (
            <div className="flex flex-col h-full w-full flex-1 overflow-hidden">
              <div className="bg-white border-b border-slate-100 p-4 md:px-8 z-10 shrink-0 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 text-sm max-w-7xl mx-auto">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></div>
                      <span className="font-semibold text-slate-700">Pending:</span>
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">{tasks.filter(t => !t.status).length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div>
                      <span className="font-semibold text-slate-700">Completed:</span>
                      <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">{tasks.filter(t => t.status).length}</span>
                    </div>
                    <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700 uppercase tracking-wider text-xs">Bibhu:</span>
                      <span className="bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-bold">{tasks.filter(t => t.assignee === 'BIBHU').length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700 uppercase tracking-wider text-xs">Admin:</span>
                      <span className="bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full font-bold">{tasks.filter(t => t.assignee === 'ADMIN').length}</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors border border-blue-200"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 h-full w-full flex-1 overflow-hidden">
                <TaskColumn
                  assignee="BIBHU"
                  tasks={bibhuTasks}
                  onAddTask={() => handleOpenModal('BIBHU')}
                  onEditTask={(task) => handleOpenModal('BIBHU', task)}
                  onDeleteTask={handleDeleteTask}
                  onToggleCompletion={handleToggleCompletion}
                  onDropTask={(taskId) => handleDropTask(taskId, 'BIBHU')}
                />
                <TaskColumn
                  assignee="ADMIN"
                  tasks={adminTasks}
                  onAddTask={() => handleOpenModal('ADMIN')}
                  onEditTask={(task) => handleOpenModal('ADMIN', task)}
                  onDeleteTask={handleDeleteTask}
                  onToggleCompletion={handleToggleCompletion}
                  onDropTask={(taskId) => handleDropTask(taskId, 'ADMIN')}
                />
              </div>
              <QuickAddTask onAdd={handleQuickAdd} />
            </div>
          ) : activeTab === 'invoices' ? (
            <div className="w-full h-full flex flex-col overflow-hidden">
              <InvoicesView />
            </div>
          ) : activeTab === 'expenses' ? (
            <div className="w-full h-full flex flex-col overflow-hidden">
              <ExpenseTrackerView />
            </div>
          ) : activeTab === 'ifsc-lookup' ? (
            <div className="w-full h-full flex flex-col overflow-hidden">
              <IFSCLookupView />
            </div>
          ) : activeTab === 'bank-statement' ? (
            <div className="w-full h-full flex flex-col overflow-hidden">
              <BankStatementView />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col overflow-hidden">
              <GSTINLookupView />
            </div>
          )}
        </main>
      </div>

      {isModalOpen && (
        <TaskFormModal
          assignee={modalAssignee}
          initialData={taskToEdit}
          onSave={handleSaveTask}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

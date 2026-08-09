import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, setDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, TransactionCategory, TransactionAccount } from '../types';
import { Plus, X, ArrowUpRight, ArrowDownRight, Wallet, PieChart, Landmark, CreditCard, Banknote, MoreVertical, Edit2, Trash2, ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CATEGORIES: TransactionCategory[] = [
  'Food & Dining', 'Groceries', 'Fitness', 'Software & Tools', 
  'Education', 'Utilities', 'Miscellaneous', 'Salary', 'Freelance', 'Other'
];

const ACCOUNTS: TransactionAccount[] = ['Bank Account', 'Cash', 'Credit Card'];

// Colors for the donut chart matching blue and white theme with distinct shades
const COLORS = [
  '#002B5B', // Deep Navy
  '#0056D2', // Primary Blue
  '#0284C7', // Sky Blue Dark
  '#0EA5E9', // Sky Blue Light
  '#0D9488', // Teal
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#2563EB', // Royal Blue
  '#64748B', // Slate
  '#94A3B8'  // Slate Light
];

export default function ExpenseTrackerView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [editingTxnId, setEditingTxnId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<'all' | 'ledger'>('all');
  const [selectedLedger, setSelectedLedger] = useState<TransactionAccount>('Bank Account');
  // Form state
  const [type, setType] = useState<'Income' | 'Expense' | 'Transfer'>('Expense');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [category, setCategory] = useState<string>('Food & Dining');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [account, setAccount] = useState<TransactionAccount>('Bank Account');
  const [fromAccount, setFromAccount] = useState<TransactionAccount>('Bank Account');
  const [toAccount, setToAccount] = useState<TransactionAccount>('Cash');
  const [description, setDescription] = useState<string>('');
  const [bankTxnId, setBankTxnId] = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'transaction_categories'), orderBy('created_at', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setCustomCategories(snap.docs.map(doc => doc.data().name as string));
    });
    return () => unsub();
  }, []);

  const ALL_CATEGORIES = [...CATEGORIES, ...customCategories];

  const resetForm = () => {
    setEditingTxnId(null);
    setType('Expense');
    setAmount('');
    setDescription('');
    setBankTxnId('');
    setNewCategoryName('');
    setCategory('Food & Dining');
    setAccount('Bank Account');
    setFromAccount('Bank Account');
    setToAccount('Cash');
    const d = new Date();
    setDate(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleEdit = (txn: Transaction) => {
    setEditingTxnId(txn.id);
    setType(txn.type || 'Expense');
    setAmount(String(txn.amount || ''));
    setDate(txn.date || '');
    if (txn.type === 'Transfer') {
      setFromAccount(txn.from_account || 'Bank Account');
      setToAccount(txn.to_account || 'Cash');
    } else {
      setCategory(txn.category || 'Food & Dining');
      setAccount(txn.account || 'Bank Account');
    }
    setDescription(txn.description || '');
    setBankTxnId(txn.bank_transaction_id || '');
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
    setActiveMenuId(null);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      try {
        await deleteDoc(doc(db, 'transactions', deleteConfirmId));
      } catch (e) {
        console.error("Error deleting document:", e);
      }
      setDeleteConfirmId(null);
    }
  };

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || !description) return;
    if (category === 'ADD_NEW' && !newCategoryName.trim()) return;
    
    setIsSaving(true);
    try {
      let finalCategory = category;
      
      // Handle new custom category
      if (category === 'ADD_NEW' && newCategoryName.trim()) {
        finalCategory = newCategoryName.trim();
        // Check if it already exists to avoid duplicates
        if (!ALL_CATEGORIES.includes(finalCategory)) {
          const categoryDocId = finalCategory.toLowerCase().replace(/\s+/g, '-');
          await setDoc(doc(db, 'transaction_categories', categoryDocId), {
            name: finalCategory,
            created_at: serverTimestamp()
          });
        }
      }
      let nextSerial = 1;
      if (transactions.length > 0) {
        const maxSerial = Math.max(...transactions.map(t => typeof t.serial_number === 'number' ? t.serial_number : 0));
        nextSerial = maxSerial + 1;
      }
      
      const parts = date.split(/[-/]/).map(s => s.trim());
      let formattedDate = date;
      if (parts.length === 3) {
        formattedDate = `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2].length === 2 ? '20' + parts[2] : parts[2]}`;
      }

      const numericAmount = Number(amount);
      const data: any = {
        bank_transaction_id: bankTxnId,
        type,
        amount: numericAmount,
        date: formattedDate,
        description,
        updated_at: serverTimestamp()
      };
      
      if (type === 'Transfer') {
        data.from_account = fromAccount;
        data.to_account = toAccount;
      } else {
        data.category = finalCategory;
        data.account = account;
      }

      if (editingTxnId) {
        await updateDoc(doc(db, 'transactions', editingTxnId), data);
      } else {
        const docId = nextSerial.toString();
        data.serial_number = nextSerial;
        data.created_at = serverTimestamp();
        await setDoc(doc(db, 'transactions', docId), data);
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  };

  // Date Parsing for calculations
  const parseTransactionDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    
    // Check if it's already an ISO string
    if (dateStr.includes('T')) return new Date(dateStr);
    
    const parts = dateStr.split(/[-/]/).map(s => s.trim());
    if (parts.length === 3) {
      // Check if year is at the start (yyyy-mm-dd)
      if (parts[0].length === 4) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
      // Check if year is at the end (dd-mm-yyyy or mm-dd-yyyy)
      if (parts[2].length === 4 || parts[2].length === 2) {
        let year = parseInt(parts[2]);
        if (year < 100) year += 2000;
        return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }
    
    // Fallback
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    return new Date();
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('T')) {
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    }
    const parts = dateStr.split(/[-/]/).map(s => s.trim());
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // yyyy-mm-dd -> dd-mm-yyyy
        return `${String(parts[2]).padStart(2, '0')}-${String(parts[1]).padStart(2, '0')}-${parts[0]}`;
      }
      if (parts[2].length === 4 || parts[2].length === 2) {
        // dd-mm-yyyy -> dd-mm-yyyy
        let year = parseInt(parts[2]);
        if (year < 100) year += 2000;
        return `${String(parts[0]).padStart(2, '0')}-${String(parts[1]).padStart(2, '0')}-${year}`;
      }
    }
    return dateStr;
  };

  // Calculate totals over all transactions
  const totalIncome = transactions
    .filter(t => t.type && t.type.toString().trim().toLowerCase() === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalExpenses = transactions
    .filter(t => t.type && t.type.toString().trim().toLowerCase() === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const netBalance = totalIncome - totalExpenses;

  // Chart data
  const expensesByCategory = transactions
    .filter(t => t.type && t.type.toString().trim().toLowerCase() === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + (Number(t.amount) || 0);
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.entries(expensesByCategory)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);

  const getAccountIcon = (acc: string) => {
    switch(acc) {
      case 'Bank Account': return <Landmark className="w-4 h-4" />;
      case 'Credit Card': return <CreditCard className="w-4 h-4" />;
      case 'Cash': return <Banknote className="w-4 h-4" />;
      default: return <Wallet className="w-4 h-4" />;
    }
  };

  const totalPages = Math.ceil(transactions.length / itemsPerPage) || 1;
  const currentTransactions = transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const ledgerTransactions = transactions.filter(txn => {
    if (txn.type === 'Transfer') {
      return txn.from_account === selectedLedger || txn.to_account === selectedLedger;
    }
    return txn.account === selectedLedger;
  });

  const ledgerStats = ledgerTransactions.reduce((acc, txn) => {
    if (txn.type === 'Transfer') {
      if (txn.to_account === selectedLedger) acc.inflows += Number(txn.amount) || 0;
      if (txn.from_account === selectedLedger) acc.outflows += Number(txn.amount) || 0;
    } else if (txn.type === 'Income') {
      acc.inflows += Number(txn.amount) || 0;
    } else {
      acc.outflows += Number(txn.amount) || 0;
    }
    return acc;
  }, { inflows: 0, outflows: 0 });

  const ledgerBalance = ledgerStats.inflows - ledgerStats.outflows;

  const exportToExcel = () => {
    const data = ledgerTransactions.map(txn => ({
      'S.No': txn.serial_number || '-',
      'Date': formatDisplayDate(txn.date),
      'Description': txn.description,
      'Category/Transfer': txn.type === 'Transfer' ? 'Transfer' : txn.category,
      'Type': txn.type === 'Transfer' ? (txn.to_account === selectedLedger ? 'Inflow' : 'Outflow') : txn.type,
      'Amount': `₹${(Number(txn.amount) || 0).toLocaleString()}`,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedLedger} Ledger`);
    XLSX.writeFile(wb, `${selectedLedger}_Ledger.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(`${selectedLedger} - Ledger Statement`, 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Total Inflows: ₹${ledgerStats.inflows.toLocaleString()}`, 14, 30);
    doc.text(`Total Outflows: ₹${ledgerStats.outflows.toLocaleString()}`, 14, 35);
    doc.text(`Closing Balance: ₹${ledgerBalance.toLocaleString()}`, 14, 40);

    const tableColumn = ["S.No", "Date", "Description", "Category", "Type", "Amount"];
    const tableRows = ledgerTransactions.map(txn => [
      txn.serial_number || '-',
      formatDisplayDate(txn.date),
      txn.description,
      txn.type === 'Transfer' ? 'Transfer' : (txn.category || '-'),
      txn.type === 'Transfer' ? (txn.to_account === selectedLedger ? 'Inflow' : 'Outflow') : txn.type,
      `Rs. ${Number(txn.amount) || 0}`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
    });

    doc.save(`${selectedLedger}_Ledger.pdf`);
  };

  return (
    <div className="w-full h-full p-6 md:p-8 overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 md:px-8 md:py-6 rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-[#0056D2] rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
              Expense Tracker
            </h2>
            <p className="text-slate-500 mt-1 text-sm font-medium">Manage your finances and track expenses.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 p-1 rounded-xl flex">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                  viewMode === 'all' ? 'bg-white text-[#0056D2] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All Transactions
              </button>
              <button
                onClick={() => setViewMode('ledger')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                  viewMode === 'ledger' ? 'bg-white text-[#0056D2] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Ledger View
              </button>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="px-6 py-3.5 bg-[#0056D2] hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Transaction
            </button>
          </div>
        </div>

        {viewMode === 'all' ? (
          <>
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-500" />
            Expense Allocation
          </h3>
          <div className="flex-1 min-h-[300px] w-full flex items-center justify-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400">
                <PieChart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No expenses this month</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Income</p>
              <h3 className="text-2xl font-bold text-green-600 mt-1">₹{totalIncome.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">₹{totalExpenses.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6 text-[#0056D2]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Net Balance</p>
              <h3 className={`text-2xl font-bold mt-1 ${netBalance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                ₹{netBalance.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Recent Transactions
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4 w-16 text-center">S.No</th>
                    <th className="px-6 py-4 w-32">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 w-40">Category</th>
                    <th className="px-6 py-4 w-40">Account</th>
                    <th className="px-6 py-4 text-right w-32">Amount</th>
                    <th className="px-6 py-4 w-16 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentTransactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium text-center">
                        {txn.serial_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                        {formatDisplayDate(txn.date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{txn.description}</div>
                        {txn.bank_transaction_id && (
                          <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {txn.bank_transaction_id}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {txn.type && txn.type.toString().trim().toLowerCase() === 'transfer' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500">
                            Transfer
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                            {txn.category}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {txn.type && txn.type.toString().trim().toLowerCase() === 'transfer' ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            {getAccountIcon(txn.from_account || 'Bank Account')} {txn.from_account} <ArrowDownRight className="w-3 h-3 mx-1 text-slate-400" /> {txn.to_account}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            {getAccountIcon(txn.account || 'Bank Account')}
                            {txn.account}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {txn.type && txn.type.toString().trim().toLowerCase() === 'transfer' ? (
                          <div className="font-bold text-slate-600">
                            ₹{(Number(txn.amount) || 0).toLocaleString()}
                          </div>
                        ) : (
                          <div className={`font-bold ${txn.type && txn.type.toString().trim().toLowerCase() === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {txn.type && txn.type.toString().trim().toLowerCase() === 'income' ? '+' : '-'}₹{(Number(txn.amount) || 0).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === txn.id ? null : (txn.id || null))}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        <AnimatePresence>
                          {activeMenuId === txn.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-8 top-10 w-36 bg-white border border-slate-100 shadow-xl rounded-xl overflow-hidden z-20 py-1"
                            >
                              <button
                                onClick={() => handleEdit(txn)}
                                className="w-full px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                              >
                                <Edit2 className="w-4 h-4 text-slate-400" />
                                Edit
                              </button>
                              <div className="h-px bg-slate-100 my-1 mx-2" />
                              <button
                                onClick={() => txn.id && handleDeleteClick(txn.id)}
                                className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                                Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                          <Wallet className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-lg font-medium text-slate-600 mb-1">No transactions</p>
                        <p className="text-sm text-slate-400">Add a transaction to get started.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <div className="text-sm text-slate-500 hidden sm:block">
                  Showing <span className="font-medium text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-700">{Math.min(currentPage * itemsPerPage, transactions.length)}</span> of <span className="font-medium text-slate-700">{transactions.length}</span> results
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-slate-700 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Select Ledger Account</label>
                <select
                  value={selectedLedger}
                  onChange={(e) => setSelectedLedger(e.target.value as TransactionAccount)}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-all text-slate-800 font-bold min-w-[200px]"
                >
                  {ACCOUNTS.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl transition-all flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl transition-all flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            </div>

            {/* Ledger Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                  <ArrowDownRight className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Inflows</p>
                  <h3 className="text-2xl font-bold text-green-600 mt-1">₹{ledgerStats.inflows.toLocaleString()}</h3>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Outflows</p>
                  <h3 className="text-2xl font-bold text-red-600 mt-1">₹{ledgerStats.outflows.toLocaleString()}</h3>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <Wallet className="w-6 h-6 text-[#0056D2]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Net Balance</p>
                  <h3 className={`text-2xl font-bold mt-1 ${ledgerBalance >= 0 ? 'text-[#0056D2]' : 'text-red-600'}`}>
                    {ledgerBalance >= 0 ? '' : '-'}₹{Math.abs(ledgerBalance).toLocaleString()}
                  </h3>
                </div>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-slate-500" />
                  {selectedLedger} Transactions
                </h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4 w-16 text-center">S.No</th>
                      <th className="px-6 py-4 w-32">Date</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 w-40">Category/Transfer</th>
                      <th className="px-6 py-4 text-right w-32">Type</th>
                      <th className="px-6 py-4 text-right w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerTransactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium text-center">
                          {txn.serial_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                          {formatDisplayDate(txn.date)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{txn.description}</div>
                          {txn.bank_transaction_id && (
                            <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {txn.bank_transaction_id}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {txn.type && txn.type.toString().trim().toLowerCase() === 'transfer' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500">
                              Transfer
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                              {txn.category}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                            (txn.type === 'Transfer' ? (txn.to_account === selectedLedger) : txn.type === 'Income') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {txn.type === 'Transfer' ? (txn.to_account === selectedLedger ? 'Inflow' : 'Outflow') : txn.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className={`font-bold ${
                            (txn.type === 'Transfer' ? (txn.to_account === selectedLedger) : txn.type === 'Income') ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {(txn.type === 'Transfer' ? (txn.to_account === selectedLedger) : txn.type === 'Income') ? '+' : '-'}₹{(Number(txn.amount) || 0).toLocaleString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {ledgerTransactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <Wallet className="w-8 h-8 text-slate-300" />
                          </div>
                          <p className="text-lg font-medium text-slate-600 mb-1">No transactions in this ledger</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-800">{editingTxnId ? 'Edit Transaction' : 'Add Transaction'}</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setType('Expense')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                      type === 'Expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('Income')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                      type === 'Income' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('Transfer')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                      type === 'Transfer' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Transfer
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-bold text-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What was this for?"
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Date (DD/MM/YYYY)</label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-medium"
                    />
                  </div>
                  {type !== 'Transfer' && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-medium appearance-none"
                      >
                        {ALL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        <option value="ADD_NEW">+ Add New Category...</option>
                      </select>
                    </div>
                  )}
                </div>

                {type !== 'Transfer' && category === 'ADD_NEW' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">New Category Name</label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Subscriptions"
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                    />
                  </div>
                )}

                {type === 'Transfer' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">From Account</label>
                      <select
                        value={fromAccount}
                        onChange={(e) => setFromAccount(e.target.value as TransactionAccount)}
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-medium appearance-none"
                      >
                        {ACCOUNTS.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">To Account</label>
                      <select
                        value={toAccount}
                        onChange={(e) => setToAccount(e.target.value as TransactionAccount)}
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-medium appearance-none"
                      >
                        {ACCOUNTS.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Account</label>
                      <select
                        value={account}
                        onChange={(e) => setAccount(e.target.value as TransactionAccount)}
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-medium appearance-none"
                      >
                        {ACCOUNTS.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Bank Txn ID <span className="text-slate-400 font-normal">(Optional)</span></label>
                      <input
                        type="text"
                        value={bankTxnId}
                        onChange={(e) => setBankTxnId(e.target.value)}
                        placeholder="e.g. TXN12345"
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-mono text-sm"
                      />
                    </div>
                  </div>
                )}

                {type === 'Transfer' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Bank Txn ID <span className="text-slate-400 font-normal">(Optional)</span></label>
                    <input
                      type="text"
                      value={bankTxnId}
                      onChange={(e) => setBankTxnId(e.target.value)}
                      placeholder="e.g. TXN12345"
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-mono text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={handleSave}
                  disabled={!amount || !description || isSaving}
                  className="w-full py-3.5 bg-[#0056D2] hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Transaction</h3>
              <p className="text-slate-600 mb-8">Are you sure you want to delete this transaction? This action cannot be undone.</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl shadow-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Loader2, AlertCircle } from 'lucide-react';
import { processBankStatement, exportTransactionsToExcel, BankTransaction } from '../lib/bankStatementLogic';

export default function BankStatementView() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setTransactions([]);

    try {
      const data = await processBankStatement(file);
      setTransactions(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while processing the statement.');
    } finally {
      setIsProcessing(false);
      // Reset the file input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = () => {
    if (transactions.length > 0) {
      exportTransactionsToExcel(transactions);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const handleCategoryChange = (index: number, newCategory: string) => {
    const newTransactions = [...transactions];
    newTransactions[index].category = newCategory;
    setTransactions(newTransactions);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        
        {/* Header Area */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Bank Statement Parser</h2>
              <p className="text-sm text-slate-500 mt-1">Upload your bank statement (PDF or Image) to extract and categorize transactions automatically.</p>
            </div>
            <div className="flex gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="application/pdf,image/jpeg,image/png,image/webp" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                Upload Statement
              </button>
              {transactions.length > 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors shadow-sm"
                >
                  <Download className="w-5 h-5" />
                  Export to Excel
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Processing Error</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[300px]">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Extracting transactions with AI...</p>
            <p className="text-slate-400 text-sm mt-2">This may take a few moments depending on the statement length.</p>
          </div>
        )}

        {!isProcessing && transactions.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[300px] border-dashed">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-slate-600 font-medium text-lg">No transactions extracted yet</p>
            <p className="text-slate-400 text-sm mt-1">Upload a PDF or image of your statement to begin</p>
          </div>
        )}

        {!isProcessing && transactions.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500">
                    <th className="p-4 font-semibold whitespace-nowrap">Date</th>
                    <th className="p-4 font-semibold min-w-[200px]">Description</th>
                    <th className="p-4 font-semibold">Category</th>
                    <th className="p-4 font-semibold text-right whitespace-nowrap">Debit</th>
                    <th className="p-4 font-semibold text-right whitespace-nowrap">Credit</th>
                    <th className="p-4 font-semibold text-right whitespace-nowrap">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {transactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-slate-600 whitespace-nowrap">{tx.date}</td>
                      <td className="p-4 text-slate-800 font-medium">{tx.description}</td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={tx.category || ''}
                          onChange={(e) => handleCategoryChange(idx, e.target.value)}
                          className="w-full px-2 py-1 text-sm bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="p-4 text-right text-red-600 tabular-nums">
                        {tx.debit !== null ? formatCurrency(tx.debit) : '-'}
                      </td>
                      <td className="p-4 text-right text-emerald-600 tabular-nums">
                        {tx.credit !== null ? formatCurrency(tx.credit) : '-'}
                      </td>
                      <td className="p-4 text-right text-slate-700 font-medium tabular-nums">
                        {formatCurrency(tx.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

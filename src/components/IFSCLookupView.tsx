import React, { useState } from 'react';
import { Search, Building, MapPin, AlertCircle, CheckCircle2, Landmark, CreditCard, Code } from 'lucide-react';

interface IFSCResult {
  BANK: string;
  BRANCH: string;
  ADDRESS: string;
  CITY: string;
  STATE: string;
  CENTRE: string;
  DISTRICT: string;
  NEFT: boolean;
  IMPS: boolean;
  RTGS: boolean;
  UPI: boolean;
  MICR: string;
  BANKCODE: string;
  IFSC: string;
}

export const IFSCLookupView: React.FC = () => {
  const [ifsc, setIfsc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IFSCResult | null>(null);

  const handleSearch = async () => {
    const trimmedIfsc = ifsc.trim().toUpperCase();
    if (trimmedIfsc.length !== 11) {
      setError('IFSC code must be exactly 11 characters long.');
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let data;
      const response = await fetch(`https://ifsc.razorpay.com/${trimmedIfsc}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          try {
            const fallbackResponse = await fetch(`https://bank-apis.justinclicks.com/API/V1/IFSC/${trimmedIfsc}/`);
            if (fallbackResponse.ok) {
              data = await fallbackResponse.json();
              // Normalize data from secondary API
              if (data.IMPS === undefined) data.IMPS = false;
              if (data.RTGS === undefined) data.RTGS = false;
            } else {
              throw new Error('Invalid IFSC code or bank details not found.');
            }
          } catch (fallbackErr) {
            throw new Error('Invalid IFSC code or bank details not found.');
          }
        } else {
          throw new Error('Failed to fetch bank details. Please try again later.');
        }
      } else {
        data = await response.json();
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50">
      <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
        
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
              <Landmark className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">IFSC Lookup</h1>
          </div>
          <p className="text-slate-500 pl-15 text-lg">
            Verify Indian Financial System Code and fetch bank branch details securely.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Code className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Enter 11-character IFSC Code (e.g., SBIN0000001)"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:text-slate-400"
                maxLength={11}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || ifsc.trim().length === 0}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-2xl transition-all shadow-sm shadow-blue-200 flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Lookup Branch
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50/80 border border-red-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-900">Lookup Failed</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/60 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Branch Details</h2>
                <p className="text-sm text-slate-500 mt-1">Verified with banking records</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full font-medium text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Valid IFSC
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Primary Details */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <Landmark className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wider">Bank Name</span>
                  </div>
                  <div className="text-lg font-semibold text-slate-900 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                    {result.BANK}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <Building className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wider">Branch & Contact</span>
                  </div>
                  <div className="text-base text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                    <span className="font-semibold">{result.BRANCH}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wider">Address</span>
                  </div>
                  <div className="text-base text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 min-h-[5rem]">
                    {result.ADDRESS}
                    <div className="mt-2 text-sm font-medium text-slate-500">
                      {result.CITY}, {result.DISTRICT}, {result.STATE}
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical / Routing Details */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <Code className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wider">Codes</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                      <div className="text-xs font-medium text-slate-500 mb-1">IFSC</div>
                      <div className="font-mono font-semibold text-slate-900">{result.IFSC}</div>
                    </div>
                    <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                      <div className="text-xs font-medium text-slate-500 mb-1">MICR</div>
                      <div className="font-mono font-semibold text-slate-900">{result.MICR || 'N/A'}</div>
                    </div>
                    <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                      <div className="text-xs font-medium text-slate-500 mb-1">BANK CODE</div>
                      <div className="font-mono font-semibold text-slate-900">{result.BANKCODE}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wider">Payment Modes</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.NEFT ? (
                      <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-medium text-sm rounded-lg border border-blue-100">NEFT Supported</span>
                    ) : (
                      <span className="px-3 py-1.5 bg-slate-50 text-slate-500 font-medium text-sm rounded-lg border border-slate-200">No NEFT</span>
                    )}
                    {result.IMPS ? (
                      <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-medium text-sm rounded-lg border border-blue-100">IMPS Supported</span>
                    ) : (
                      <span className="px-3 py-1.5 bg-slate-50 text-slate-500 font-medium text-sm rounded-lg border border-slate-200">No IMPS</span>
                    )}
                    {result.RTGS ? (
                      <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-medium text-sm rounded-lg border border-blue-100">RTGS Supported</span>
                    ) : (
                      <span className="px-3 py-1.5 bg-slate-50 text-slate-500 font-medium text-sm rounded-lg border border-slate-200">No RTGS</span>
                    )}
                    {result.UPI ? (
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-medium text-sm rounded-lg border border-emerald-100">UPI Enabled</span>
                    ) : (
                      <span className="px-3 py-1.5 bg-slate-50 text-slate-500 font-medium text-sm rounded-lg border border-slate-200">No UPI</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

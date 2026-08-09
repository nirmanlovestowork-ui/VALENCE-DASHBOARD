import React, { useState } from 'react';
import { Search, Building2, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

interface GSTINResult {
  businessName: string;
  address: string;
  pincode: string;
}

export const GSTINLookupView: React.FC = () => {
  const [gstin, setGstin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GSTINResult | null>(null);

  const handleSearch = async () => {
    // Basic 15-character validation
    const trimmedGstin = gstin.trim();
    if (trimmedGstin.length !== 15) {
      setError('GSTIN must be exactly 15 characters long.');
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const generateUUID = () => {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        try {
          return window.crypto.randomUUID();
        } catch (e) {}
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    try {
      let response;
      let data;

      try {
        response = await fetch('/api/verify-gstin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            gstin: trimmedGstin
          })
        });

        if (response.status === 404) {
          throw new Error('404_STATIC_FALLBACK');
        }

        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("Invalid response from server:", text);
          throw new Error('Received an invalid response from the server. Please check your API configuration.');
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to verify GSTIN or invalid GSTIN provided.');
        }

      } catch (err: any) {
        // If it is a network error, backend is not running, or returned 404 (static hosting scenario)
        const isNetworkOr404 = err.message === '404_STATIC_FALLBACK' || 
                              err.message.includes('Failed to fetch') || 
                              err.message.includes('Cannot connect') ||
                              err.message.includes('Failed to connect to the server');

        const clientKey = (import.meta as any).env.VITE_RAPIDAPI_KEY;
        const clientHost = (import.meta as any).env.VITE_RAPIDAPI_HOST || 'gst-verification.p.rapidapi.com';

        if (isNetworkOr404 && clientKey) {
          console.log("Static host environment detected. Performing direct client-side lookup via RapidAPI...");
          const taskId = generateUUID();
          const groupId = generateUUID();

          try {
            const clientResponse = await fetch(`https://${clientHost}/v3/tasks/sync/verify_with_source/ind_gst_certificate`, {
              method: 'POST',
              headers: {
                'x-rapidapi-key': clientKey,
                'x-rapidapi-host': clientHost,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                task_id: taskId,
                group_id: groupId,
                data: {
                  gstin: trimmedGstin
                }
              })
            });

            const clientText = await clientResponse.text();
            try {
              data = JSON.parse(clientText);
            } catch (e) {
              console.error("Direct API response invalid JSON:", clientText);
              throw new Error('Received an invalid response from direct RapidAPI endpoint.');
            }

            if (!clientResponse.ok) {
              throw new Error(data.message || data.error || 'Failed to verify GSTIN directly via RapidAPI.');
            }
          } catch (directErr: any) {
            console.error("Direct client lookup failed:", directErr);
            throw new Error(`Direct client-side lookup failed: ${directErr.message}`);
          }
        } else {
          if (isNetworkOr404) {
            throw new Error(
              "Static deployment detected (e.g., GitHub Pages). " +
              "To run the lookup tool without a backend server, please configure " +
              "the client-side environment variable VITE_RAPIDAPI_KEY with your RapidAPI key on your hosting provider."
            );
          }
          throw err;
        }
      }

      const sourceOutput = data?.result?.source_output || data?.data || data;
      
      const businessName = sourceOutput?.legal_name || sourceOutput?.legalName || sourceOutput?.businessName || 'N/A';
      
      let address = 'N/A';
      let pincode = 'N/A';

      if (sourceOutput?.principal_place_of_business_fields?.principal_place_of_business_address) {
         const addrObj = sourceOutput.principal_place_of_business_fields.principal_place_of_business_address;
         const parts = [addrObj.door_number, addrObj.floor_number, addrObj.building_name, addrObj.street, addrObj.city, addrObj.state_name].filter(Boolean);
         if (parts.length > 0) {
           address = parts.join(', ');
         }
         if (addrObj.pincode) {
           pincode = addrObj.pincode;
         }
      } else {
         address = sourceOutput?.pradr?.adr || sourceOutput?.address || 'N/A';
         if (sourceOutput?.pradr?.pncd) {
           pincode = sourceOutput.pradr.pncd;
         } else if (sourceOutput?.pincode) {
           pincode = sourceOutput.pincode;
         } else if (typeof address === 'string') {
           const pinMatch = address.match(/\b\d{6}\b/);
           if (pinMatch) {
             pincode = pinMatch[0];
           }
         }
      }

      setResult({
        businessName,
        address,
        pincode
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while verifying the GSTIN.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-8 bg-slate-50 overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-blue-900 tracking-tight flex items-center gap-3">
            <Search className="w-8 h-8 text-blue-600" />
            GSTIN Lookup Tool
          </h2>
          <p className="text-slate-500 font-medium">Verify GST Identification Numbers and extract business details quickly.</p>
        </div>

        {/* Search Card */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-blue-100 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="gstin-input" className="sr-only">Enter GSTIN</label>
              <input
                id="gstin-input"
                type="text"
                placeholder="Enter 15-digit GSTIN"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                maxLength={15}
                className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-medium text-lg uppercase placeholder:normal-case"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || gstin.trim().length === 0}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search & Verify
                </>
              )}
            </button>
          </div>

          {/* Hidden Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}
        </div>

        {/* Results Card - Hidden by default */}
        {result && (
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-blue-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <h3 className="text-xl font-bold text-slate-800">Verification Successful</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Building2 className="w-4 h-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">Business Name</p>
                </div>
                <p className="text-lg font-semibold text-slate-800">{result.businessName}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <MapPin className="w-4 h-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">Pincode</p>
                </div>
                <p className="text-lg font-semibold text-slate-800">{result.pincode}</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <MapPin className="w-4 h-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">Complete Address</p>
                </div>
                <p className="text-base font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {result.address}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

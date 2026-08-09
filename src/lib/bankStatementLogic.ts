import * as XLSX from 'xlsx';

export interface BankTransaction {
  date: string;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number;
  category?: string;
}

export const BANK_STATEMENT_PROMPT = `You are an expert financial data extractor. I am providing you with a bank statement (PDF or image).
Extract the tabular transaction data from this document.

You must strictly output ONLY a JSON array of objects, with no markdown formatting, no code blocks, and no extra text.

Rules for extraction:
1. Ignore non-transaction rows like headers, page numbers, opening balances, or closing balances.
2. Ensure the math is mathematically sound (balance should reflect the previous balance plus/minus the debit/credit).
3. Extract each transaction into an object with these exact keys:
   - "date": string (format: YYYY-MM-DD)
   - "description": string (the narrative/particulars of the transaction)
   - "debit": number or null (amount withdrawn/debited. Use null if it's a credit)
   - "credit": number or null (amount deposited/credited. Use null if it's a debit)
   - "balance": number (the resulting balance after the transaction)
4. Do not include a root object, just the JSON array. Example: [{"date": "2023-10-01", "description": "Amazon", "debit": 15.00, "credit": null, "balance": 150.00}]`;

// 1. File Ingestion & Pre-processing
export async function fileToBase64(file: File): Promise<{ base64: string, mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// 3. Auto-Categorization Logic
export function categorizeTransactions(transactions: BankTransaction[]): BankTransaction[] {
  return transactions.map(tx => {
    let category = "Uncategorized";
    const desc = tx.description.toUpperCase();

    if (/UPI\/|PAYTM|PHONEPE|GPAY|BHIM/i.test(desc)) {
      category = "Digital Payments";
    } else if (/ZOMATO|SWIGGY|UBEREATS|FOODPANDA/i.test(desc)) {
      category = "Meals & Entertainment";
    } else if (/AMAZON|FLIPKART|MYNTRA|AJIO/i.test(desc)) {
      category = "Shopping";
    } else if (/UBER|OLA|RAPIDO|MAKEMYTRIP|IRCTC/i.test(desc)) {
      category = "Transport & Travel";
    } else if (/ATM|CASH WITHDRAWAL/i.test(desc)) {
      category = "Cash";
    } else if (/SALARY|PAYROLL|NEFT.*SAL|IMPS.*SAL/i.test(desc)) {
      category = "Income";
    } else if (/NETFLIX|SPOTIFY|PRIME|HOTSTAR/i.test(desc)) {
      category = "Subscriptions";
    } else if (/FEE|CHARGES|TAX/i.test(desc)) {
      category = "Bank Charges & Taxes";
    }

    return { ...tx, category };
  });
}

// 4. Excel Export Function
export function exportTransactionsToExcel(transactions: BankTransaction[], fileName: string = 'Bank_Statement_Entries.xlsx') {
  const worksheetData = transactions.map(tx => ({
    Date: tx.date,
    Description: tx.description,
    Category: tx.category || 'Uncategorized',
    Debit: tx.debit,
    Credit: tx.credit,
    Balance: tx.balance
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  
  XLSX.writeFile(workbook, fileName);
}

// Main function to call the backend and process the file
export async function processBankStatement(file: File): Promise<BankTransaction[]> {
  const { base64, mimeType } = await fileToBase64(file);
  
  const response = await fetch('/api/process-bank-statement', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileData: base64, mimeType })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to process bank statement');
  }

  const rawData = await response.json();
  return categorizeTransactions(rawData);
}

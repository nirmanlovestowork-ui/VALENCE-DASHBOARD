export type Assignee = 'BIBHU' | 'ADMIN';

export interface Task {
  task_id: string;
  task_name: string;
  description?: string;
  due_date: string | null;
  status: boolean;
  assignee: Assignee;
  recurring?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
}

export interface Party {
  id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
}

export interface Service {
  id?: string;
  name: string;
  unit_price: number;
}

export interface InvoiceItem {
  id: string;
  serviceId?: string;
  name: string;
  unit_price: number;
  quantity: number;
  total: number;
}

export interface Invoice {
  id?: string;
  invoice_number: string;
  date: string;
  party: Party;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  grand_total: number;
}

export type TransactionType = 'Income' | 'Expense' | 'Transfer';
export type TransactionCategory = 'Food & Dining' | 'Groceries' | 'Fitness' | 'Software & Tools' | 'Education' | 'Utilities' | 'Miscellaneous' | 'Salary' | 'Freelance' | 'Other';
export type TransactionAccount = 'Bank Account' | 'Cash' | 'Credit Card';

export interface Transaction {
  id?: string;
  serial_number?: number;
  bank_transaction_id: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO string representing Firestore Timestamp
  category?: string;
  account?: TransactionAccount;
  from_account?: TransactionAccount;
  to_account?: TransactionAccount;
  description: string;
}

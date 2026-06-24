import { TransactionType } from './Category';

export interface Transaction {
  id: number;
  book_id: number;
  category_id: number;
  amount: number;
  type: TransactionType;
  note: string;
  date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
  // joined fields
  category_name?: string;
  category_icon?: string;
}

export interface TransactionCreate {
  book_id: number;
  category_id: number;
  amount: number;
  type: TransactionType;
  note?: string;
  date: string;
}

export interface TransactionFilter {
  book_id?: number;
  type?: TransactionType;
  start_date?: string;
  end_date?: string;
  category_id?: number;
}

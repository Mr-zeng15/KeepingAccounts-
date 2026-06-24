export type TransactionType = 'income' | 'expense';

export interface Category {
  id: number;
  name: string;
  icon: string;
  type: TransactionType;
  is_default: number; // 0 or 1
  sort_order: number;
  created_at: string;
}

export interface CategoryCreate {
  name: string;
  icon: string;
  type: TransactionType;
  is_default?: number;
  sort_order?: number;
}

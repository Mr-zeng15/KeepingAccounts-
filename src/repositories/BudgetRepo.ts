import { getDatabase } from '../db/database';

export interface Budget {
  id: number;
  book_id: number;
  year: number;
  month: number;
  amount: number;
}

export interface CategoryBudget {
  id: number;
  book_id: number;
  category_id: number;
  year: number;
  month: number;
  amount: number;
  category_name: string;
  category_icon: string;
}

export class BudgetRepo {
  /**
   * 获取某月预算
   */
  static async get(bookId: number, year: number, month: number): Promise<Budget | null> {
    const db = await getDatabase();
    return db.getFirstAsync<Budget>(
      'SELECT * FROM budgets WHERE book_id = ? AND year = ? AND month = ?',
      [bookId, year, month]
    );
  }

  /**
   * 设置某月预算（存在则更新，不存在则创建）
   */
  static async set(bookId: number, year: number, month: number, amount: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO budgets (book_id, year, month, amount)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(book_id, year, month)
       DO UPDATE SET amount = excluded.amount, updated_at = datetime('now','localtime')`,
      [bookId, year, month, amount]
    );
  }

  /**
   * 删除某月预算
   */
  static async delete(bookId: number, year: number, month: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM budgets WHERE book_id = ? AND year = ? AND month = ?',
      [bookId, year, month]
    );
  }

  /**
   * 获取某年的所有预算
   */
  static async getYearBudgets(bookId: number, year: number): Promise<Budget[]> {
    const db = await getDatabase();
    return db.getAllAsync<Budget>(
      'SELECT * FROM budgets WHERE book_id = ? AND year = ? ORDER BY month',
      [bookId, year]
    );
  }

  static async getCategoryBudgets(bookId: number, year: number, month: number): Promise<CategoryBudget[]> {
    const db = await getDatabase();
    return db.getAllAsync<CategoryBudget>(
      `SELECT cb.*, c.name as category_name, c.icon as category_icon
       FROM category_budgets cb
       LEFT JOIN categories c ON cb.category_id = c.id
       WHERE cb.book_id = ? AND cb.year = ? AND cb.month = ?
       ORDER BY cb.amount DESC, cb.id DESC`,
      [bookId, year, month]
    );
  }

  static async setCategoryBudget(bookId: number, categoryId: number, year: number, month: number, amount: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO category_budgets (book_id, category_id, year, month, amount)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(book_id, category_id, year, month)
       DO UPDATE SET amount = excluded.amount, updated_at = datetime('now','localtime')`,
      [bookId, categoryId, year, month, amount]
    );
  }

  static async deleteCategoryBudget(bookId: number, categoryId: number, year: number, month: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM category_budgets WHERE book_id = ? AND category_id = ? AND year = ? AND month = ?',
      [bookId, categoryId, year, month]
    );
  }
}

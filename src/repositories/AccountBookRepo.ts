import { getDatabase } from '../db/database';
import { AccountBook, AccountBookCreate } from '../models/AccountBook';

export class AccountBookRepo {
  static async getAll(): Promise<AccountBook[]> {
    const db = await getDatabase();
    return db.getAllAsync<AccountBook>('SELECT * FROM account_books ORDER BY created_at DESC');
  }

  static async getById(id: number): Promise<AccountBook | null> {
    const db = await getDatabase();
    return db.getFirstAsync<AccountBook>('SELECT * FROM account_books WHERE id = ?', [id]);
  }

  static async create(data: AccountBookCreate): Promise<number> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'INSERT INTO account_books (name, icon) VALUES (?, ?)',
      [data.name, data.icon ?? '📒']
    );
    return result.lastInsertRowId;
  }

  static async update(id: number, data: Partial<AccountBookCreate>): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = ['updated_at = datetime("now","localtime")'];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }
    values.push(id);
    await db.runAsync(`UPDATE account_books SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM transactions WHERE book_id = ?', [id]);
    await db.runAsync('DELETE FROM account_books WHERE id = ?', [id]);
  }
}

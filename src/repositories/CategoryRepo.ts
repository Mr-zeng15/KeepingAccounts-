import { getDatabase } from '../db/database';
import { Category, CategoryCreate, TransactionType } from '../models/Category';

export class CategoryRepo {
  static async getAll(type?: TransactionType): Promise<Category[]> {
    const db = await getDatabase();
    if (type) {
      return db.getAllAsync<Category>(
        'SELECT * FROM categories WHERE type = ? ORDER BY sort_order',
        [type]
      );
    }
    return db.getAllAsync<Category>(
      'SELECT * FROM categories ORDER BY type, sort_order'
    );
  }

  static async getById(id: number): Promise<Category | null> {
    const db = await getDatabase();
    return db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
  }

  static async create(data: CategoryCreate): Promise<number> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'INSERT INTO categories (name, icon, type, is_default, sort_order) VALUES (?, ?, ?, 0, ?)',
      [data.name, data.icon, data.type, data.sort_order ?? 99]
    );
    return result.lastInsertRowId;
  }

  static async update(id: number, data: Partial<CategoryCreate>): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
    if (fields.length === 0) return;
    values.push(id);
    await db.runAsync(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM categories WHERE id = ? AND is_default = 0', [id]);
  }
}

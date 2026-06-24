import { getDatabase } from '../db/database';

export interface NoteTag {
  id: number;
  name: string;
}

export class NoteTagRepo {
  static async getAll(): Promise<NoteTag[]> {
    const db = await getDatabase();
    return db.getAllAsync<NoteTag>('SELECT id, name FROM note_tags ORDER BY created_at DESC, id DESC');
  }

  static async create(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    const db = await getDatabase();
    await db.runAsync('INSERT OR IGNORE INTO note_tags (name) VALUES (?)', [trimmed]);
  }

  static async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM note_tags WHERE id = ?', [id]);
  }
}

import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from '../db/database';

interface ExportData {
  version: number;
  exportedAt: string;
  book: { name: string };
  categories: { name: string; icon: string; type: string }[];
  transactions: {
    categoryName: string;
    amount: number;
    type: string;
    note: string;
    date: string;
  }[];
}

export class ImportExportService {
  /**
   * 导出账本为 JSON 文件
   */
  static async exportToJson(bookId: number): Promise<void> {
    const db = await getDatabase();

    const book = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM account_books WHERE id = ?',
      [bookId]
    );
    if (!book) throw new Error('账本不存在');

    const categories = await db.getAllAsync<{ name: string; icon: string; type: string }>(
      'SELECT name, icon, type FROM categories'
    );

    const transactions = await db.getAllAsync<{
      categoryName: string;
      amount: number;
      type: string;
      note: string;
      date: string;
    }>(
      `SELECT c.name as categoryName, t.amount, t.type, t.note, t.date
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.book_id = ?
       ORDER BY t.date DESC`,
      [bookId]
    );

    const exportData: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      book: { name: book.name },
      categories,
      transactions,
    };

    const json = JSON.stringify(exportData, null, 2);
    const fileName = `${book.name}_${new Date().toISOString().slice(0, 10)}.json`;
    const filePath = `${Paths.document.uri}${fileName}`;

    const file = new File(filePath);
    await file.write(json);

    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: `导出账本：${book.name}`,
    });
  }

  /**
   * 导出账本为 CSV 文件
   */
  static async exportToCsv(bookId: number): Promise<void> {
    const db = await getDatabase();

    const book = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM account_books WHERE id = ?',
      [bookId]
    );
    if (!book) throw new Error('账本不存在');

    const transactions = await db.getAllAsync<{
      categoryName: string;
      amount: number;
      type: string;
      note: string;
      date: string;
    }>(
      `SELECT c.name as categoryName, t.amount, t.type, t.note, t.date
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.book_id = ?
       ORDER BY t.date DESC`,
      [bookId]
    );

    // BOM for Excel UTF-8 compatibility
    let csv = '﻿日期,类型,分类,金额,备注\n';
    for (const t of transactions) {
      const typeLabel = t.type === 'income' ? '收入' : '支出';
      const note = (t.note || '').replace(/"/g, '""');
      csv += `${t.date},${typeLabel},${t.categoryName},${t.amount},"${note}"\n`;
    }

    const fileName = `${book.name}_${new Date().toISOString().slice(0, 10)}.csv`;
    const filePath = `${Paths.document.uri}${fileName}`;

    const file = new File(filePath);
    await file.write(csv);

    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: `导出账本：${book.name}`,
    });
  }

  /**
   * 从 JSON 文件导入账本
   */
  static async importFromJson(bookId: number): Promise<{ imported: number; skipped: number }> {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { imported: 0, skipped: 0 };
    }

    const file = new File(result.assets[0].uri);
    const fileContent = await file.text();

    const data: ExportData = JSON.parse(fileContent);
    if (!data.version || !data.transactions) {
      throw new Error('无效的账本文件格式');
    }

    const db = await getDatabase();
    let imported = 0;
    let skipped = 0;

    // Build category name -> id map
    const categoryMap = new Map<string, number>();
    const existingCategories = await db.getAllAsync<{ id: number; name: string }>(
      'SELECT id, name FROM categories'
    );
    for (const c of existingCategories) {
      categoryMap.set(c.name, c.id);
    }

    // Import missing categories
    if (data.categories) {
      for (const cat of data.categories) {
        if (!categoryMap.has(cat.name)) {
          const res = await db.runAsync(
            'INSERT INTO categories (name, icon, type, is_default, sort_order) VALUES (?, ?, ?, 0, 99)',
            [cat.name, cat.icon || '📦', cat.type]
          );
          categoryMap.set(cat.name, res.lastInsertRowId);
        }
      }
    }

    // Import transactions
    for (const t of data.transactions) {
      const categoryId = categoryMap.get(t.categoryName);
      if (!categoryId) {
        skipped++;
        continue;
      }

      await db.runAsync(
        'INSERT INTO transactions (book_id, category_id, amount, type, note, date) VALUES (?, ?, ?, ?, ?, ?)',
        [bookId, categoryId, t.amount, t.type, t.note || '', t.date]
      );
      imported++;
    }

    return { imported, skipped };
  }

  /**
   * 从 CSV 文件导入账本
   */
  static async importFromCsv(bookId: number): Promise<{ imported: number; skipped: number }> {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/csv',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { imported: 0, skipped: 0 };
    }

    const file = new File(result.assets[0].uri);
    const fileContent = await file.text();

    const lines = fileContent.split('\n').filter((line: string) => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV 文件为空或格式不正确');
    }

    // Skip header
    const dataLines = lines.slice(1);

    const db = await getDatabase();
    const categoryMap = new Map<string, number>();
    const existingCategories = await db.getAllAsync<{ id: number; name: string }>(
      'SELECT id, name FROM categories'
    );
    for (const c of existingCategories) {
      categoryMap.set(c.name, c.id);
    }

    let imported = 0;
    let skipped = 0;

    for (const line of dataLines) {
      // Simple CSV parse (handles basic quoting)
      const match = line.match(/^(\d{4}-\d{2}-\d{2}),(收入|支出),([^,]+),([\d.]+),(.*)$/);
      if (!match) {
        skipped++;
        continue;
      }

      const [, date, typeLabel, categoryName, amountStr, note] = match;
      const type = typeLabel === '收入' ? 'income' : 'expense';
      const amount = parseFloat(amountStr);
      const categoryId = categoryMap.get(categoryName);

      if (!categoryId || isNaN(amount)) {
        skipped++;
        continue;
      }

      await db.runAsync(
        'INSERT INTO transactions (book_id, category_id, amount, type, note, date) VALUES (?, ?, ?, ?, ?, ?)',
        [bookId, categoryId, amount, type, note.replace(/^"|"$/g, '').replace(/""/g, '"'), date]
      );
      imported++;
    }

    return { imported, skipped };
  }
}

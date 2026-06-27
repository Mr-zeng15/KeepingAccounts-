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
      type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { imported: 0, skipped: 0 };
    }

    const file = new File(result.assets[0].uri);
    let fileContent = await file.text();

    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }

    const lines = fileContent.split('\n').filter((line: string) => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV 文件为空或格式不正确');
    }

    const db = await getDatabase();
    const categoryMap = new Map<string, number>();
    const existingCategories = await db.getAllAsync<{ id: number; name: string }>(
      'SELECT id, name FROM categories'
    );
    for (const c of existingCategories) {
      categoryMap.set(c.name, c.id);
    }

    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    };

    const headerLine = lines[0];
    const headers = parseCsvLine(headerLine).map(h => h.trim().toLowerCase());

    const findCol = (names: string[]): number => {
      for (const name of names) {
        const idx = headers.indexOf(name.toLowerCase());
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const dateCol = findCol(['日期', 'date', '交易日期', '时间', '记账日期']);
    const typeCol = findCol(['类型', 'type', '收支类型', '收支', '收入支出']);
    const categoryCol = findCol(['分类', 'category', '类别', '账目分类', '一级分类']);
    const subCategoryCol = findCol(['子分类', '二级分类', '详细分类']);
    const amountCol = findCol(['金额', 'amount', '支出金额', '收入金额', '价格', '费用']);
    const noteCol = findCol(['备注', 'note', '说明', '描述', '备注信息', '详情']);

    if (dateCol === -1 || amountCol === -1) {
      throw new Error('CSV 格式不兼容：缺少必要的日期或金额列');
    }

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = parseCsvLine(line);

      let dateStr = values[dateCol]?.trim() || '';
      let typeLabel = typeCol >= 0 ? values[typeCol]?.trim() : '';
      let categoryName = categoryCol >= 0 ? values[categoryCol]?.trim() : '';
      const subCategoryName = subCategoryCol >= 0 ? values[subCategoryCol]?.trim() : '';
      let amountStr = values[amountCol]?.trim() || '';
      const note = noteCol >= 0 ? values[noteCol]?.trim() : '';

      if (subCategoryName && !categoryMap.has(categoryName) && categoryMap.has(subCategoryName)) {
        categoryName = subCategoryName;
      }

      let type = '';
      if (typeLabel) {
        if (typeLabel.includes('收入') || typeLabel.toLowerCase().includes('income') || typeLabel === '+') {
          type = 'income';
        } else if (typeLabel.includes('支出') || typeLabel.toLowerCase().includes('expense') || typeLabel.toLowerCase().includes('expenditure') || typeLabel === '-') {
          type = 'expense';
        }
      }

      if (!type) {
        const amountNum = parseFloat(amountStr.replace(/[^\d.-]/g, ''));
        if (amountNum < 0) {
          type = 'expense';
          amountStr = Math.abs(amountNum).toString();
        } else {
          type = 'expense';
        }
      }

      const dateMatch = dateStr.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
      if (dateMatch) {
        const [, y, m, d] = dateMatch;
        dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else {
        skipped++;
        continue;
      }

      const amount = parseFloat(amountStr.replace(/[^\d.]/g, ''));

      let categoryId = categoryMap.get(categoryName);
      if (!categoryId) {
        const matchedCategory = Array.from(categoryMap.keys()).find(
          key => key.includes(categoryName) || categoryName.includes(key)
        );
        if (matchedCategory) {
          categoryId = categoryMap.get(matchedCategory);
        }
      }

      if (!categoryId || isNaN(amount) || amount <= 0) {
        skipped++;
        continue;
      }

      await db.runAsync(
        'INSERT INTO transactions (book_id, category_id, amount, type, note, date) VALUES (?, ?, ?, ?, ?, ?)',
        [bookId, categoryId, amount, type, note, dateStr]
      );
      imported++;
    }

    return { imported, skipped };
  }
}

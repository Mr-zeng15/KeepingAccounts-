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
    const arrayBuffer = await file.arrayBuffer();
    const bytes = Array.from(new Uint8Array(arrayBuffer));
    const fileContent = this.detectAndConvertEncoding(bytes);

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
    const headers = parseCsvLine(headerLine).map(h => h.trim());

    const findCol = (names: string[]): number => {
      for (const name of names) {
        const idx = headers.findIndex(h =>
          h.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(h.toLowerCase())
        );
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const dateCol = findCol(['日期', 'date', '交易日期', '时间', '记账日期', '发生日期', '交易时间', '入账日期', '消费日期']);
    const typeCol = findCol(['类型', 'type', '收支类型', '收支', '收入支出', '账户类型', '交易类型']);
    const categoryCol = findCol(['分类', 'category', '类别', '账目分类', '一级分类', '支出分类', '收入分类', '项目', '标签']);
    const subCategoryCol = findCol(['子分类', '二级分类', '详细分类', '分类明细']);
    const amountCol = findCol(['金额', 'amount', '支出金额', '收入金额', '价格', '费用', '支出', '收入', '消费金额']);
    const noteCol = findCol(['备注', 'note', '说明', '描述', '备注信息', '详情', '摘要', '事由', '内容']);

    if (dateCol === -1) {
      throw new Error('CSV 格式不兼容：找不到日期列（支持的列名：日期、date、交易日期等）');
    }

    if (amountCol === -1) {
      const hasExpenseCol = findCol(['支出']);
      const hasIncomeCol = findCol(['收入']);
      if (hasExpenseCol !== -1 || hasIncomeCol !== -1) {
        const expenseCol = hasExpenseCol;
        const incomeCol = hasIncomeCol;
        return this.importFromCsvWithSeparateAmounts(bookId, lines, headers, dateCol, typeCol, categoryCol, subCategoryCol, expenseCol, incomeCol, noteCol, categoryMap);
      }
      throw new Error('CSV 格式不兼容：找不到金额列（支持的列名：金额、amount、支出金额、收入金额等）');
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
        const dateMatch2 = dateStr.match(/(\d{4})(\d{2})(\d{2})/);
        if (dateMatch2) {
          const [, y, m, d] = dateMatch2;
          dateStr = `${y}-${m}-${d}`;
        } else {
          skipped++;
          continue;
        }
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

      if (!categoryId) {
        categoryId = categoryMap.get('其他') ?? categoryMap.get('其它') ?? Array.from(categoryMap.values()).find(id => id > 0);
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

  private static async importFromCsvWithSeparateAmounts(
    bookId: number,
    lines: string[],
    headers: string[],
    dateCol: number,
    typeCol: number,
    categoryCol: number,
    subCategoryCol: number,
    expenseCol: number,
    incomeCol: number,
    noteCol: number,
    categoryMap: Map<string, number>
  ): Promise<{ imported: number; skipped: number }> {
    const db = await getDatabase();
    let imported = 0;
    let skipped = 0;

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

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = parseCsvLine(line);

      let dateStr = values[dateCol]?.trim() || '';
      let typeLabel = typeCol >= 0 ? values[typeCol]?.trim() : '';
      let categoryName = categoryCol >= 0 ? values[categoryCol]?.trim() : '';
      const subCategoryName = subCategoryCol >= 0 ? values[subCategoryCol]?.trim() : '';
      const expenseStr = expenseCol >= 0 ? values[expenseCol]?.trim() || '' : '';
      const incomeStr = incomeCol >= 0 ? values[incomeCol]?.trim() || '' : '';
      const note = noteCol >= 0 ? values[noteCol]?.trim() : '';

      if (subCategoryName && !categoryMap.has(categoryName) && categoryMap.has(subCategoryName)) {
        categoryName = subCategoryName;
      }

      const expenseAmount = parseFloat(expenseStr.replace(/[^\d.]/g, ''));
      const incomeAmount = parseFloat(incomeStr.replace(/[^\d.]/g, ''));

      let type = '';
      let amount = 0;

      if (typeLabel) {
        if (typeLabel.includes('收入') || typeLabel.toLowerCase().includes('income')) {
          type = 'income';
          amount = incomeAmount || expenseAmount;
        } else if (typeLabel.includes('支出') || typeLabel.toLowerCase().includes('expense')) {
          type = 'expense';
          amount = expenseAmount || incomeAmount;
        }
      }

      if (!type) {
        if (expenseAmount > 0 && incomeAmount <= 0) {
          type = 'expense';
          amount = expenseAmount;
        } else if (incomeAmount > 0 && expenseAmount <= 0) {
          type = 'income';
          amount = incomeAmount;
        }
      }

      if (!type || amount <= 0) {
        skipped++;
        continue;
      }

      const dateMatch = dateStr.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
      if (dateMatch) {
        const [, y, m, d] = dateMatch;
        dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else {
        skipped++;
        continue;
      }

      let categoryId = categoryMap.get(categoryName);
      if (!categoryId) {
        const matchedCategory = Array.from(categoryMap.keys()).find(
          key => key.includes(categoryName) || categoryName.includes(key)
        );
        if (matchedCategory) {
          categoryId = categoryMap.get(matchedCategory);
        }
      }

      if (!categoryId) {
        categoryId = categoryMap.get('其他') ?? categoryMap.get('其它') ?? Array.from(categoryMap.values()).find(id => id > 0);
      }

      if (!categoryId) {
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

  private static detectAndConvertEncoding(bytes: number[]): string {
    let isUtf8 = true;
    let hasGbkPattern = false;

    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b >= 0x80) {
        if (b >= 0xF8) {
          isUtf8 = false;
          break;
        }
        if ((b & 0xE0) === 0xC0) {
          if (i + 1 >= bytes.length) { isUtf8 = false; break; }
          const b2 = bytes[i + 1];
          if ((b2 & 0xC0) !== 0x80) { isUtf8 = false; break; }
          i++;
        } else if ((b & 0xF0) === 0xE0) {
          if (i + 2 >= bytes.length) { isUtf8 = false; break; }
          const b2 = bytes[i + 1];
          const b3 = bytes[i + 2];
          if ((b2 & 0xC0) !== 0x80 || (b3 & 0xC0) !== 0x80) { isUtf8 = false; break; }
          i += 2;
        } else if ((b & 0xF8) === 0xF0) {
          if (i + 3 >= bytes.length) { isUtf8 = false; break; }
          const b2 = bytes[i + 1];
          const b3 = bytes[i + 2];
          const b4 = bytes[i + 3];
          if ((b2 & 0xC0) !== 0x80 || (b3 & 0xC0) !== 0x80 || (b4 & 0xC0) !== 0x80) { isUtf8 = false; break; }
          i += 3;
        } else {
          isUtf8 = false;
          hasGbkPattern = true;
          break;
        }
      }
    }

    if (!isUtf8 && hasGbkPattern) {
      return this.gbkToUtf8(bytes);
    }

    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  }

  private static gbkToUtf8(bytes: number[]): string {
    const result: number[] = [];

    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];

      if (b < 0x80) {
        result.push(b);
        continue;
      }

      if (i + 1 >= bytes.length) {
        result.push(0xFFFD);
        continue;
      }

      const b2 = bytes[i + 1];
      let code = 0;

      if (b >= 0x81 && b <= 0xFE && b2 >= 0x40 && b2 <= 0xFE) {
        if (b <= 0xA0) {
          code = (b - 0x81) * 190 + (b2 - 0x40);
        } else {
          code = (b - 0xA1) * 190 + (b2 - 0x40);
        }

        if (code < 0) {
          result.push(0xFFFD);
        } else if (code < 0x100) {
          result.push(0x00 + code);
        } else if (code < 0x4E00) {
          result.push(0xFFFD);
        } else {
          const charCode = 0x4E00 + code - 0x100;
          if (charCode <= 0xFFFF) {
            result.push(charCode);
          } else {
            const high = Math.floor((charCode - 0x10000) / 0x400) + 0xD800;
            const low = ((charCode - 0x10000) % 0x400) + 0xDC00;
            result.push(high, low);
          }
        }
        i++;
      } else {
        result.push(0xFFFD);
      }
    }

    return String.fromCodePoint(...result);
  }
}

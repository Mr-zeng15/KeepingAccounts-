/**
 * 随手记 CSV 导入解析器
 *
 * 随手记导出的 CSV 格式（常见列）：
 * 日期, 收支, 分类, 子分类, 金额, 备注, 账户, 成员, 项目
 * 或：记账日期, 收支类型, 一级分类, 二级分类, 金额, 备注, 账户
 *
 * 特点：
 * - 有明确的"收支"列，值为"支出"或"收入"
 * - 有"分类"和"子分类"两列
 * - 金额通常为正数
 */

export interface SuishoujiResult {
  date: string;
  type: 'income' | 'expense';
  categoryName: string;
  amount: number;
  note: string;
}

export function parseSuishoujiCsv(lines: string[]): SuishoujiResult[] {
  const results: SuishoujiResult[] = [];

  // 找到 header 行
  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (line.includes('日期') || line.includes('Date')) {
      headerIdx = i;
      break;
    }
  }

  const headers = lines[headerIdx].split(',').map(h => h.replace(/^"|"$/g, '').trim());

  const findCol = (names: string[]): number => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const dateCol = findCol(['日期', '记账日期', 'Date']);
  const typeCol = findCol(['收支', '收支类型', 'Type']);
  const categoryCol = findCol(['分类', '一级分类', 'Category']);
  const subCategoryCol = findCol(['子分类', '二级分类', 'Sub']);
  const amountCol = findCol(['金额', 'Amount']);
  const noteCol = findCol(['备注', 'Note']);

  if (dateCol === -1 || amountCol === -1) return results;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    if (values.length < headers.length) continue;

    const dateStr = values[dateCol]?.trim() || '';
    const typeLabel = typeCol >= 0 ? values[typeCol]?.trim() || '' : '';
    let categoryName = categoryCol >= 0 ? values[categoryCol]?.trim() || '' : '';
    const subCategory = subCategoryCol >= 0 ? values[subCategoryCol]?.trim() || '' : '';
    const amountStr = values[amountCol]?.trim() || '';
    const note = noteCol >= 0 ? values[noteCol]?.trim() || '' : '';

    if (!dateStr || !amountStr) continue;

    const amount = parseFloat(amountStr.replace(/[^\d.-]/g, ''));
    if (isNaN(amount) || amount <= 0) continue;

    let type: 'income' | 'expense' = 'expense';
    if (typeLabel.includes('收入')) type = 'income';
    else if (typeLabel.includes('支出')) type = 'expense';

    // 分类：优先子分类，其次主分类
    if (subCategory) categoryName = subCategory;
    if (!categoryName) categoryName = '其他';

    const dateMatch = dateStr.match(/(\d{4})[-/\u5e74.](\d{1,2})[-/\u6708.](\d{1,2})/);
    if (!dateMatch) continue;
    const [, y, m, d] = dateMatch;
    const formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

    results.push({
      date: formattedDate,
      type,
      categoryName,
      amount: Math.abs(amount),
      note,
    });
  }

  return results;
}

function parseCsvLine(line: string): string[] {
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
}

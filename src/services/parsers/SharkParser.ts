/**
 * 鲨鱼记账 CSV 导入解析器
 *
 * 鲨鱼记账导出的 CSV 格式（常见列）：
 * 日期, 分类, 金额, 备注, 账户
 * 或：时间, 类型, 分类, 金额, 备注
 *
 * 特点：
 * - 金额列通常只有"金额"，正数=支出，负数=收入（或反过来）
 * - 类型列可能为"支出"/"收入"
 * - 日期格式通常为 YYYY-MM-DD 或 YYYY/MM/DD
 */

export interface SharkParseResult {
  date: string;
  type: 'income' | 'expense';
  categoryName: string;
  amount: number;
  note: string;
}

export function parseSharkCsv(lines: string[]): SharkParseResult[] {
  const results: SharkParseResult[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
    if (values.length < 3) continue;

    // 尝试识别列布局
    // 布局A: 日期, 分类, 金额, 备注, 账户
    // 布局B: 日期, 类型, 分类, 金额, 备注
    // 布局C: 时间, 类型, 分类, 金额, 备注, 账户

    let dateStr = '';
    let typeLabel = '';
    let categoryName = '';
    let amountStr = '';
    let note = '';

    // 检测第一列是否为日期
    const isDateCol = (v: string) => /^\d{4}[-/\u5e74.]\d{1,2}[-/\u6708.]\d{1,2}/.test(v) || /^\d{8}$/.test(v);

    if (isDateCol(values[0])) {
      dateStr = values[0];
      // 第二列可能是类型或分类
      if (values[1] === '支出' || values[1] === '收入') {
        typeLabel = values[1];
        categoryName = values[2] || '';
        amountStr = values[3] || '';
        note = values[4] || '';
      } else {
        categoryName = values[1] || '';
        amountStr = values[2] || '';
        note = values[3] || '';
      }
    }

    if (!dateStr || !amountStr) continue;

    const amount = parseFloat(amountStr.replace(/[^\d.-]/g, ''));
    if (isNaN(amount) || amount <= 0) continue;

    let type: 'income' | 'expense' = 'expense';
    if (typeLabel.includes('收入')) type = 'income';
    else if (typeLabel.includes('支出')) type = 'expense';
    else if (amount < 0) { type = 'income'; } // 负数=收入

    const dateMatch = dateStr.match(/(\d{4})[-/\u5e74.](\d{1,2})[-/\u6708.](\d{1,2})/);
    if (!dateMatch) continue;
    const [, y, m, d] = dateMatch;
    const formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

    results.push({
      date: formattedDate,
      type,
      categoryName: categoryName || '其他',
      amount: Math.abs(amount),
      note,
    });
  }

  return results;
}

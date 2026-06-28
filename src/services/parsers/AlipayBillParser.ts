/**
 * 支付宝账单 CSV 导入解析器
 *
 * 支付宝账单导出的 CSV 格式：
 * 交易号, 商家订单号, 业务类型, 商品名称, 金额（元）, 收/支, 交易状态, 创建时间, 完成时间, 最近修改时间, 备注, 资金状态
 *
 * 特点：
 * - 前几行可能有说明文字
 * - "收/支" 列值为 "收入" 或 "支出"
 * - 金额列名为 "金额（元）"（注意中文括号）
 * - 日期格式：YYYY-MM-DD HH:MM:SS
 * - 业务类型可能是：即时到账交易、担保交易等
 */

export interface AlipayBillResult {
  date: string;
  type: 'income' | 'expense';
  categoryName: string;
  amount: number;
  note: string;
}

export function parseAlipayBillCsv(lines: string[]): AlipayBillResult[] {
  const results: AlipayBillResult[] = [];

  // 找到 header 行
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i].trim();
    if (line.includes('交易号') && (line.includes('金额') || line.includes('收/支'))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    headerIdx = 0;
  }

  const headers = lines[headerIdx].split(',').map(h => h.replace(/^"|"$/g, '').trim());

  const findCol = (names: string[]): number => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const dateCol = findCol(['创建时间', '时间']);
  const typeCol = findCol(['收/支', '收支']);
  const productCol = findCol(['商品名称', '商品']);
  const bizTypeCol = findCol(['业务类型']);
  const amountCol = findCol(['金额']);
  const noteCol = findCol(['备注']);

  if (dateCol === -1 || amountCol === -1) return results;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    if (values.length < headers.length) continue;

    const dateStr = values[dateCol]?.trim() || '';
    const typeLabel = typeCol >= 0 ? values[typeCol]?.trim() || '' : '';
    const product = productCol >= 0 ? values[productCol]?.trim() || '' : '';
    const bizType = bizTypeCol >= 0 ? values[bizTypeCol]?.trim() || '' : '';
    const amountStr = values[amountCol]?.trim() || '';
    const note = noteCol >= 0 ? values[noteCol]?.trim() || '' : '';

    // 跳过汇总行和空行
    if (dateStr.includes('合计') || dateStr.includes('总计') || !dateStr) continue;

    const amount = parseFloat(amountStr.replace(/[^\d.-]/g, ''));
    if (isNaN(amount) || amount <= 0) continue;

    let type: 'income' | 'expense' = 'expense';
    if (typeLabel.includes('收入')) type = 'income';
    else if (typeLabel.includes('支出')) type = 'expense';

    // 日期解析
    const dateMatch = dateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (!dateMatch) continue;
    const [, y, m, d] = dateMatch;
    const formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

    // 分类：优先用商品名，其次用业务类型
    let categoryName = product || bizType || '其他';
    if (categoryName.length > 10) categoryName = categoryName.slice(0, 10);

    const fullNote = [note, bizType, product].filter(Boolean).join(' | ');

    results.push({
      date: formattedDate,
      type,
      categoryName,
      amount: Math.abs(amount),
      note: fullNote,
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

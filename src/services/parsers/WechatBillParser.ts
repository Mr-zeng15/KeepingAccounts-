/**
 * 微信账单 CSV 导入解析器
 *
 * 微信账单导出的 CSV 格式（微信支付账单）：
 * 交易时间, 交易类型, 交易对方, 商品, 收/支, 金额(元), 支付方式, 当前状态, 备注
 *
 * 特点：
 * - 前几行可能是表头说明（非标准 CSV header）
 * - "收/支" 列值为 "收入" 或 "支出"
 * - 金额列名为 "金额(元)"
 * - 日期格式：YYYY-MM-DD HH:MM:SS
 * - 可能有 BOM 头
 */

export interface WechatBillResult {
  date: string;
  type: 'income' | 'expense';
  categoryName: string;
  amount: number;
  note: string;
}

export function parseWechatBillCsv(lines: string[]): WechatBillResult[] {
  const results: WechatBillResult[] = [];

  // 微信账单前几行可能是说明文字，需要找到真正的 header 行
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i].trim();
    if (line.includes('交易时间') && line.includes('金额')) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    // 尝试直接解析第一行作为 header
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

  const dateCol = findCol(['交易时间', '时间']);
  const typeCol = findCol(['收/支', '收支']);
  const counterpartyCol = findCol(['交易对方', '对方']);
  const productCol = findCol(['商品', '商品名称']);
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
    const counterparty = counterpartyCol >= 0 ? values[counterpartyCol]?.trim() || '' : '';
    const product = productCol >= 0 ? values[productCol]?.trim() || '' : '';
    const amountStr = values[amountCol]?.trim() || '';
    const note = noteCol >= 0 ? values[noteCol]?.trim() || '' : '';

    // 跳过汇总行
    if (dateStr.includes('合计') || dateStr.includes('总计') || amountStr.includes('合计')) continue;

    const amount = parseFloat(amountStr.replace(/[^\d.-]/g, ''));
    if (isNaN(amount) || amount <= 0) continue;

    let type: 'income' | 'expense' = 'expense';
    if (typeLabel.includes('收入')) type = 'income';
    else if (typeLabel.includes('支出')) type = 'expense';

    // 日期解析：YYYY-MM-DD HH:MM:SS
    const dateMatch = dateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (!dateMatch) continue;
    const [, y, m, d] = dateMatch;
    const formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

    // 分类：优先用商品名，其次用交易对方
    let categoryName = product || counterparty || '其他';
    // 截断过长的分类名
    if (categoryName.length > 10) categoryName = categoryName.slice(0, 10);

    // 备注合并
    const fullNote = [note, counterparty, product].filter(Boolean).join(' | ');

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

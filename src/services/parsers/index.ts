/**
 * 统一 CSV 解析器 — 自动检测文件格式并路由到对应解析器
 *
 * 支持的格式：
 * 1. 微信账单（交易时间 + 收/支 + 金额(元)）
 * 2. 支付宝账单（交易号 + 收/支 + 金额（元））
 * 3. 随手记（日期 + 收支 + 分类 + 子分类）
 * 4. 鲨鱼记账（日期 + 分类 + 金额）
 * 5. 通用 CSV（标准 日期/类型/分类/金额/备注 列）
 */

import { parseWechatBillCsv, WechatBillResult } from './WechatBillParser';
import { parseAlipayBillCsv, AlipayBillResult } from './AlipayBillParser';
import { parseSuishoujiCsv, SuishoujiResult } from './SuishoujiParser';
import { parseSharkCsv, SharkParseResult } from './SharkParser';

export interface UnifiedParsedTransaction {
  date: string;
  type: 'income' | 'expense';
  categoryName: string;
  amount: number;
  note: string;
}

export interface ParseResult {
  format: string;
  transactions: UnifiedParsedTransaction[];
}

/**
 * 自动检测 CSV 格式并解析
 * @param lines 已去除 BOM 的行数组（含 header）
 * @returns 解析结果，包含格式名称和交易记录
 */
export function autoDetectAndParse(lines: string[]): ParseResult {
  if (lines.length < 2) {
    throw new Error('CSV 文件为空或格式不正确');
  }

  const headerLine = lines[0].trim();
  const headerLower = headerLine.toLowerCase();

  // 1. 微信账单检测
  if (headerLower.includes('交易时间') && headerLower.includes('收/支')) {
    const results = parseWechatBillCsv(lines);
    if (results.length > 0) {
      return { format: '微信账单', transactions: results };
    }
  }

  // 2. 支付宝账单检测
  if (headerLower.includes('交易号') && (headerLower.includes('金额') || headerLower.includes('收/支'))) {
    const results = parseAlipayBillCsv(lines);
    if (results.length > 0) {
      return { format: '支付宝账单', transactions: results };
    }
  }

  // 3. 随手记检测（有"收支"列 + "子分类"列）
  if (headerLower.includes('收支') && (headerLower.includes('子分类') || headerLower.includes('二级分类'))) {
    const results = parseSuishoujiCsv(lines);
    if (results.length > 0) {
      return { format: '随手记', transactions: results };
    }
  }

  // 4. 鲨鱼记账检测（简单格式：日期,分类,金额）
  const cols = headerLine.split(',').map(c => c.trim());
  if (cols.length >= 3 && cols.length <= 6) {
    const hasDate = cols.some(c => c.includes('日期') || c.includes('时间'));
    const hasAmount = cols.some(c => c.includes('金额'));
    const hasCategory = cols.some(c => c.includes('分类') || c.includes('类别'));
    const noType = !cols.some(c => c.includes('收支') || c.includes('类型') || c.includes('收/支'));
    if (hasDate && hasAmount && hasCategory && noType) {
      const results = parseSharkCsv(lines);
      if (results.length > 0) {
        return { format: '鲨鱼记账', transactions: results };
      }
    }
  }

  // 5. 回退到通用解析器（由 ImportExportService 处理）
  return { format: '通用CSV', transactions: [] };
}

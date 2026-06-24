const WEEKDAY_MAP: Record<string, number> = {
  日: 0,
  天: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
};

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(base: Date, days: number): Date {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

function normalizeBase(baseDate?: Date | string): Date {
  if (!baseDate) return new Date();
  if (baseDate instanceof Date) return new Date(baseDate);
  return new Date(`${baseDate}T12:00:00`);
}

function getPreviousWeekday(base: Date, weekday: number, includeCurrent = false): Date {
  const current = base.getDay();
  let diff = current - weekday;
  if (diff < 0) diff += 7;
  if (diff === 0 && !includeCurrent) diff = 7;
  return addDays(base, -diff);
}

export function parseChineseDate(input: string, baseDate?: Date | string): string | null {
  const text = input.replace(/\s+/g, '');
  const base = normalizeBase(baseDate);
  const currentYear = base.getFullYear();

  if (/今天|今日/.test(text)) return toDateString(base);
  if (/昨天|昨日/.test(text)) return toDateString(addDays(base, -1));
  if (/前天/.test(text)) return toDateString(addDays(base, -2));
  if (/大前天/.test(text)) return toDateString(addDays(base, -3));

  const relativeDayMatch = text.match(/(\d+)(天|日)前/);
  if (relativeDayMatch) {
    return toDateString(addDays(base, -Number(relativeDayMatch[1])));
  }

  const weekMatch = text.match(/(上周|上星期|上礼拜|这周|本周|这个星期|这星期|本星期|这个礼拜|这礼拜|本礼拜|周|星期|礼拜)([日天一二三四五六])/);
  if (weekMatch) {
    const weekday = WEEKDAY_MAP[weekMatch[2]];
    const prefix = weekMatch[1];
    if (prefix === '上周' || prefix === '上星期' || prefix === '上礼拜') {
      const startOfThisWeek = addDays(base, -(base.getDay() || 7) + 1);
      return toDateString(addDays(startOfThisWeek, -7 + (weekday === 0 ? 6 : weekday - 1)));
    }
    if (prefix === '这周' || prefix === '本周' || prefix.includes('这个') || prefix.includes('这') || prefix.includes('本')) {
      const startOfThisWeek = addDays(base, -(base.getDay() || 7) + 1);
      return toDateString(addDays(startOfThisWeek, weekday === 0 ? 6 : weekday - 1));
    }
    return toDateString(getPreviousWeekday(base, weekday, true));
  }

  const fullDateMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})(日|号)?/);
  if (fullDateMatch) {
    return toDateString(new Date(Number(fullDateMatch[1]), Number(fullDateMatch[2]) - 1, Number(fullDateMatch[3]), 12));
  }

  const monthDayMatch = text.match(/(\d{1,2})月(\d{1,2})(日|号)?/);
  if (monthDayMatch) {
    return toDateString(new Date(currentYear, Number(monthDayMatch[1]) - 1, Number(monthDayMatch[2]), 12));
  }

  const thisMonthMatch = text.match(/(这个月|本月|这月)(\d{1,2})(日|号)?/);
  if (thisMonthMatch) {
    return toDateString(new Date(currentYear, base.getMonth(), Number(thisMonthMatch[2]), 12));
  }

  return null;
}

export function resolveTransactionDate(input: string, explicitDate?: string, baseDate?: Date | string): string {
  return explicitDate || parseChineseDate(input, baseDate) || toDateString(normalizeBase(baseDate));
}

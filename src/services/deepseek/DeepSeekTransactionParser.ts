import { DeepSeekConfig } from './DeepSeekConfig';
import { TransactionType } from '../../models/Category';

export interface ParsedTransaction {
  amount: number;
  type: TransactionType;
  categoryName: string;
  note: string;
  date?: string;
}

const SYSTEM_PROMPT = `你是一个智能记账助手。用户会告诉你收支情况，可能一段话里包含多条记录。
请只返回 JSON 数组，不要返回解释文字。

返回格式：
[
  {
    "amount": 数字，必须大于 0,
    "type": "expense" 或 "income",
    "categoryName": "从分类列表中选择最匹配的分类",
    "note": "简短备注",
    "date": "YYYY-MM-DD，如果用户提到日期就返回具体日期；没提到日期可省略或返回空字符串"
  }
]

支出分类：餐饮、购物、日用、交通、蔬菜、水果、零食、运动、娱乐、居住、医疗、教育、通讯、服饰、美容、社交、宠物、旅行、数码、汽车、烟酒、其他
收入分类：工资、奖金、理财、兼职、红包、报销、租金、利息、退款、其他

规则：
1. 没有明确说收入、工资、奖金、收到、报销、退款等时，默认支出。
2. 金额必须是数字，不带单位。
3. 尽量拆分每条独立记录。
4. 分类必须从上面的分类列表里选择。
5. 备注简短，保留原始含义。
6. 日期要灵活识别，比如昨天、前天、大前天、3天前、上周五、这周一、这个月3号、6月1日、2026年6月1日。
7. 只能返回 JSON 数组。`;

export class DeepSeekTransactionParser {
  static async parse(text: string): Promise<ParsedTransaction[]> {
    const apiKey = await DeepSeekConfig.getApiKey();
    if (!apiKey) {
      throw new Error('请先在设置中配置 DeepSeek API Key');
    }

    const baseUrl = await DeepSeekConfig.getBaseUrl();

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API 错误: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('DeepSeek 返回结果为空');
    }

    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return items.map((item: any) => {
        const date = String(item.date || '').trim();
        return {
          amount: Number(item.amount) || 0,
          type: (item.type === 'income' ? 'income' : 'expense') as TransactionType,
          categoryName: String(item.categoryName || ''),
          note: String(item.note || ''),
          date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
        };
      }).filter((item) => item.amount > 0);
    } catch {
      throw new Error('AI 解析结果格式错误，请重试');
    }
  }
}

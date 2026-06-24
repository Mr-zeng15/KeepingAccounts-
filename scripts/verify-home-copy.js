const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'HomeScreen.tsx'), 'utf8');
const mojibakePatterns = ['鍛', '鏀', '鏈', '璐', '棰', '璧', '缁', '閫', '夋', '嫨', '鏃', '骞', '鍙栨秷', '缂栬緫', '鍒犻櫎'];

for (const pattern of mojibakePatterns) {
  if (source.includes(pattern)) {
    throw new Error(`HomeScreen still contains mojibake text: ${pattern}`);
  }
}

for (const text of ['今天', '昨天', '本月账单', '收入', '支出', '结余', '账单', '预算', '资产', '统计', '选择月份']) {
  if (!source.includes(text)) {
    throw new Error(`HomeScreen is missing expected Chinese copy: ${text}`);
  }
}

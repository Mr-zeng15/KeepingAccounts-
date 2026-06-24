const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const home = read('src/screens/HomeScreen.tsx');
const bill = read('src/screens/BillStatisticsScreen.tsx');
const statistics = read('src/screens/StatisticsScreen.tsx');

assert(home.includes('monthListRef') && home.includes('selectedMonthIndex'), 'Home month picker should track and scroll to the selected month.');
assert(home.includes('scrollTo({') && home.includes('selectedMonthIndex * MONTH_ITEM_HEIGHT'), 'Home month picker should open near the selected month.');
assert(home.includes("alignItems: 'flex-end'") && home.includes('paddingTop: 92'), 'Home month menu should expand downward from the top-right trigger area.');
assert(bill.includes("justifyContent: 'flex-start'") && bill.includes('paddingTop: 76'), 'Bill year menu should expand downward from the header.');
assert(statistics.includes("justifyContent: 'flex-start'") && statistics.includes('paddingTop: 88'), 'Statistics picker should expand downward from the header.');

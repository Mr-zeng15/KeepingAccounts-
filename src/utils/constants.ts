import type { ImageSourcePropType } from 'react-native';

export const COLORS = {
  primary: '#FFD447',
  primaryDark: '#FFB52E',
  primaryLight: '#FFF2BF',
  accent: '#FF9F1C',
  background: '#FFF7E6',
  surface: '#FFFFFF',
  cardBg: '#FFFDF8',
  text: '#3A2E1F',
  textSecondary: '#7A674F',
  textLight: '#B7A892',
  border: '#F4E1BD',
  divider: '#F3E6D0',
  income: '#6BC77B',
  expense: '#3A2E1F',
  danger: '#FF6B6B',
  warning: '#F5A623',
  chartBlue: '#79A8FF',
  chartMint: '#73D5B6',
};

export const SHADOWS = {
  card: {
    shadowColor: '#8C5A16',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  floating: {
    shadowColor: '#8C5A16',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },
};

export const MASCOTS: Record<'home' | 'voice' | 'chart' | 'avatar', ImageSourcePropType> = {
  home: require('../../assets/mascot/mascot-home.png'),
  voice: require('../../assets/mascot/mascot-voice.png'),
  chart: require('../../assets/mascot/mascot-chart.png'),
  avatar: require('../../assets/mascot/mascot-avatar.png'),
};

export const CHART_COLORS = [
  '#FF6B6B', '#FFD447', '#79A8FF', '#73D5B6', '#FFB52E',
  '#B8A7FF', '#6BC77B', '#F7DC6F', '#FF9F1C', '#9AD9E8',
  '#FF8FAB', '#8BD17C', '#FFA177', '#C5A3FF', '#5EC4D4', '#FFCDB2',
];

export const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

// 分类图标映射（线性简约风格用 emoji 代替，后续可替换为 SVG）
export const CATEGORY_ICONS: Record<string, string> = {
  '餐饮': '🍜',
  '购物': '🛒',
  '日用': '🧴',
  '交通': '🚗',
  '蔬菜': '🥬',
  '水果': '🍎',
  '零食': '🍪',
  '运动': '⚽',
  '娱乐': '🎮',
  '居住': '🏠',
  '医疗': '💊',
  '教育': '📚',
  '通讯': '📱',
  '服饰': '👔',
  '美容': '💅',
  '社交': '🤝',
  '宠物': '🐱',
  '旅行': '✈️',
  '数码': '💻',
  '汽车': '⛽',
  '烟酒': '🚬',
  '工资': '💰',
  '奖金': '🎁',
  '理财': '📈',
  '兼职': '💼',
  '红包': '🧧',
  '报销': '🧾',
  '租金': '🏢',
  '利息': '🏦',
  '退款': '↩️',
  '其他': '📦',
};

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';

type IconSet = 'mci' | 'ion' | 'feather';

interface IconMapping {
  set: IconSet;
  name: string;
}

// 分类图标映射 — 线性简约风格
const CATEGORY_ICON_MAP: Record<string, IconMapping> = {
  // 支出
  '餐饮': { set: 'mci', name: 'silverware-fork-knife' },
  '购物': { set: 'ion', name: 'cart-outline' },
  '日用': { set: 'mci', name: 'basket-outline' },
  '交通': { set: 'ion', name: 'bus-outline' },
  '蔬菜': { set: 'ion', name: 'leaf-outline' },
  '水果': { set: 'mci', name: 'food-apple-outline' },
  '零食': { set: 'ion', name: 'cafe-outline' },
  '运动': { set: 'ion', name: 'football-outline' },
  '娱乐': { set: 'ion', name: 'game-controller-outline' },
  '居住': { set: 'ion', name: 'home-outline' },
  '医疗': { set: 'ion', name: 'medkit-outline' },
  '教育': { set: 'ion', name: 'book-outline' },
  '通讯': { set: 'ion', name: 'phone-portrait-outline' },
  '服饰': { set: 'ion', name: 'shirt-outline' },
  '美容': { set: 'ion', name: 'sparkles-outline' },
  '社交': { set: 'ion', name: 'people-outline' },
  '宠物': { set: 'ion', name: 'paw-outline' },
  '旅行': { set: 'ion', name: 'airplane-outline' },
  '数码': { set: 'ion', name: 'phone-portrait-outline' },
  '汽车': { set: 'ion', name: 'car-outline' },
  '烟酒': { set: 'ion', name: 'wine-outline' },
  // 收入
  '工资': { set: 'mci', name: 'cash' },
  '奖金': { set: 'ion', name: 'gift-outline' },
  '理财': { set: 'ion', name: 'trending-up-outline' },
  '兼职': { set: 'ion', name: 'briefcase-outline' },
  '红包': { set: 'ion', name: 'mail-outline' },
  '报销': { set: 'ion', name: 'receipt-outline' },
  '租金': { set: 'ion', name: 'business-outline' },
  '利息': { set: 'ion', name: 'wallet-outline' },
  '退款': { set: 'ion', name: 'arrow-undo-outline' },
  '其他': { set: 'ion', name: 'ellipsis-horizontal-circle-outline' },
};

// 自定义分类可选图标池 — 键为 "<set>:<name>" 或 "svg:<key>"
export const ICON_POOL: Record<string, IconMapping> = {
  // === 收入 — 金币/金钱风格 ===
  'ion:wallet-outline': { set: 'ion', name: 'wallet-outline' },
  'ion:card-outline': { set: 'ion', name: 'card-outline' },
  'ion:trending-up-outline': { set: 'ion', name: 'trending-up-outline' },
  'ion:gift-outline': { set: 'ion', name: 'gift-outline' },
  'ion:diamond-outline': { set: 'ion', name: 'diamond-outline' },
  'ion:trophy-outline': { set: 'ion', name: 'trophy-outline' },
  'ion:ribbon-outline': { set: 'ion', name: 'ribbon-outline' },
  'ion:briefcase-outline': { set: 'ion', name: 'briefcase-outline' },
  'ion:receipt-outline': { set: 'ion', name: 'receipt-outline' },
  'ion:cash-outline': { set: 'ion', name: 'cash-outline' },
  'ion:bag-handle-outline': { set: 'ion', name: 'bag-handle-outline' },
  'ion:earth-outline': { set: 'ion', name: 'earth-outline' },
  'ion:business-outline': { set: 'ion', name: 'business-outline' },
  'ion:bar-chart-outline': { set: 'ion', name: 'bar-chart-outline' },
  'ion:rose-outline': { set: 'ion', name: 'rose-outline' },
  // 钱币符号系列（收入）
  'ion:logo-usd': { set: 'ion', name: 'logo-usd' },
  'ion:logo-euro': { set: 'ion', name: 'logo-euro' },
  'ion:logo-yen': { set: 'ion', name: 'logo-yen' },
  'ion:logo-bitcoin': { set: 'ion', name: 'logo-bitcoin' },
  'ion:pricetags-outline': { set: 'ion', name: 'pricetags-outline' },
  'ion:calculator-outline': { set: 'ion', name: 'calculator-outline' },
  'ion:stats-chart-outline': { set: 'ion', name: 'stats-chart-outline' },
  'ion:save-outline': { set: 'ion', name: 'save-outline' },
  'ion:arrow-up-circle-outline': { set: 'ion', name: 'arrow-up-circle-outline' },
  'ion:repeat-outline': { set: 'ion', name: 'repeat-outline' },
  'ion:time-outline': { set: 'ion', name: 'time-outline' },
  'ion:calendar-outline': { set: 'ion', name: 'calendar-outline' },
  // === 支出 ===
  // 餐饮相关
  'ion:restaurant-outline': { set: 'ion', name: 'restaurant-outline' },
  'ion:fast-food-outline': { set: 'ion', name: 'fast-food-outline' },
  'ion:nutrition-outline': { set: 'ion', name: 'nutrition-outline' },
  'ion:beer-outline': { set: 'ion', name: 'beer-outline' },
  'ion:ice-cream-outline': { set: 'ion', name: 'ice-cream-outline' },
  'ion:pizza-outline': { set: 'ion', name: 'pizza-outline' },
  'ion:fish-outline': { set: 'ion', name: 'fish-outline' },
  'ion:egg-outline': { set: 'ion', name: 'egg-outline' },
  'ion:wine-outline': { set: 'ion', name: 'wine-outline' },
  'ion:cafe-outline': { set: 'ion', name: 'cafe-outline' },
  // 交通出行
  'ion:train-outline': { set: 'ion', name: 'train-outline' },
  'ion:bicycle-outline': { set: 'ion', name: 'bicycle-outline' },
  'ion:boat-outline': { set: 'ion', name: 'boat-outline' },
  'ion:walk-outline': { set: 'ion', name: 'walk-outline' },
  'ion:car-sport-outline': { set: 'ion', name: 'car-sport-outline' },
  'ion:bus-outline': { set: 'ion', name: 'bus-outline' },
  'ion:airplane-outline': { set: 'ion', name: 'airplane-outline' },
  'ion:subway-outline': { set: 'ion', name: 'subway-outline' },
  // 生活居家
  'ion:bed-outline': { set: 'ion', name: 'bed-outline' },
  'ion:bulb-outline': { set: 'ion', name: 'bulb-outline' },
  'ion:hammer-outline': { set: 'ion', name: 'hammer-outline' },
  'ion:construct-outline': { set: 'ion', name: 'construct-outline' },
  'ion:water-outline': { set: 'ion', name: 'water-outline' },
  'ion:flash-outline': { set: 'ion', name: 'flash-outline' },
  'ion:key-outline': { set: 'ion', name: 'key-outline' },
  'ion:umbrella-outline': { set: 'ion', name: 'umbrella-outline' },
  'ion:shirt-outline': { set: 'ion', name: 'shirt-outline' },
  'ion:glasses-outline': { set: 'ion', name: 'glasses-outline' },
  // 兴趣爱好
  'ion:camera-outline': { set: 'ion', name: 'camera-outline' },
  'ion:musical-notes-outline': { set: 'ion', name: 'musical-notes-outline' },
  'ion:fitness-outline': { set: 'ion', name: 'fitness-outline' },
  'ion:barbell-outline': { set: 'ion', name: 'barbell-outline' },
  'ion:color-palette-outline': { set: 'ion', name: 'color-palette-outline' },
  'ion:tv-outline': { set: 'ion', name: 'tv-outline' },
  'ion:headset-outline': { set: 'ion', name: 'headset-outline' },
  'ion:game-controller-outline': { set: 'ion', name: 'game-controller-outline' },
  'ion:football-outline': { set: 'ion', name: 'football-outline' },
  'ion:tennisball-outline': { set: 'ion', name: 'tennisball-outline' },
  // 医疗健康
  'ion:medkit-outline': { set: 'ion', name: 'medkit-outline' },
  'ion:bandage-outline': { set: 'ion', name: 'bandage-outline' },
  'ion:pulse-outline': { set: 'ion', name: 'pulse-outline' },
  // 教育
  'ion:book-outline': { set: 'ion', name: 'book-outline' },
  'ion:school-outline': { set: 'ion', name: 'school-outline' },
  'ion:library-outline': { set: 'ion', name: 'library-outline' },
  'ion:pencil-outline': { set: 'ion', name: 'pencil-outline' },
  // 宠物
  'ion:paw-outline': { set: 'ion', name: 'paw-outline' },
  // 自然
  'ion:sunny-outline': { set: 'ion', name: 'sunny-outline' },
  'ion:moon-outline': { set: 'ion', name: 'moon-outline' },
  'ion:flower-outline': { set: 'ion', name: 'flower-outline' },
  'ion:leaf-outline': { set: 'ion', name: 'leaf-outline' },
  'ion:flame-outline': { set: 'ion', name: 'flame-outline' },
  'ion:snow-outline': { set: 'ion', name: 'snow-outline' },
  'ion:cloud-outline': { set: 'ion', name: 'cloud-outline' },
  'ion:rainy-outline': { set: 'ion', name: 'rainy-outline' },
  // 工作学习
  'ion:newspaper-outline': { set: 'ion', name: 'newspaper-outline' },
  'ion:globe-outline': { set: 'ion', name: 'globe-outline' },
  'ion:rocket-outline': { set: 'ion', name: 'rocket-outline' },
  'ion:laptop-outline': { set: 'ion', name: 'laptop-outline' },
  'ion:print-outline': { set: 'ion', name: 'print-outline' },
  // 社交
  'ion:chatbubble-outline': { set: 'ion', name: 'chatbubble-outline' },
  'ion:heart-outline': { set: 'ion', name: 'heart-outline' },
  'ion:star-outline': { set: 'ion', name: 'star-outline' },
  'ion:thumbs-up-outline': { set: 'ion', name: 'thumbs-up-outline' },
  'ion:people-outline': { set: 'ion', name: 'people-outline' },
  'ion:person-outline': { set: 'ion', name: 'person-outline' },
  'ion:person-add-outline': { set: 'ion', name: 'person-add-outline' },
  // 通讯
  'ion:phone-portrait-outline': { set: 'ion', name: 'phone-portrait-outline' },
  'ion:mail-outline': { set: 'ion', name: 'mail-outline' },
  'ion:wifi-outline': { set: 'ion', name: 'wifi-outline' },
  // 其他
  'ion:alarm-outline': { set: 'ion', name: 'alarm-outline' },
  'ion:hourglass-outline': { set: 'ion', name: 'hourglass-outline' },
  'ion:cube-outline': { set: 'ion', name: 'cube-outline' },
  'ion:git-branch-outline': { set: 'ion', name: 'git-branch-outline' },
  'ion:eye-outline': { set: 'ion', name: 'eye-outline' },
  'ion:ellipsis-horizontal-circle-outline': { set: 'ion', name: 'ellipsis-horizontal-circle-outline' },
  'ion:home-outline': { set: 'ion', name: 'home-outline' },
  'ion:cart-outline': { set: 'ion', name: 'cart-outline' },
  'ion:sparkles-outline': { set: 'ion', name: 'sparkles-outline' },
  'ion:arrow-undo-outline': { set: 'ion', name: 'arrow-undo-outline' },
  'ion:shield-checkmark-outline': { set: 'ion', name: 'shield-checkmark-outline' },
};

export const ICON_POOL_LIST = Object.keys(ICON_POOL);

interface CategoryIconProps {
  categoryName: string;
  size?: number;
  color?: string;
  fallback?: string;
  /** 自定义分类的图标键，如 "ion:flame-outline" 或 "svg:coin" */
  iconKey?: string;
}

export function CategoryIcon({ categoryName, iconKey, size = 22, color = '#333', fallback }: CategoryIconProps) {
  // 向量图标池
  if (iconKey && ICON_POOL[iconKey]) {
    return renderIcon(ICON_POOL[iconKey], size, color);
  }
  // 默认分类按名字匹配
  const mapping = CATEGORY_ICON_MAP[categoryName];
  if (mapping) {
    return renderIcon(mapping, size, color);
  }
  return <Text style={{ fontSize: size }}>{fallback || '📦'}</Text>;
}

function renderIcon(mapping: IconMapping, size: number, color: string) {
  switch (mapping.set) {
    case 'mci':
      return <MaterialCommunityIcons name={mapping.name as any} size={size} color={color} />;
    case 'ion':
      return <Ionicons name={mapping.name as any} size={size} color={color} />;
    case 'feather':
      return <Feather name={mapping.name as any} size={size} color={color} />;
    default:
      return <Text style={{ fontSize: size }}>📦</Text>;
  }
}

// 底部 Tab 图标
export function TabIcon({ name, size = 22, color = '#999' }: { name: string; size?: number; color?: string }) {
  const iconMap: Record<string, IconMapping> = {
    '明细': { set: 'ion', name: 'receipt-outline' },
    '图表': { set: 'ion', name: 'pie-chart-outline' },
    '发现': { set: 'ion', name: 'compass-outline' },
    '我的': { set: 'ion', name: 'person-outline' },
  };

  const mapping = iconMap[name];
  if (!mapping) return null;

  return <Ionicons name={mapping.name as any} size={size} color={color} />;
}

// 功能图标
export function FuncIcon({ name, size = 20, color = '#333' }: { name: string; size?: number; color?: string }) {
  const iconMap: Record<string, IconMapping> = {
    '账单': { set: 'ion', name: 'document-text-outline' },
    '预算': { set: 'ion', name: 'wallet-outline' },
    '资产管家': { set: 'mci', name: 'bank' },
    '购物返现': { set: 'ion', name: 'pricetag-outline' },
    '更多': { set: 'ion', name: 'grid-outline' },
  };

  const mapping = iconMap[name];
  if (!mapping) return null;

  switch (mapping.set) {
    case 'mci':
      return <MaterialCommunityIcons name={mapping.name as any} size={size} color={color} />;
    default:
      return <Ionicons name={mapping.name as any} size={size} color={color} />;
  }
}

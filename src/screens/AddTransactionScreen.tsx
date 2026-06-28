import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Keyboard, Animated, Platform, Dimensions, Vibration,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { showThemedAlert } from '../components/AlertProvider';
import { Ionicons } from '@expo/vector-icons';
import { TransactionRepo } from '../repositories/TransactionRepo';
import { CategoryRepo } from '../repositories/CategoryRepo';
import { AccountBookRepo } from '../repositories/AccountBookRepo';
import { Category, TransactionType } from '../models/Category';
import { COLORS } from '../utils/constants';
import { getToday } from '../utils/formatters';
import { CategoryIcon } from '../components/AppIcon';
import DatePickerWheel from '../components/DatePickerWheel';
import TransactionInputPanel from '../components/TransactionInputPanel';

export default function AddTransactionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editId = route.params?.transactionId as number | undefined;

  const [transactionLoaded, setTransactionLoaded] = useState(!editId);
  const initialType = (route.params?.transactionType as TransactionType) || 'expense';

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getToday());
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [frequentNotes, setFrequentNotes] = useState<string[]>([]);
  const [noteFocused, setNoteFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showTagPanel, setShowTagPanel] = useState(false);

  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;

  // 计算器状态
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [freshOp, setFreshOp] = useState(false);

  // 金额跳动动画
  const amountScale = useRef(new Animated.Value(1)).current;
  const flashAmount = () => {
    Animated.sequence([
      Animated.timing(amountScale, { toValue: 1.15, duration: 120, useNativeDriver: false }),
      Animated.timing(amountScale, { toValue: 1, duration: 120, useNativeDriver: false }),
    ]).start();
  };

  // 分类网格 ScrollView 引用，用于自动滚动到选中的分类
  const categoryScrollRef = useRef<ScrollView>(null);

  // 备注聚焦过渡动画
  const keyboardAnim = useRef(new Animated.Value(1)).current;   // 1=键盘可见, 0=键盘隐藏
  const overlayAnim = useRef(new Animated.Value(0)).current;    // 0=遮罩隐藏, 1=遮罩可见
  const inputPanelAnim = useRef(new Animated.Value(0)).current; // 输入面板向上偏移动画

  // 记录键盘高度，用于备注聚焦时压缩分类网格；键盘收起后恢复自定义键盘
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event: any) => {
      const h = event?.endCoordinates?.height;
      if (typeof h === 'number') {
        setKeyboardHeight(h);
        Animated.timing(inputPanelAnim, {
          toValue: -h,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (dismissTimerRef.current) { clearTimeout(dismissTimerRef.current); dismissTimerRef.current = null; }
      setKeyboardHeight(0);
      Animated.timing(inputPanelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
      setTimeout(() => {
        setNoteFocused(false);
      }, 100);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (noteFocused) {
      Animated.parallel([
        Animated.timing(keyboardAnim, { toValue: 0, duration: 220, useNativeDriver: false }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(keyboardAnim, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 220, useNativeDriver: false }),
      ]).start();
    }
  }, [noteFocused]);

  const isToday = date === getToday();

  // 编辑模式：首次加载时读取交易数据，设置 type 和 categoryId
  useEffect(() => {
    if (editId) {
      (async () => {
        const t = await TransactionRepo.getById(editId);
        if (t) {
          setType(t.type);
          setAmount(String(t.amount));
          setNote(t.note || '');
          setDate(t.date);
          setCategoryId(t.category_id);
          // 先设置 type，等下一个渲染周期再加载分类
          setTransactionLoaded(true);
        }
      })();
    } else {
      setTransactionLoaded(true);
    }
  }, []);

  // type 变化或编辑数据加载完后，加载对应分类
  useEffect(() => {
    if (!transactionLoaded) return;
    loadCategories();
  }, [type, transactionLoaded]);

  // 使用 ref 跟踪最新 categoryId，避免 useEffect 闭包陷阱
  const categoryIdRef = useRef<number | null>(categoryId);
  useEffect(() => {
    categoryIdRef.current = categoryId;
  }, [categoryId]);

  // 加载常用标签（基于 ref 获取最新 categoryId）
  const loadFrequentNotes = useCallback(async () => {
    try {
      const notes = await TransactionRepo.getFrequentNotes(10, categoryIdRef.current || undefined);
      setFrequentNotes(notes);
    } catch (e) {
      console.warn('加载常用备注失败:', e);
      setFrequentNotes([]);
    }
  }, []);

  // 分类切换时重新加载常用标签（每个分类的标签独立）
  useEffect(() => {
    if (!transactionLoaded) return;
    loadFrequentNotes();
  }, [categoryId, transactionLoaded]);

  const loadCategories = async () => {
    try {
      const cats = await CategoryRepo.getAll(type);
      setCategories(cats);

      // 如果当前 categoryId 在分类列表中，保持不变
      if (categoryId && cats.some(cat => cat.id === categoryId)) {
        return;
      }

      // 新建模式：不自动选择分类，等用户主动点击
      if (!editId) {
        setCategoryId(null);
        return;
      }

      // 编辑模式下如果分类不存在，也不自动选择
      setCategoryId(null);
    } catch (e) {
      console.warn('加载分类失败:', e);
      setCategories([]);
    }
  };

  // 处理分类选择，自动滚动到选中的分类
  const handleCategorySelect = (catId: number, index: number) => {
    setCategoryId(catId);

    // 计算滚动位置：每个分类项宽度为 25%，每行 4 个
    const itemWidth = Dimensions.get('window').width * 0.25;
    const row = Math.floor(index / 4);
    const rowHeight = 70; // 每行高度（包括图标和文字）
    const targetY = row * rowHeight;

    // 延迟滚动，等待布局完成
    setTimeout(() => {
      categoryScrollRef.current?.scrollTo({ y: targetY, animated: true });
    }, 100);
  };

  /** 计算两个值的结果 */
  const calc = (a: number, b: number, op: string): number => {
    let result: number;
    switch (op) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '×': result = a * b; break;
      case '÷': result = b !== 0 ? a / b : a; break;
      default: result = b;
    }

    // 检查结果是否在安全范围内
    const MAX_SAFE_AMOUNT = 9999999999; // 10位数上限
    if (result > MAX_SAFE_AMOUNT) return MAX_SAFE_AMOUNT;
    if (result < -MAX_SAFE_AMOUNT) return -MAX_SAFE_AMOUNT;

    return result;
  };

  /** 格式化数字：去掉末尾多余的 0，并限制长度 */
  const fmtResult = (n: number): string => {
    if (!isFinite(n) || isNaN(n)) return '0';
    const s = parseFloat(n.toFixed(10)).toString();

    // 如果数字太长，截断到10位有效数字
    if (s.replace(/[^0-9]/g, '').length > 10) {
      return parseFloat(n.toFixed(2)).toString();
    }

    return s;
  };

  const handleKey = (key: string) => {
    Vibration.vibrate(10);
    // 刚按了运算符，开始输入新数字
    if (freshOp) {
      setFreshOp(false);
      if (key === '⌫') return;
      if (key === '.') {
        setAmount('0.');
        return;
      }
      setAmount(key);
      return;
    }

    if (key === '⌫') {
      setAmount((p) => p.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (amount.includes('.')) return;
      if (!amount) { setAmount('0.'); return; }
    }
    if (key === '0' && amount === '0') return;
    const parts = amount.split('.');

    // 整数位数限制：最多10位
    if (!amount.includes('.') && amount.replace(/[^0-9]/g, '').length >= 10) return;

    // 小数位数限制：最多2位
    if (parts[1]?.length >= 2) return;

    // 总长度限制：最多13个字符（10位整数 + 小数点 + 2位小数）
    if (amount.length >= 13) return;

    setAmount((p) => p + key);
  };

  const handleOp = (op: string) => {
    Vibration.vibrate(10);
    const current = parseFloat(amount) || 0;

    // 防止除以0的提示
    if (op === '÷' && current === 0 && freshOp === false) {
      showThemedAlert('提示', '除数不能为0');
      return;
    }

    if (prevValue !== null && pendingOp && !freshOp) {
      // 已有上一步运算且输入了新数字 → 先算出中间结果，大字跳动
      const result = calc(prevValue, current, pendingOp);
      setAmount(fmtResult(result));
      setPrevValue(result);
      flashAmount();
    } else {
      setPrevValue(current);
    }

    setPendingOp(op);
    setFreshOp(true);
  };

  /** 按下等号 — 算出最终结果，恢复菜单让用户确认保存 */
  const handleEquals = () => {
    if (prevValue !== null && pendingOp) {
      const current = parseFloat(amount) || 0;
      const result = calc(prevValue, current, pendingOp);
      const resultStr = fmtResult(result);
      setAmount(resultStr);
      flashAmount();
      // 清除运算状态，恢复菜单
      setPrevValue(null);
      setPendingOp(null);
      setFreshOp(false);
    }
  };

  const saveWithAmount = async (amountStr: string) => {
    try {
      const num = parseFloat(amountStr);
      if (!amountStr || isNaN(num) || num <= 0) {
        showThemedAlert('提示', '请先输入金额');
        return;
      }

      // 金额上限检测
      const MAX_AMOUNT = 9999999999; // 10位数上限
      if (num > MAX_AMOUNT) {
        showThemedAlert('提示', '金额超出最大限制（99亿）');
        return;
      }

      if (!categoryId) {
        showThemedAlert('提示', '请选择分类');
        return;
      }
      const books = await AccountBookRepo.getAll();
      const bookId = books.length > 0 ? books[0].id : 1;
      if (editId) {
        await TransactionRepo.update(editId, { category_id: categoryId, amount: num, type, note, date });
        // 编辑后直接返回，让 HomeScreen 通过 useFocusEffect 刷新（保持滚动位置）
        navigation.goBack();
      } else {
        await TransactionRepo.create({ book_id: bookId, category_id: categoryId, amount: num, type, note, date });
      }
    } catch (e: any) {
      showThemedAlert('保存失败', String(e?.message || e));
    }
  };

  /** 构建小字提示：显示完整运算过程 */
  const buildHint = (): string | null => {
    if (prevValue === null || !pendingOp) return null;
    const left = fmtResult(prevValue);
    if (freshOp) {
      // 刚按了运算符，还没输入新数字 → "35 +"
      return `${left} ${pendingOp}`;
    }
    // 正在输入第二个数 → "35 + 10"
    return `${left} ${pendingOp} ${amount || '0'}`;
  };

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissNote = () => {
    Keyboard.dismiss();
    // 如果系统键盘根本没有弹出来，keyboardDidHide 不会触发，用 300ms 保底重置
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setNoteFocused(false);
    }, 300);
  };

  const handleSave = async () => {
    try {
      // 如果有未完成的运算，先算出结果
      let finalAmount = amount;
      if (prevValue !== null && pendingOp && !freshOp) {
        const current = parseFloat(amount) || 0;
        const result = calc(prevValue, current, pendingOp);
        finalAmount = String(parseFloat(result.toFixed(10)));
        setAmount(finalAmount);
      }

      const num = parseFloat(finalAmount);
      if (!finalAmount || isNaN(num) || num <= 0) {
        showThemedAlert('提示', '请先输入金额');
        return;
      }

      // 金额上限检测
      const MAX_AMOUNT = 9999999999; // 10位数上限
      if (num > MAX_AMOUNT) {
        showThemedAlert('提示', '金额超出最大限制（99亿）');
        return;
      }

      if (!categoryId) {
        showThemedAlert('提示', '请选择分类');
        return;
      }

      const books = await AccountBookRepo.getAll();
      const bookId = books.length > 0 ? books[0].id : 1;

      if (editId) {
        await TransactionRepo.update(editId, { category_id: categoryId, amount: num, type, note, date });
        // 编辑后直接返回，让 HomeScreen 通过 useFocusEffect 刷新（保持滚动位置）
        navigation.goBack();
      } else {
        await TransactionRepo.create({ book_id: bookId, category_id: categoryId, amount: num, type, note, date });
        // 新建后通过 reset 跳到 Home（因为输入页不复用）
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
        });
      }
    } catch (e: any) {
      showThemedAlert('保存失败', String(e?.message || e));
    }
  };

  /** 批量记账：保存后清空输入，保留分类和日期 */
  const handleBatchSave = async () => {
    try {
      // 如果有未完成的运算，先算出结果
      let finalAmount = amount;
      if (prevValue !== null && pendingOp && !freshOp) {
        const current = parseFloat(amount) || 0;
        const result = calc(prevValue, current, pendingOp);
        finalAmount = String(parseFloat(result.toFixed(10)));
        setAmount(finalAmount);
      }

      const num = parseFloat(finalAmount);
      if (!finalAmount || isNaN(num) || num <= 0) {
        showThemedAlert('提示', '请先输入金额');
        return;
      }

      // 金额上限检测
      const MAX_AMOUNT = 9999999999; // 10位数上限
      if (num > MAX_AMOUNT) {
        showThemedAlert('提示', '金额超出最大限制（99亿）');
        return;
      }

      if (!categoryId) {
        showThemedAlert('提示', '请选择分类');
        return;
      }

      const books = await AccountBookRepo.getAll();
      const bookId = books.length > 0 ? books[0].id : 1;

      await TransactionRepo.create({ book_id: bookId, category_id: categoryId, amount: num, type, note, date });

      // 清空金额和备注，保留类型、分类和日期
      setAmount('');
      setNote('');
      setPrevValue(null);
      setPendingOp(null);
      setFreshOp(false);
      flashAmount();

      showThemedAlert('保存成功', '已保存，可继续记账', undefined, 'checkmark-circle');
    } catch (e: any) {
      showThemedAlert('保存失败', String(e?.message || e));
    }
  };

  return (
    <View style={styles.container}>
      {/* 顶部 AppBar */}
      <View style={[styles.appBar, { paddingTop: (insets.top || 24) + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Ionicons name="close" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.tabWrap}>
          <TouchableOpacity
            style={[styles.tab, type === 'expense' && styles.tabActive]}
            onPress={() => { setType('expense'); setCategoryId(null); }}
          >
            <Text style={[styles.tabText, type === 'expense' && styles.tabTextActive]}>支出</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, type === 'income' && styles.tabActive]}
            onPress={() => { setType('income'); setCategoryId(null); }}
          >
            <Text style={[styles.tabText, type === 'income' && styles.tabTextActive]}>收入</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cancelBtn} />
      </View>

      {/* 分类网格 — 上方区域，自然填充剩余空间 */}
      <Animated.View
        style={[
          styles.categoryGrid,
          {
            opacity: overlayAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.3],
            }),
          },
        ]}
      >
        <ScrollView
          ref={categoryScrollRef}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        >
          {categories.map((cat, index) => {
            const active = cat.id === categoryId;
            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.gridItem}
                onPress={() => handleCategorySelect(cat.id, index)}
                activeOpacity={0.7}
                disabled={noteFocused}
              >
                <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
                  <CategoryIcon categoryName={cat.name} iconKey={cat.icon} size={22} color={active ? '#333' : '#666'} />
                </View>
                <Text style={[styles.catLabel, active && styles.catLabelActive]} numberOfLines={1}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* 备注聚焦时的遮罩 — 使用动画淡入淡出，避免闪烁 */}
      <Animated.View
        style={[styles.noteOverlay, { opacity: overlayAnim, pointerEvents: noteFocused ? 'auto' : 'none' }]}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={dismissNote} />
      </Animated.View>

      {/* 记账输入面板 — 固定在底部，选中分类后才显示 */}
      {categoryId && (
        <Animated.View style={[styles.inputPanelWrapper, { transform: [{ translateY: inputPanelAnim }], paddingBottom: insets.bottom }]}>
          <TransactionInputPanel
            amount={amount}
            onAmountChange={setAmount}
            note={note}
            onNoteChange={setNote}
            date={date}
            isToday={isToday}
            onDatePress={() => setShowDatePicker(true)}
            frequentNotes={frequentNotes}
            prevValue={prevValue}
            pendingOp={pendingOp}
            freshOp={freshOp}
            onKey={handleKey}
            onOp={handleOp}
            onEquals={handleEquals}
            onSave={handleSave}
            onBatchSave={handleBatchSave}
            buildHint={buildHint}
            amountScale={amountScale}
            keyboardAnim={keyboardAnim}
            overlayAnim={overlayAnim}
            noteFocused={noteFocused}
            onNoteFocus={() => setNoteFocused(true)}
            onNoteBlur={() => setNoteFocused(false)}
            dismissNote={dismissNote}
            keyboardHeight={keyboardHeight}
            insetsBottom={insets.bottom}
          />
        </Animated.View>
      )}

      {/* 日期滚轮选择器 — 条件渲染避免 hidden Modal 的 aria-hidden 冲突 */}
      {showDatePicker && (
        <DatePickerWheel
          visible={showDatePicker}
          date={date}
          onConfirm={(d) => { setDate(d); setShowDatePicker(false); }}
          onCancel={() => setShowDatePicker(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // AppBar
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cancelBtn: { width: 40, alignItems: 'center' },
  logoWrap: { marginRight: 6, justifyContent: 'center', alignItems: 'center' },
  tabWrap: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 8,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  tab: { flex: 1, paddingVertical: 7, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.text, borderRadius: 8 },
  tabText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary },

  // 分类网格
  categoryGrid: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  gridItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconCircleActive: { backgroundColor: COLORS.primary },
  catLabel: { fontSize: 11, color: COLORS.textSecondary },
  catLabelActive: { color: COLORS.text, fontWeight: '600' },

  // 备注遮罩
  noteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.01)',
    zIndex: 1,
  },

  // 输入面板包装器 — 固定在底部
  inputPanelWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});

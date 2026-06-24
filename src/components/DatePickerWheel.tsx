import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

interface Props {
  visible: boolean;
  date: string;
  onConfirm: (date: string) => void;
  onCancel: () => void;
  monthOnly?: boolean;
}

function parse(d: string) {
  const p = d.split('-').map(Number);
  return { y: p[0] || new Date().getFullYear(), m: p[1] || new Date().getMonth() + 1, d: p[2] || new Date().getDate() };
}
function fmt(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function todayStr() {
  const d = new Date();
  return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
function dim(y: number, m: number) { return new Date(y, m, 0).getDate(); }

const YEARS = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

function NumPicker({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <View style={st.npCol}>
      <Text style={st.npLabel}>{label}</Text>
      <TouchableOpacity onPress={() => onChange(value > min ? value - 1 : max)} style={st.arrowBtn}>
        <Ionicons name="chevron-up" size={24} color={COLORS.text} />
      </TouchableOpacity>
      <View style={st.npValue}>
        <Text style={st.npValueText}>{value}</Text>
      </View>
      <TouchableOpacity onPress={() => onChange(value < max ? value + 1 : min)} style={st.arrowBtn}>
        <Ionicons name="chevron-down" size={24} color={COLORS.text} />
      </TouchableOpacity>
    </View>
  );
}

export default function DatePickerWheel({ visible, date, onConfirm, onCancel, monthOnly }: Props) {
  const p = parse(date);
  const [year, setYear] = useState(p.y);
  const [month, setMonth] = useState(p.m);
  const [day, setDay] = useState(p.d);

  useEffect(() => {
    if (visible) {
      const np = parse(date);
      setYear(np.y);
      setMonth(np.m);
      setDay(np.d);
    }
  }, [visible]);

  // 月份变化时修正日期
  const maxDay = dim(year, month);
  const safeDay = Math.min(day, maxDay);
  useEffect(() => {
    if (day > maxDay) setDay(maxDay);
  }, [year, month]);

  const handleConfirm = () => {
    onConfirm(fmt(year, month, monthOnly ? 1 : safeDay));
  };

  const goToday = () => {
    const t = parse(todayStr());
    setYear(t.y);
    setMonth(t.m);
    setDay(t.d);
  };

  const isToday = fmt(year, month, safeDay) === todayStr();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={st.overlay}>
        <TouchableOpacity style={st.bg} activeOpacity={1} onPress={onCancel} />
        <View style={st.sheet}>
          {/* 顶栏 */}
          <View style={st.top}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={st.cancelTxt}>取消</Text>
            </TouchableOpacity>
            <View style={st.titleRow}>
              <Text style={st.title}>选择日期</Text>
              {!isToday && (
                <TouchableOpacity onPress={goToday} style={st.chip}>
                  <Text style={st.chipTxt}>今天</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={st.okTxt}>确定</Text>
            </TouchableOpacity>
          </View>

          {/* 选择器 */}
          <View style={st.pickerRow}>
            <NumPicker label="年" value={year} min={YEARS[0]} max={YEARS[YEARS.length - 1]} onChange={setYear} />
            <NumPicker label="月" value={month} min={1} max={12} onChange={setMonth} />
            {!monthOnly && <NumPicker label="日" value={safeDay} min={1} max={maxDay} onChange={setDay} />}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 34 },
  top: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider,
  },
  cancelTxt: { fontSize: 15, color: COLORS.textSecondary },
  okTxt: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  chip: { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  chipTxt: { fontSize: 12, fontWeight: '600', color: '#fff' },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 20,
  },
  npCol: { alignItems: 'center', width: 80 },
  npLabel: { fontSize: 13, color: COLORS.textLight, marginBottom: 8 },
  arrowBtn: { padding: 8 },
  npValue: {
    width: 64,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginVertical: 4,
  },
  npValueText: { fontSize: 20, fontWeight: '700', color: COLORS.text },
});

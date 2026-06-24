import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Category } from '../models/Category';
import { COLORS } from '../utils/constants';

interface Props {
  categories: Category[];
  selectedId: number | null;
  onSelect: (cat: Category) => void;
}

export default function CategoryPicker({ categories, selectedId, onSelect }: Props) {
  return (
    <FlatList
      data={categories}
      numColumns={5}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => {
        const isSelected = item.id === selectedId;
        return (
          <TouchableOpacity
            style={[styles.item, isSelected && styles.itemSelected]}
            onPress={() => onSelect(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={[styles.name, isSelected && styles.nameSelected]} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 8 },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    margin: 4,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    minWidth: 60,
    maxWidth: 80,
  },
  itemSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  icon: { fontSize: 24, marginBottom: 4 },
  name: { fontSize: 12, color: COLORS.textSecondary },
  nameSelected: { color: '#fff', fontWeight: '600' },
});

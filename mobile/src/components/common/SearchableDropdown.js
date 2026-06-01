import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, FlatList,
  TextInput, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/colors';

export default function SearchableDropdown({
  options = [],
  value,
  onSelect,
  placeholder = 'Select an option',
  label,
  error,
  includeOther = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const allOptions = useMemo(() => {
    const base = options.map(o => (typeof o === 'string' ? { label: o, value: o } : o));
    if (includeOther) base.push({ label: 'Other (not listed)', value: '__other__' });
    return base;
  }, [options, includeOther]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allOptions;
    const q = query.toLowerCase();
    return allOptions.filter(o => o.label.toLowerCase().includes(q));
  }, [query, allOptions]);

  const displayLabel = allOptions.find(o => o.value === value)?.label || null;

  function handleSelect(item) {
    onSelect(item.value);
    setOpen(false);
    setQuery('');
  }

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.trigger, error && styles.triggerError]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.triggerText, !displayLabel && styles.triggerPlaceholder]} numberOfLines={1}>
          {displayLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label || 'Select'}</Text>
            <TouchableOpacity onPress={() => { setOpen(false); setQuery(''); }}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search..."
              placeholderTextColor={COLORS.textSecondary}
              autoFocus
              clearButtonMode="while-editing"
            />
          </View>

          {/* Options */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => {
              const isOther = item.value === '__other__';
              const isSelected = item.value === value;
              const isLastBeforeOther = index === filtered.length - 2 && filtered[filtered.length - 1]?.value === '__other__';
              return (
                <>
                  {isLastBeforeOther && <View style={styles.divider} />}
                  <TouchableOpacity
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                      isOther && styles.optionTextOther,
                    ]}>
                      {item.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color={COLORS.navy} />}
                  </TouchableOpacity>
                </>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: COLORS.white,
  },
  triggerError: { borderColor: COLORS.error },
  triggerText: { flex: 1, fontSize: 15, color: COLORS.text, marginRight: 8 },
  triggerPlaceholder: { color: COLORS.textSecondary },
  errorText: { color: COLORS.error, fontSize: 12, marginTop: 4 },
  modal: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionSelected: { backgroundColor: COLORS.lightBlue + '60' },
  optionText: { fontSize: 15, color: COLORS.text, flex: 1 },
  optionTextSelected: { color: COLORS.navy, fontWeight: '600' },
  optionTextOther: { color: COLORS.textSecondary, fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
});

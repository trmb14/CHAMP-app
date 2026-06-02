import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { invoicesAPI } from '../../services/api';
import { COLORS, SHADOWS } from '../../utils/colors';
import { formatCurrency, formatDate } from '../../utils/formatting';
import StatusBadge from '../../components/common/StatusBadge';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'paid', label: 'Paid' },
];

export default function ClientInvoicesScreen() {
  const navigation = useNavigation();
  const [invoices, setInvoices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusTab, setStatusTab] = useState('all');
  const [search, setSearch] = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      const data = await invoicesAPI.list();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let result = invoices;
    if (statusTab !== 'all') result = result.filter(i => i.status === statusTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        String(i.invoice_number).includes(q) ||
        formatDate(i.invoice_date, 'MMM d yyyy').toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [invoices, statusTab, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const totalShown = filtered.reduce((s, i) => s + parseFloat(i.total_due ?? i.total_amount ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
      </View>

      {/* Status filter tabs */}
      <View style={styles.tabRow}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, statusTab === tab.key && styles.tabActive]}
            onPress={() => setStatusTab(tab.key)}
          >
            <Text style={[styles.tabText, statusTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search invoices..."
          placeholderTextColor={COLORS.textSecondary}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Total summary */}
      {filtered.length > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {filtered.length} invoice{filtered.length !== 1 ? 's' : ''} • {formatCurrency(totalShown)} total
          </Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.navy} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, SHADOWS.card]}
            onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
            activeOpacity={0.8}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.invoiceNum}>Invoice #{item.invoice_number}</Text>
              <Text style={styles.invoiceDate}>{formatDate(item.invoice_date, 'MMM d, yyyy')}</Text>
              {item.week_start && (
                <Text style={styles.invoiceWeek}>
                  Week of {formatDate(item.week_start, 'MMM d')}
                </Text>
              )}
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.amount}>{formatCurrency(item.total_due ?? item.total_amount)}</Text>
              <StatusBadge status={item.status} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>
              {loading ? 'Loading…' : 'No invoices found'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.lightGray },
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: { color: COLORS.white, fontSize: 22, fontWeight: '700' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  summaryRow: { paddingHorizontal: 16, marginBottom: 4 },
  summaryText: { fontSize: 12, color: COLORS.textSecondary },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: { flex: 1 },
  invoiceNum: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  invoiceDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  invoiceWeek: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 16, fontWeight: '700', color: COLORS.navy },
  empty: { alignItems: 'center', padding: 48, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});

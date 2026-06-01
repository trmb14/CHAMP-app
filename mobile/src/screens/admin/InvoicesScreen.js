import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { invoicesAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { COLORS, SHADOWS } from '../../utils/colors';
import { formatCurrency, formatDate } from '../../utils/formatting';
import StatusBadge from '../../components/common/StatusBadge';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';

const STATUS_BORDER = { draft: COLORS.textSecondary, sent: COLORS.navy, paid: COLORS.success };

export default function InvoicesScreen() {
  const navigation = useNavigation();
  const { isDark, colors } = useTheme();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      const data = await invoicesAPI.list();
      setInvoices(data);
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setLoading(false); }
  }

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, []);

  if (loading && invoices.length === 0) return <LoadingScreen />;

  // Revenue summary
  const summary = invoices.reduce((acc, inv) => {
    if (inv.status === 'paid') acc.paid += parseFloat(inv.total_due || 0);
    else if (inv.status === 'sent') acc.sent += parseFloat(inv.total_due || 0);
    else acc.draft += parseFloat(inv.total_due || 0);
    return acc;
  }, { draft: 0, sent: 0, paid: 0 });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.navy }]} edges={['top']}>
      <ScreenHeader
        title="Invoices"
        rightAction={
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={() => navigation.navigate('GenerateInvoices')}
          >
            <Ionicons name="add" size={16} color={COLORS.white} />
            <Text style={styles.generateText}>Generate</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={invoices}
        keyExtractor={i => i.id}
        contentContainerStyle={[styles.list, { backgroundColor: colors.lightGray }]}
        style={{ backgroundColor: colors.lightGray }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />}
        ListHeaderComponent={
          invoices.length > 0 ? (
            <View style={[styles.summaryCard, { backgroundColor: colors.navy }, SHADOWS.card]}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Draft</Text>
                <Text style={styles.summaryValue}>{formatCurrency(summary.draft)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Sent</Text>
                <Text style={[styles.summaryValue, { color: '#7EC8E3' }]}>{formatCurrency(summary.sent)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Collected</Text>
                <Text style={[styles.summaryValue, { color: COLORS.green }]}>{formatCurrency(summary.paid)}</Text>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const borderColor = STATUS_BORDER[item.status] || COLORS.border;
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card || colors.white, borderLeftColor: borderColor }, SHADOWS.card]}
              onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.invNumber, { color: colors.navy }]}>{item.invoice_number}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={[styles.clientName, { color: colors.text }]}>{item.client_name}</Text>
              <Text style={[styles.weekRange, { color: colors.textSecondary }]}>
                {formatDate(item.week_start, 'MMM d')} – {formatDate(item.week_end, 'MMM d, yyyy')}
              </Text>
              {item.invoice_date ? (
                <Text style={[styles.invoiceDate, { color: colors.textSecondary }]}>
                  Invoice Date: {formatDate(item.invoice_date, 'MMM d, yyyy')}
                </Text>
              ) : null}
              <View style={[styles.amountRow, { backgroundColor: colors.lightGray }]}>
                <View>
                  <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                  <Text style={[styles.amount, { color: colors.text }]}>{formatCurrency(item.subtotal)}</Text>
                </View>
                <View>
                  <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>HST (13%)</Text>
                  <Text style={[styles.amount, { color: colors.text }]}>{formatCurrency(item.hst_amount)}</Text>
                </View>
                <View>
                  <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Total Due</Text>
                  <Text style={[styles.amount, { color: colors.navy, fontWeight: '700' }]}>
                    {formatCurrency(item.total_due)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No invoices yet</Text>
            <TouchableOpacity onPress={() => navigation.navigate('GenerateInvoices')}>
              <Text style={[styles.emptyAction, { color: colors.navy }]}>Generate your first invoice</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: 16 },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  generateText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  summaryCard: {
    borderRadius: 14,
    flexDirection: 'row',
    padding: 16,
    marginBottom: 14,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500', marginBottom: 4 },
  summaryValue: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },
  card: {
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  invNumber: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  clientName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  weekRange: { fontSize: 12, marginBottom: 3 },
  invoiceDate: { fontSize: 11, marginBottom: 10, fontStyle: 'italic' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: 8, padding: 10 },
  amountLabel: { fontSize: 10, marginBottom: 2 },
  amount: { fontSize: 14, fontWeight: '500' },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 15 },
  emptyAction: { fontSize: 14, fontWeight: '600', marginTop: 4 },
});

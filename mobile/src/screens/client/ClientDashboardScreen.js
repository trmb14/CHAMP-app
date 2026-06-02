import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI } from '../../services/api';
import { COLORS, SHADOWS } from '../../utils/colors';
import { formatCurrency, formatDate } from '../../utils/formatting';
import StatusBadge from '../../components/common/StatusBadge';

export default function ClientDashboardScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      const d = await dashboardAPI.client();
      setData(d);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const stats = [
    { label: 'Outstanding', value: formatCurrency(data?.outstanding), icon: 'time-outline', color: '#E67E22' },
    { label: 'Paid This Year', value: formatCurrency(data?.paid_this_year), icon: 'checkmark-circle-outline', color: COLORS.green },
    { label: 'Total Invoices', value: data?.total_invoices ?? '—', icon: 'receipt-outline', color: COLORS.navy },
    { label: 'Last Invoice', value: data?.last_invoice?.invoice_date ? formatDate(data.last_invoice.invoice_date, 'MMM d') : '—', icon: 'calendar-outline', color: '#8E44AD' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.navy} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.facilityName} numberOfLines={1}>
              {user?.client_facility || user?.name}
            </Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert('Sign Out', 'Sign out of CHAMP?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
          ])}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Stats */}
          <View style={styles.statsGrid}>
            {stats.map((stat, i) => (
              <View key={i} style={[styles.statCard, SHADOWS.card]}>
                <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                  <Ionicons name={stat.icon} size={20} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{loading ? '…' : stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Recent Invoices */}
          <Text style={styles.sectionTitle}>Recent Invoices</Text>
          {data?.recent_invoices?.length > 0 ? (
            data.recent_invoices.map(inv => (
              <TouchableOpacity
                key={inv.id}
                style={[styles.invoiceCard, SHADOWS.card]}
                onPress={() => navigation.navigate('Invoices', { screen: 'InvoiceDetail', params: { invoiceId: inv.id } })}
                activeOpacity={0.8}
              >
                <View style={styles.invoiceLeft}>
                  <Text style={styles.invoiceNum}>Invoice #{inv.invoice_number}</Text>
                  <Text style={styles.invoiceDate}>{formatDate(inv.invoice_date, 'MMM d, yyyy')}</Text>
                </View>
                <View style={styles.invoiceRight}>
                  <Text style={styles.invoiceAmount}>{formatCurrency(inv.total_due ?? inv.total_amount)}</Text>
                  <StatusBadge status={inv.status} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.empty, SHADOWS.card]}>
              <Ionicons name="receipt-outline" size={36} color={COLORS.border} />
              <Text style={styles.emptyText}>{loading ? 'Loading…' : 'No invoices yet'}</Text>
            </View>
          )}

          {data?.recent_invoices?.length > 0 && (
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('Invoices')}
            >
              <Text style={styles.viewAllText}>View All Invoices</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.navy} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { flex: 1, backgroundColor: COLORS.lightGray },
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { color: '#A8C4E0', fontSize: 13 },
  facilityName: { color: COLORS.white, fontSize: 20, fontWeight: '700', marginTop: 2, maxWidth: 260 },
  content: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    width: '47.5%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.navy, marginBottom: 2 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.navy, marginBottom: 10 },
  invoiceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceLeft: { flex: 1 },
  invoiceNum: { fontSize: 14, fontWeight: '600', color: COLORS.navy },
  invoiceDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  invoiceRight: { alignItems: 'flex-end', gap: 4 },
  invoiceAmount: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  empty: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  viewAllText: { color: COLORS.navy, fontSize: 14, fontWeight: '600' },
});

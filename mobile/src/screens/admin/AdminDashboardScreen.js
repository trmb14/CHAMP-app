import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePending } from '../../context/PendingContext';
import { dashboardAPI } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import { SkeletonDashboard } from '../../components/common/SkeletonLoader';
import { COLORS, SHADOWS } from '../../utils/colors';
import { formatCurrency, formatDate } from '../../utils/formatting';

const CLIENT_DOT = {
  IS: '#E74C3C', SGH: '#2980B9', QW: '#27AE60', BR: '#D4AC0D', AL: '#8E44AD',
};

function computeNotifications(data) {
  const alerts = [];
  if (!data) return alerts;

  // Pay period closing in ≤2 days
  if (data.pay_period?.end_date) {
    const endDate = new Date(data.pay_period.end_date + 'T00:00:00');
    const daysLeft = Math.ceil((endDate - new Date()) / 86400000);
    if (daysLeft >= 0 && daysLeft <= 2) {
      alerts.push({ id: 'period', icon: 'time-outline', color: '#E67E22', text: `Pay period closes in ${daysLeft === 0 ? 'today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`}` });
    }
  }

  // Pending shifts older than 3 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);
  const oldPending = (data.recent_shifts || []).filter(s => s.status === 'pending' && new Date(s.shift_date) < cutoff);
  if (oldPending.length > 0) {
    alerts.push({ id: 'pending', icon: 'warning-outline', color: COLORS.error, text: `${oldPending.length} pending shift${oldPending.length > 1 ? 's' : ''} need approval` });
  }

  return alerts;
}

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  const { isDark, colors } = useTheme();
  const navigation = useNavigation();
  const { count: pendingCount } = usePending();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const d = await dashboardAPI.admin();
      setData(d);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
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

  if (loading && !data) return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.navy }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.navy }]}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name}>{user?.name?.split(' ')[0]} 👋</Text>
        </View>
      </View>
      <SkeletonDashboard />
    </SafeAreaView>
  );

  const stats = [
    { label: 'Shifts This Week', value: data?.shifts_this_week ?? 0, icon: 'calendar', color: colors.navy },
    { label: 'Pending Invoices', value: data?.pending_invoices ?? 0, icon: 'document-text', color: colors.warning },
    { label: 'Active Employees', value: data?.active_employees ?? 0, icon: 'people', color: colors.green },
    { label: 'Payroll Period', value: formatCurrency(data?.total_payroll_period), icon: 'cash', color: '#8E44AD' },
  ];

  const quickActions = [
    { label: 'Add Shift', icon: 'add-circle', color: colors.navy, onPress: () => navigation.navigate('Schedule', { screen: 'AddShift' }) },
    { label: 'Calendar', icon: 'calendar', color: colors.green, onPress: () => navigation.navigate('Schedule') },
    { label: 'Payroll', icon: 'cash', color: '#8E44AD', onPress: () => navigation.navigate('Finance', { screen: 'Payroll' }) },
    { label: 'Invoices', icon: 'document-text', color: colors.warning, onPress: () => navigation.navigate('Finance', { screen: 'Invoices' }) },
  ];

  const weekClients = data?.week_clients || [];
  const notifications = computeNotifications(data).filter(n => !dismissedAlerts.has(n.id));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.navy }]} edges={['top']}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.lightGray }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.navy }]}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.name}>{user?.name?.split(' ')[0]} 👋</Text>
          </View>
          <View style={styles.headerRight}>
            {/* Notification Bell */}
            <TouchableOpacity style={styles.bellBtn} onPress={() => {
              if (notifications.length === 0) {
                Alert.alert('Notifications', 'No new notifications.');
              } else {
                Alert.alert('Notifications', notifications.map(n => n.text).join('\n\n'));
              }
            }}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
              {notifications.length > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{notifications.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: logout },
            ])}>
              <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending approvals banner */}
        {pendingCount > 0 && (
          <TouchableOpacity
            style={styles.pendingBanner}
            onPress={() => navigation.navigate('People')}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add-outline" size={16} color="#fff" />
            <Text style={styles.pendingBannerText}>
              {pendingCount} pending account{pendingCount > 1 ? 's' : ''} awaiting approval
            </Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}

        {/* Notification banners */}
        {notifications.map(notif => (
          <View key={notif.id} style={[styles.notifBanner, { backgroundColor: notif.color + '20', borderLeftColor: notif.color }]}>
            <Ionicons name={notif.icon} size={16} color={notif.color} />
            <Text style={[styles.notifText, { color: notif.color }]}>{notif.text}</Text>
            <TouchableOpacity onPress={() => setDismissedAlerts(prev => new Set([...prev, notif.id]))}>
              <Ionicons name="close" size={16} color={notif.color} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Pay period banner */}
        {data?.pay_period && (
          <View style={[styles.periodBanner, { backgroundColor: isDark ? '#152A3D' : COLORS.lightBlue }]}>
            <Ionicons name="time-outline" size={14} color={colors.navy} />
            <Text style={[styles.periodText, { color: colors.navy }]}>
              Pay Period: {formatDate(data.pay_period.start_date, 'MMM d')} – {formatDate(data.pay_period.end_date, 'MMM d, yyyy')}
            </Text>
          </View>
        )}

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: colors.card || colors.white }, SHADOWS.card]}>
                <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                  <Ionicons name={stat.icon} size={22} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.actionBtn, {
                  borderColor: action.color + '40',
                  backgroundColor: isDark ? colors.card : action.color + '08',
                }]}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon} size={22} color={COLORS.white} />
                </View>
                <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* This Week at a Glance */}
          {weekClients.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week at a Glance</Text>
              {weekClients.map((client) => {
                const bg = isDark
                  ? colors.clients?.[client.abbreviation] || colors.card
                  : COLORS.clients?.[client.abbreviation] || COLORS.lightBlue;
                const dotColor = CLIENT_DOT[client.abbreviation] || colors.navy;
                return (
                  <View key={client.abbreviation} style={[styles.glanceCard, { backgroundColor: bg }, SHADOWS.card]}>
                    <View style={[styles.glanceDot, { backgroundColor: dotColor }]} />
                    <View style={styles.glanceInfo}>
                      <Text style={[styles.glanceName, { color: colors.text }]}>{client.name}</Text>
                      <Text style={[styles.glanceDetail, { color: colors.textSecondary }]}>
                        {client.positions.join(', ')}
                      </Text>
                    </View>
                    <View style={[styles.glanceBadge, { backgroundColor: dotColor }]}>
                      <Text style={styles.glanceCount}>{client.count}</Text>
                      <Text style={styles.glanceCountLabel}>shifts</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* Recent Shifts */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Shifts</Text>
          {data?.recent_shifts?.length > 0 ? (
            data.recent_shifts.map((shift) => {
              const borderColor = CLIENT_DOT[shift.client_abbreviation] || colors.navy;
              return (
                <View key={shift.id} style={[styles.activityCard, {
                  backgroundColor: colors.card || colors.white,
                  borderLeftColor: borderColor,
                }, SHADOWS.card]}>
                  <View style={styles.activityRow}>
                    <View style={styles.activityLeft}>
                      <Text style={[styles.activityEmployee, { color: colors.text }]}>{shift.employee_name}</Text>
                      <Text style={[styles.activityDetail, { color: colors.textSecondary }]}>
                        {shift.client_name} • {shift.position} • {formatDate(shift.shift_date, 'MMM d')}
                      </Text>
                    </View>
                    <StatusBadge status={shift.status} />
                  </View>
                </View>
              );
            })
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card || colors.white }, SHADOWS.card]}>
              <Ionicons name="calendar-outline" size={32} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent shifts</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { color: '#A8C4E0', fontSize: 14 },
  name: { color: COLORS.white, fontSize: 24, fontWeight: '700', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bellBtn: { position: 'relative', padding: 2 },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '800' },
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderLeftWidth: 3,
    gap: 8,
  },
  notifText: { flex: 1, fontSize: 13, fontWeight: '500' },
  periodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  periodText: { fontSize: 13, fontWeight: '500' },
  content: { padding: 16 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '47.5%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 12, fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    width: '47.5%',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: { fontSize: 13, fontWeight: '600' },
  glanceCard: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  glanceDot: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  glanceInfo: { flex: 1 },
  glanceName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  glanceDetail: { fontSize: 12 },
  glanceBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 44,
  },
  glanceCount: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  glanceCountLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '600' },
  activityCard: {
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 8,
  },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityLeft: { flex: 1, marginRight: 8 },
  activityEmployee: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  activityDetail: { fontSize: 12 },
  emptyCard: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  emptyText: { fontSize: 14 },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E67E22',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  pendingBannerText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
});

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { dashboardAPI, shiftsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SHADOWS } from '../../utils/colors';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatting';
import Card from '../../components/common/Card';
import LoadingScreen from '../../components/common/LoadingScreen';

const CLIENT_COLORS = {
  IS: '#FCE4D6', SGH: '#DDEBF7', QW: '#E2EFDA', BR: '#FFF2CC', AL: '#EDE7F6',
};
const CLIENT_DOT = {
  IS: '#E74C3C', SGH: '#2980B9', QW: '#27AE60', BR: '#D4AC0D', AL: '#8E44AD',
};

export default function EmployeeDashboardScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [data, setData] = useState(null);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [claimingId, setClaimingId] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => { load(); }, []));

  async function scheduleShiftReminders(shifts) {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;

      // Cancel existing shift reminders
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const n of scheduled) {
        if (n.content.data?.type === 'shift_reminder') {
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
      }

      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      for (const shift of shifts) {
        if (shift.shift_date !== today && shift.shift_date !== tomorrow) continue;
        const triggerDate = new Date(shift.shift_date + 'T08:00:00');
        if (triggerDate <= new Date()) continue;

        const [h, m] = (shift.time_in || '07:00').split(':');
        const ampm = parseInt(h) >= 12 ? 'PM' : 'AM';
        const h12 = parseInt(h) % 12 || 12;
        const timeStr = `${h12}:${m} ${ampm}`;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Shift Reminder — CHAMP',
            body: `You have a ${shift.position} shift at ${shift.client_name} at ${timeStr}`,
            data: { type: 'shift_reminder', shiftId: shift.id },
          },
          trigger: triggerDate,
        }).catch(() => {});
      }
    } catch { /* silent on simulator */ }
  }

  async function load() {
    try {
      const [d, avail] = await Promise.all([
        dashboardAPI.employee(),
        shiftsAPI.available().catch(() => []),
      ]);
      setData(d);
      setAvailableShifts(Array.isArray(avail) ? avail : []);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      if (d?.upcoming_shifts?.length) scheduleShiftReminders(d.upcoming_shifts);
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

  async function handleConfirm(shiftId) {
    setConfirmingId(shiftId);
    try {
      await shiftsAPI.confirm(shiftId);
      await load();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleClaim(shift) {
    Alert.alert(
      'Claim This Shift',
      `${shift.client_name} — ${shift.position}\n${formatDate(shift.shift_date, 'EEE, MMM d')}\n${formatTime(shift.time_in)} – ${formatTime(shift.time_out)}\n\nSend a claim request to the administrator?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim', onPress: async () => {
            setClaimingId(shift.id);
            try {
              const result = await shiftsAPI.claim(shift.id);
              Alert.alert('Request Sent', result.message || 'Your claim request has been sent to the administrator.');
              load();
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setClaimingId(null);
            }
          }
        },
      ]
    );
  }

  if (loading && !data) return <LoadingScreen />;

  const upcomingShifts = data?.upcoming_shifts || [];
  const latestPaystub = data?.latest_paystub;

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
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{user?.name?.split(' ')[0]} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
          ])}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Stats banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.position}</Text>
            <Text style={styles.statLabel}>Position</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{parseFloat(data?.period_hours || 0).toFixed(1)}</Text>
            <Text style={styles.statLabel}>Period Hours</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(user?.pay_rate)}</Text>
            <Text style={styles.statLabel}>Pay Rate/hr</Text>
          </View>
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Upcoming shifts */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Schedule</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Schedule')}>
              <Text style={styles.sectionLink}>View all</Text>
            </TouchableOpacity>
          </View>

          {upcomingShifts.length > 0 ? (
            upcomingShifts.slice(0, 3).map((shift) => (
              <ShiftPreviewCard
                key={shift.id}
                shift={shift}
                onConfirm={handleConfirm}
                confirming={confirmingId === shift.id}
              />
            ))
          ) : (
            <Card padding={20} style={{ alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={32} color={COLORS.border} />
              <Text style={styles.emptyText}>No upcoming shifts scheduled</Text>
            </Card>
          )}

          {/* Available Shifts */}
          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <Text style={styles.sectionTitle}>Available Shifts</Text>
            {availableShifts.length > 0 && (
              <Text style={styles.sectionBadge}>{availableShifts.length} open</Text>
            )}
          </View>

          {availableShifts.length > 0 ? (
            availableShifts.map(shift => (
              <AvailableShiftCard
                key={shift.id}
                shift={shift}
                onClaim={handleClaim}
                claiming={claimingId === shift.id}
              />
            ))
          ) : (
            <Card padding={20} style={{ alignItems: 'center' }}>
              <Ionicons name="briefcase-outline" size={28} color={COLORS.border} />
              <Text style={styles.emptyText}>No open shifts this week</Text>
            </Card>
          )}

          {/* Latest Paystub */}
          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <Text style={styles.sectionTitle}>Latest Paystub</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Paystubs')}>
              <Text style={styles.sectionLink}>View all</Text>
            </TouchableOpacity>
          </View>

          {latestPaystub ? (
            <Card
              padding={16}
              onPress={() => navigation.navigate('Paystubs', {
                screen: 'PDFViewer',
                params: { url: latestPaystub.pdf_url, title: 'Paystub' }
              })}
            >
              <View style={styles.paystubRow}>
                <View style={styles.paystubIcon}>
                  <Ionicons name="document-text" size={28} color={COLORS.navy} />
                </View>
                <View style={styles.paystubInfo}>
                  <Text style={styles.paystubPeriod}>
                    {formatDate(latestPaystub.start_date, 'MMM d')} – {formatDate(latestPaystub.end_date, 'MMM d, yyyy')}
                  </Text>
                  <Text style={styles.paystubNet}>Net Pay: {formatCurrency(latestPaystub.net_pay)}</Text>
                  <Text style={styles.paystubGross}>Gross: {formatCurrency(latestPaystub.gross_pay)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
              </View>
            </Card>
          ) : (
            <Card padding={20} style={{ alignItems: 'center' }}>
              <Text style={styles.emptyText}>No paystubs available yet</Text>
            </Card>
          )}

          {/* Pay period info */}
          {data?.pay_period && (
            <View style={styles.periodInfo}>
              <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.periodText}>
                Current period: {formatDate(data.pay_period.start_date, 'MMM d')} – {formatDate(data.pay_period.end_date, 'MMM d, yyyy')}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ShiftPreviewCard({ shift, onConfirm, confirming }) {
  const abbrev = shift.abbreviation || shift.client_abbreviation;
  const bgColor = CLIENT_COLORS[abbrev] || COLORS.lightBlue;
  const dotColor = CLIENT_DOT[abbrev] || COLORS.navy;
  const isToday = shift.shift_date === new Date().toISOString().split('T')[0];
  const isTomorrow = shift.shift_date === new Date(Date.now() + 86400000).toISOString().split('T')[0];

  let dayLabel = formatDate(shift.shift_date, 'EEE, MMM d');
  if (isToday) dayLabel = 'Today';
  if (isTomorrow) dayLabel = 'Tomorrow';

  return (
    <View style={[styles.shiftCard, { borderLeftColor: dotColor }, isToday && styles.shiftCardToday]}>
      <View style={[styles.shiftColor, { backgroundColor: bgColor }]}>
        <Text style={styles.shiftAbbrev}>{abbrev}</Text>
      </View>
      <View style={styles.shiftInfo}>
        <View style={styles.shiftRow}>
          <Text style={styles.shiftDay}>{dayLabel}</Text>
          {isToday && <View style={styles.todayBadge}><Text style={styles.todayText}>TODAY</Text></View>}
        </View>
        <Text style={styles.shiftClient}>{shift.client_name}</Text>
        <Text style={styles.shiftTime}>
          {formatTime(shift.time_in)} – {formatTime(shift.time_out)}
          {'  •  '}{shift.position}
        </Text>
        {!shift.confirmed ? (
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => onConfirm(shift.id)}
            disabled={confirming}
          >
            <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.green} />
            <Text style={styles.confirmText}>{confirming ? 'Confirming…' : 'Confirm shift'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.confirmedBadge}>
            <Ionicons name="checkmark-circle" size={13} color={COLORS.green} />
            <Text style={styles.confirmedText}>Confirmed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function AvailableShiftCard({ shift, onClaim, claiming }) {
  const abbrev = shift.client_abbreviation;
  const bgColor = CLIENT_COLORS[abbrev] || '#F0F4FF';
  const dotColor = CLIENT_DOT[abbrev] || COLORS.navy;
  const hours = parseFloat(shift.payroll_hours || shift.invoice_hours || 0).toFixed(1);
  const isToday = shift.shift_date === new Date().toISOString().split('T')[0];

  return (
    <View style={[styles.availCard, { borderLeftColor: dotColor }]}>
      <View style={[styles.shiftColor, { backgroundColor: bgColor }]}>
        <Text style={styles.shiftAbbrev}>{abbrev}</Text>
      </View>
      <View style={styles.shiftInfo}>
        <Text style={styles.shiftClient}>{shift.client_name}</Text>
        <Text style={styles.shiftDay}>
          {isToday ? 'Today' : formatDate(shift.shift_date, 'EEE, MMM d')}
          {'  ·  '}{shift.position}
        </Text>
        <Text style={styles.shiftTime}>
          {formatTime(shift.time_in)} – {formatTime(shift.time_out)}{'  ·  '}{hours} hrs
        </Text>
        <TouchableOpacity
          style={[styles.claimBtn, claiming && styles.claimBtnDisabled]}
          onPress={() => onClaim(shift)}
          disabled={claiming}
          activeOpacity={0.75}
        >
          <Ionicons name="hand-left-outline" size={13} color={COLORS.white} />
          <Text style={styles.claimText}>{claiming ? 'Sending…' : 'Claim This Shift'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { flex: 1, backgroundColor: COLORS.lightGray },
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { color: '#A8C4E0', fontSize: 14 },
  name: { color: COLORS.white, fontSize: 24, fontWeight: '700', marginTop: 2 },
  statsBanner: {
    backgroundColor: 'rgba(31,78,121,0.9)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  statItem: { alignItems: 'center' },
  statValue: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  statLabel: { color: '#A8C4E0', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  content: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sectionLink: { color: COLORS.navy, fontSize: 13, fontWeight: '600' },
  shiftCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    ...SHADOWS.card,
  },
  shiftCardToday: { borderWidth: 2, borderColor: COLORS.green },
  shiftColor: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  shiftAbbrev: { fontSize: 13, fontWeight: '800', color: COLORS.navy },
  shiftInfo: { flex: 1 },
  shiftRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  shiftDay: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  todayBadge: { backgroundColor: COLORS.green, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  todayText: { color: COLORS.white, fontSize: 9, fontWeight: '700' },
  shiftClient: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 },
  shiftTime: { fontSize: 12, color: COLORS.navy, fontWeight: '500', marginBottom: 4 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.green + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confirmText: { fontSize: 12, color: COLORS.green, fontWeight: '600' },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  confirmedText: { fontSize: 12, color: COLORS.green, fontWeight: '500' },
  paystubRow: { flexDirection: 'row', alignItems: 'center' },
  paystubIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paystubInfo: { flex: 1 },
  paystubPeriod: { fontSize: 13, color: COLORS.textSecondary },
  paystubNet: { fontSize: 17, fontWeight: '700', color: COLORS.navy, marginTop: 2 },
  paystubGross: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, marginTop: 8 },
  periodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingBottom: 20,
  },
  periodText: { color: COLORS.textSecondary, fontSize: 12 },
  sectionBadge: {
    backgroundColor: COLORS.navy,
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  availCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    ...SHADOWS.card,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.navy,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    marginTop: 6,
  },
  claimBtnDisabled: { backgroundColor: COLORS.border },
  claimText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
});

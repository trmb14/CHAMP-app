import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { shiftsAPI, shiftRequestsAPI } from '../../services/api';
import { COLORS, SHADOWS } from '../../utils/colors';
import { formatDate, formatTime } from '../../utils/formatting';

const POSITIONS = ['PSW', 'UCP'];

const STATUS_COLORS = {
  pending:   { bg: '#FEF3C7', text: '#B45309' },
  approved:  { bg: '#D1FAE5', text: '#065F46' },
  confirmed: { bg: '#DBEAFE', text: '#1E40AF' },
  invoiced:  { bg: '#EDE9FE', text: '#5B21B6' },
};

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || { bg: COLORS.lightGray, text: COLORS.textSecondary };
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.text }]}>{status}</Text>
    </View>
  );
}

const EMPTY_FORM = { requested_date: '', time_in: '', time_out: '', position: 'PSW', notes: '' };

export default function ClientScheduleScreen() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      const data = await shiftsAPI.clientSchedule();
      setShifts(Array.isArray(data) ? data : []);
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

  function openModal() {
    setForm(EMPTY_FORM);
    setModalVisible(true);
  }

  async function handleSubmit() {
    if (!form.requested_date.trim()) {
      Alert.alert('Required', 'Please enter a date (YYYY-MM-DD).');
      return;
    }
    setSubmitting(true);
    try {
      await shiftRequestsAPI.create(form);
      setModalVisible(false);
      Alert.alert('Sent!', 'Your shift request has been submitted to CHAMP.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function renderShift({ item, index }) {
    const prevDate = index > 0 ? shifts[index - 1].shift_date : null;
    const showDateHeader = item.shift_date !== prevDate;
    return (
      <>
        {showDateHeader && (
          <Text style={styles.dateHeader}>
            {formatDate(item.shift_date, 'EEEE, MMM d')}
          </Text>
        )}
        <View style={[styles.shiftCard, SHADOWS.card]}>
          <View style={[styles.positionBadge, item.position === 'PSW' ? styles.pswBadge : styles.ucpBadge]}>
            <Text style={styles.positionText}>{item.position}</Text>
          </View>
          <View style={styles.shiftInfo}>
            <Text style={styles.shiftTime}>
              {formatTime(item.time_in)} – {formatTime(item.time_out)}
            </Text>
            <Text style={styles.employeeName}>{item.employee_name}</Text>
          </View>
          <StatusPill status={item.status} />
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Schedule</Text>
          <Text style={styles.subtitle}>Upcoming assigned shifts</Text>
        </View>
        <TouchableOpacity style={styles.requestBtn} onPress={openModal} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
          <Text style={styles.requestBtnText}>Request</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={shifts}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.navy} />}
        renderItem={renderShift}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyTitle}>{loading ? 'Loading…' : 'No upcoming shifts'}</Text>
            <Text style={styles.emptyBody}>
              {loading ? '' : 'No confirmed shifts are scheduled at your facility.'}
            </Text>
          </View>
        }
      />

      {/* Request a Shift Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request a Shift</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            {/* Date */}
            <Text style={styles.fieldLabel}>Date Needed <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={form.requested_date}
              onChangeText={v => setForm(f => ({ ...f, requested_date: v }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numbers-and-punctuation"
            />

            {/* Time In */}
            <Text style={styles.fieldLabel}>Start Time</Text>
            <TextInput
              style={styles.input}
              value={form.time_in}
              onChangeText={v => setForm(f => ({ ...f, time_in: v }))}
              placeholder="e.g. 07:00"
              placeholderTextColor={COLORS.textSecondary}
            />

            {/* Time Out */}
            <Text style={styles.fieldLabel}>End Time</Text>
            <TextInput
              style={styles.input}
              value={form.time_out}
              onChangeText={v => setForm(f => ({ ...f, time_out: v }))}
              placeholder="e.g. 15:00"
              placeholderTextColor={COLORS.textSecondary}
            />

            {/* Position */}
            <Text style={styles.fieldLabel}>Role Needed <Text style={styles.req}>*</Text></Text>
            <View style={styles.positionRow}>
              {POSITIONS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.positionOption, form.position === p && styles.positionOptionActive]}
                  onPress={() => setForm(f => ({ ...f, position: p }))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.positionOptionText, form.position === p && styles.positionOptionTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.notes}
              onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              placeholder="Any additional details or instructions…"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Text style={styles.submitBtnText}>Submit Request</Text>
              }
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: { color: COLORS.white, fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#A8C4E0', fontSize: 12, marginTop: 2 },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  requestBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, backgroundColor: COLORS.lightGray, flexGrow: 1 },
  dateHeader: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  shiftCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  positionBadge: {
    width: 46,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pswBadge: { backgroundColor: '#EFF6FF' },
  ucpBadge: { backgroundColor: '#F0FDF4' },
  positionText: { fontSize: 12, fontWeight: '800', color: COLORS.navy },
  shiftInfo: { flex: 1 },
  shiftTime: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  employeeName: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.navy },
  emptyBody: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  // Modal
  modalSafe: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.navy },
  closeBtn: { padding: 4 },
  modalScroll: { flex: 1, paddingHorizontal: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.navy, marginTop: 20, marginBottom: 6 },
  req: { color: COLORS.error },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  positionRow: { flexDirection: 'row', gap: 10 },
  positionOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  positionOptionActive: { borderColor: COLORS.navy, backgroundColor: COLORS.navy },
  positionOptionText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  positionOptionTextActive: { color: COLORS.white },
  submitBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});

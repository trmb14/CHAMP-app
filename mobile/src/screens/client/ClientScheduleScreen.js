import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { shiftsAPI, shiftRequestsAPI } from '../../services/api';
import { COLORS, SHADOWS } from '../../utils/colors';
import { formatDate, formatTime } from '../../utils/formatting';

const POSITIONS = ['PSW', 'UCP', 'RPN', 'RN', 'HCA', 'Companion Care'];

const STATUS_COLORS = {
  pending:   { bg: '#FEF3C7', text: '#B45309' },
  approved:  { bg: '#D1FAE5', text: '#065F46' },
  confirmed: { bg: '#DBEAFE', text: '#1E40AF' },
  invoiced:  { bg: '#EDE9FE', text: '#5B21B6' },
  fulfilled: { bg: '#D1FAE5', text: '#065F46' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || { bg: COLORS.lightGray, text: COLORS.textSecondary };
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.text }]}>{status}</Text>
    </View>
  );
}

function makeTomorrow() {
  const d = new Date(); d.setDate(d.getDate() + 1); return d;
}
function makeHour(h) {
  const d = new Date(); d.setHours(h, 0, 0, 0); return d;
}
function pad(n) { return String(n).padStart(2, '0'); }
const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDateDisplay(d) {
  return `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function fmtTimeDisplay(d) {
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${pad(m)} ${ampm}`;
}

export default function ClientScheduleScreen() {
  const [shifts, setShifts]     = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  // Form state
  const [position, setPosition]     = useState('PSW');
  const [notes, setNotes]           = useState('');
  const [dateObj, setDateObj]       = useState(makeTomorrow);
  const [timeInObj, setTimeInObj]   = useState(() => makeHour(7));
  const [timeOutObj, setTimeOutObj] = useState(() => makeHour(15));
  const [showDatePicker, setShowDatePicker]       = useState(false);
  const [showTimeInPicker, setShowTimeInPicker]   = useState(false);
  const [showTimeOutPicker, setShowTimeOutPicker] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const [shiftsRes, requestsRes] = await Promise.allSettled([
      shiftsAPI.clientSchedule(),
      shiftRequestsAPI.list(),
    ]);
    if (shiftsRes.status === 'fulfilled') setShifts(Array.isArray(shiftsRes.value) ? shiftsRes.value : []);
    if (requestsRes.status === 'fulfilled') setRequests(Array.isArray(requestsRes.value) ? requestsRes.value : []);
    setLoading(false);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  function openModal() {
    setDateObj(makeTomorrow());
    setTimeInObj(makeHour(7));
    setTimeOutObj(makeHour(15));
    setPosition('PSW');
    setNotes('');
    setShowDatePicker(false);
    setShowTimeInPicker(false);
    setShowTimeOutPicker(false);
    setModalVisible(true);
  }

  function togglePicker(which) {
    setShowDatePicker(which === 'date' ? v => !v : false);
    setShowTimeInPicker(which === 'timeIn' ? v => !v : false);
    setShowTimeOutPicker(which === 'timeOut' ? v => !v : false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await shiftRequestsAPI.create({
        requested_date: dateObj.toISOString().split('T')[0],
        time_in:  `${pad(timeInObj.getHours())}:${pad(timeInObj.getMinutes())}`,
        time_out: `${pad(timeOutObj.getHours())}:${pad(timeOutObj.getMinutes())}`,
        position,
        notes,
      });
      setModalVisible(false);
      await load();
      Alert.alert('Sent!', 'Your shift request has been submitted to CHAMP.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const isEmpty = !loading && shifts.length === 0 && requests.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Schedule</Text>
          <Text style={styles.subtitle}>Shifts & requests</Text>
        </View>
        <TouchableOpacity style={styles.requestBtn} onPress={openModal} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
          <Text style={styles.requestBtnText}>Request</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isEmpty && styles.scrollContentCenter]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.navy} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.navy} style={{ marginTop: 60 }} />
        ) : isEmpty ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Nothing scheduled yet</Text>
            <Text style={styles.emptyBody}>Tap Request to submit a shift request to CHAMP.</Text>
          </View>
        ) : (
          <>
            {/* ── Upcoming Shifts ── */}
            <View style={styles.sectionRow}>
              <Ionicons name="checkmark-circle-outline" size={15} color={COLORS.navy} />
              <Text style={styles.sectionLabel}>UPCOMING SHIFTS</Text>
            </View>
            {shifts.length === 0 ? (
              <Text style={styles.sectionEmpty}>No confirmed shifts scheduled.</Text>
            ) : (
              shifts.map((item, index) => {
                const prevDate = index > 0 ? shifts[index - 1].shift_date : null;
                const showDate = item.shift_date !== prevDate;
                return (
                  <View key={item.id}>
                    {showDate && (
                      <Text style={styles.dateHeader}>{formatDate(item.shift_date, 'EEEE, MMM d')}</Text>
                    )}
                    <View style={[styles.shiftCard, SHADOWS.card]}>
                      <View style={[styles.posBadge, styles.posBadgeShift]}>
                        <Text style={styles.posBadgeText}>{item.position.length > 3 ? item.position.slice(0,3) : item.position}</Text>
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle}>{formatTime(item.time_in)} – {formatTime(item.time_out)}</Text>
                        <Text style={styles.cardSub}>{item.employee_name}</Text>
                      </View>
                      <StatusPill status={item.status} />
                    </View>
                  </View>
                );
              })
            )}

            {/* ── Your Requests ── */}
            <View style={[styles.sectionRow, { marginTop: 24 }]}>
              <Ionicons name="time-outline" size={15} color="#B45309" />
              <Text style={[styles.sectionLabel, { color: '#B45309' }]}>YOUR REQUESTS</Text>
            </View>
            {requests.length === 0 ? (
              <Text style={styles.sectionEmpty}>No pending requests.</Text>
            ) : (
              requests.map(item => {
                const timeStr = item.time_in && item.time_out
                  ? `${formatTime(item.time_in)} – ${formatTime(item.time_out)}`
                  : 'Time TBD';
                return (
                  <View key={item.id} style={[styles.requestCard, SHADOWS.card]}>
                    <View style={[styles.posBadge, styles.posBadgeRequest]}>
                      <Text style={styles.posBadgeText}>{item.position.length > 3 ? item.position.slice(0,3) : item.position}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{formatDate(item.requested_date, 'EEEE, MMM d')}</Text>
                      <Text style={styles.cardSub}>{timeStr} · {item.position}</Text>
                      {!!item.notes && <Text style={styles.cardNotes} numberOfLines={1}>{item.notes}</Text>}
                    </View>
                    <StatusPill status={item.status} />
                  </View>
                );
              })
            )}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Request a Shift Modal ── */}
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
            <TouchableOpacity style={styles.pickerRow} onPress={() => togglePicker('date')} activeOpacity={0.8}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.navy} />
              <Text style={styles.pickerRowText}>{fmtDateDisplay(dateObj)}</Text>
              <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
            {showDatePicker && (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={dateObj} mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()} textColor="#111111"
                  onChange={(_, d) => { if (Platform.OS === 'android') setShowDatePicker(false); if (d) setDateObj(d); }}
                  style={styles.picker}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Start Time */}
            <Text style={styles.fieldLabel}>Start Time</Text>
            <TouchableOpacity style={styles.pickerRow} onPress={() => togglePicker('timeIn')} activeOpacity={0.8}>
              <Ionicons name="time-outline" size={18} color={COLORS.navy} />
              <Text style={styles.pickerRowText}>{fmtTimeDisplay(timeInObj)}</Text>
              <Ionicons name={showTimeInPicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
            {showTimeInPicker && (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={timeInObj} mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minuteInterval={15} textColor="#111111"
                  onChange={(_, t) => { if (Platform.OS === 'android') setShowTimeInPicker(false); if (t) setTimeInObj(t); }}
                  style={styles.picker}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowTimeInPicker(false)}>
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* End Time */}
            <Text style={styles.fieldLabel}>End Time</Text>
            <TouchableOpacity style={styles.pickerRow} onPress={() => togglePicker('timeOut')} activeOpacity={0.8}>
              <Ionicons name="time-outline" size={18} color={COLORS.navy} />
              <Text style={styles.pickerRowText}>{fmtTimeDisplay(timeOutObj)}</Text>
              <Ionicons name={showTimeOutPicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
            {showTimeOutPicker && (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={timeOutObj} mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minuteInterval={15} textColor="#111111"
                  onChange={(_, t) => { if (Platform.OS === 'android') setShowTimeOutPicker(false); if (t) setTimeOutObj(t); }}
                  style={styles.picker}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowTimeOutPicker(false)}>
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Position */}
            <Text style={styles.fieldLabel}>Role Needed <Text style={styles.req}>*</Text></Text>
            <View style={styles.positionRow}>
              {POSITIONS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.positionOption, position === p && styles.positionOptionActive]}
                  onPress={() => setPosition(p)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.positionOptionText, position === p && styles.positionOptionTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
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
  scroll: { flex: 1, backgroundColor: COLORS.lightGray },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  scrollContentCenter: { flexGrow: 1, justifyContent: 'center' },
  // Section headers
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.navy, letterSpacing: 0.8 },
  sectionEmpty: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4, paddingLeft: 2 },
  // Date sub-header within shifts
  dateHeader: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 10 },
  // Confirmed shift card
  shiftCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Request card — amber left border
  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  // Shared badge
  posBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posBadgeShift:   { backgroundColor: '#EFF6FF' },
  posBadgeRequest: { backgroundColor: '#FEF3C7' },
  posBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.navy, textAlign: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  cardSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardNotes: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontStyle: 'italic' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
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
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerRowText: { flex: 1, fontSize: 15, color: '#111111', fontWeight: '600' },
  pickerWrap: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  picker: { height: 150 },
  pickerDoneBtn: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pickerDoneText: { color: COLORS.navy, fontSize: 15, fontWeight: '700' },
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
  positionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  positionOption: {
    width: '31%',
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionOptionActive: { borderColor: COLORS.navy, backgroundColor: COLORS.navy },
  positionOptionText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
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

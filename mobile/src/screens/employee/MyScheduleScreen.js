import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { shiftsAPI } from '../../services/api';
import { COLORS } from '../../utils/colors';
import { formatDate, formatTime } from '../../utils/formatting';
import ScreenHeader from '../../components/common/ScreenHeader';

const CLIENT_COLORS = {
  IS: '#FCE4D6', SGH: '#DDEBF7', QW: '#E2EFDA', BR: '#FFF2CC', AL: '#EDE7F6',
};
const CLIENT_DOT_COLORS = {
  IS: '#E74C3C', SGH: '#2980B9', QW: '#27AE60', BR: '#D4AC0D', AL: '#8E44AD',
};

export default function MyScheduleScreen() {
  const [shifts, setShifts] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

  useFocusEffect(useCallback(() => { load(); }, [currentMonth]));

  async function load() {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const data = await shiftsAPI.list({ year, month });
      setShifts(data);
      buildMarkedDates(data, selectedDate);
    } catch (err) { Alert.alert('Error', err.message); }
  }

  function buildMarkedDates(allShifts, selDate) {
    const marks = {};
    for (const s of allShifts) {
      if (!marks[s.shift_date]) marks[s.shift_date] = { dots: [] };
      const dotColor = CLIENT_DOT_COLORS[s.client_abbreviation] || COLORS.navy;
      if (marks[s.shift_date].dots.length < 3) {
        marks[s.shift_date].dots.push({ color: dotColor, key: s.id });
      }
    }
    marks[selDate] = { ...(marks[selDate] || {}), selected: true, selectedColor: COLORS.navy };
    setMarkedDates(marks);
  }

  function onDayPress(day) {
    setSelectedDate(day.dateString);
    buildMarkedDates(shifts, day.dateString);
  }

  async function handleConfirm(shiftId) {
    setConfirmingId(shiftId);
    try {
      await shiftsAPI.confirm(shiftId);
      // Update local state
      setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, confirmed: true } : s));
      setSelectedShift(prev => prev?.id === shiftId ? { ...prev, confirmed: true } : prev);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setConfirmingId(null);
    }
  }

  const dayShifts = shifts.filter(s => s.shift_date === selectedDate);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [currentMonth]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="My Schedule" />

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.navy} />}
        showsVerticalScrollIndicator={false}
      >
        <Calendar
          onDayPress={onDayPress}
          markedDates={markedDates}
          markingType="multi-dot"
          onMonthChange={(m) => setCurrentMonth(new Date(m.year, m.month - 1))}
          theme={{
            backgroundColor: COLORS.white,
            calendarBackground: COLORS.white,
            textSectionTitleColor: COLORS.navy,
            selectedDayBackgroundColor: COLORS.navy,
            selectedDayTextColor: COLORS.white,
            todayTextColor: COLORS.green,
            dayTextColor: COLORS.text,
            arrowColor: COLORS.navy,
            monthTextColor: COLORS.navy,
            textMonthFontWeight: '700',
          }}
          style={styles.calendar}
        />

        {/* Day details */}
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{formatDate(selectedDate, 'EEEE, MMMM d')}</Text>
        </View>

        {dayShifts.length > 0 ? (
          dayShifts.map(shift => (
            <TouchableOpacity
              key={shift.id}
              style={[styles.shiftCard, { borderLeftColor: CLIENT_DOT_COLORS[shift.client_abbreviation] || COLORS.navy }]}
              onPress={() => setSelectedShift(shift)}
              activeOpacity={0.8}
            >
              <View style={[styles.clientBadge, { backgroundColor: CLIENT_COLORS[shift.client_abbreviation] || COLORS.lightBlue }]}>
                <Text style={styles.clientAbbrev}>{shift.client_abbreviation}</Text>
              </View>
              <View style={styles.shiftInfo}>
                <Text style={styles.shiftClient}>{shift.client_name}</Text>
                <Text style={styles.shiftTime}>
                  {formatTime(shift.time_in)} – {formatTime(shift.time_out)}
                </Text>
                <Text style={styles.shiftPos}>{shift.position} • {parseFloat(shift.payroll_hours).toFixed(1)} hrs</Text>
                {shift.confirmed ? (
                  <View style={styles.confirmedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={COLORS.green} />
                    <Text style={styles.confirmedText}>Confirmed</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={() => handleConfirm(shift.id)}
                    disabled={confirmingId === shift.id}
                  >
                    <Ionicons name="checkmark-circle-outline" size={12} color={COLORS.green} />
                    <Text style={styles.confirmText}>
                      {confirmingId === shift.id ? 'Confirming…' : 'Confirm shift'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {shift.is_statutory_holiday && (
                <View style={styles.statutoryBadge}>
                  <Text style={styles.statutoryText}>Stat</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={36} color={COLORS.border} />
            <Text style={styles.emptyText}>No shifts on this day</Text>
          </View>
        )}
      </ScrollView>

      {/* Shift detail modal */}
      <Modal
        visible={!!selectedShift}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedShift(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedShift?.client_name}</Text>
              <TouchableOpacity onPress={() => setSelectedShift(null)}>
                <Ionicons name="close" size={24} color={COLORS.navy} />
              </TouchableOpacity>
            </View>

            {selectedShift && (
              <View style={styles.modalBody}>
                <DetailRow icon="location-outline" label="Address" value={selectedShift.client_address} />
                <DetailRow icon="briefcase-outline" label="Position" value={selectedShift.position} />
                <DetailRow icon="time-outline" label="Shift" value={`${formatTime(selectedShift.time_in)} – ${formatTime(selectedShift.time_out)}`} />
                <DetailRow icon="hourglass-outline" label="Hours" value={`${parseFloat(selectedShift.payroll_hours).toFixed(1)} hrs`} />
                {selectedShift.is_statutory_holiday && (
                  <View style={styles.statutoryNote}>
                    <Text style={styles.statutoryNoteText}>⚡ Statutory Holiday — 1.5x pay rate</Text>
                  </View>
                )}
                {selectedShift.notes && (
                  <DetailRow icon="document-text-outline" label="Notes" value={selectedShift.notes} />
                )}

                {/* Confirm button in modal */}
                {!selectedShift.confirmed ? (
                  <TouchableOpacity
                    style={styles.modalConfirmBtn}
                    onPress={() => handleConfirm(selectedShift.id)}
                    disabled={confirmingId === selectedShift.id}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
                    <Text style={styles.modalConfirmText}>
                      {confirmingId === selectedShift.id ? 'Confirming…' : 'Confirm I received this shift'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.modalConfirmedBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.green} />
                    <Text style={styles.modalConfirmedText}>Shift Confirmed</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={COLORS.navy} style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { flex: 1, backgroundColor: COLORS.lightGray },
  calendar: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dayHeader: { padding: 16, paddingBottom: 8 },
  dayTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  shiftCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  clientBadge: {
    width: 42,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  clientAbbrev: { fontSize: 12, fontWeight: '800', color: COLORS.navy },
  shiftInfo: { flex: 1 },
  shiftClient: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  shiftTime: { fontSize: 13, color: COLORS.navy, fontWeight: '500', marginTop: 2 },
  shiftPos: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1, marginBottom: 4 },
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
  confirmText: { fontSize: 11, color: COLORS.green, fontWeight: '600' },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  confirmedText: { fontSize: 11, color: COLORS.green, fontWeight: '500' },
  statutoryBadge: { backgroundColor: '#FFF2CC', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  statutoryText: { fontSize: 11, color: '#856404', fontWeight: '700' },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.navy },
  modalBody: { gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  detailValue: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  statutoryNote: {
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  statutoryNoteText: { color: '#856404', fontSize: 13, fontWeight: '600' },
  modalConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.green,
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 16,
  },
  modalConfirmText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  modalConfirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.green + '15',
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 16,
  },
  modalConfirmedText: { color: COLORS.green, fontSize: 15, fontWeight: '600' },
});

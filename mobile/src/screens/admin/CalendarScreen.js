import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { shiftsAPI } from '../../services/api';
import { COLORS } from '../../utils/colors';
import { formatDate, formatTime } from '../../utils/formatting';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingScreen from '../../components/common/LoadingScreen';

const CLIENT_COLORS = {
  IS: '#FCE4D6', SGH: '#DDEBF7', QW: '#E2EFDA', BR: '#FFF2CC', AL: '#EDE7F6',
};
const CLIENT_DOT_COLORS = {
  IS: '#E74C3C', SGH: '#2980B9', QW: '#27AE60', BR: '#D4AC0D', AL: '#8E44AD',
};

function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const wd = new Date(start);
    wd.setDate(start.getDate() + i);
    return wd.toISOString().split('T')[0];
  });
}

export default function CalendarScreen() {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [shifts, setShifts] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterClient, setFilterClient] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'

  useFocusEffect(useCallback(() => { load(); }, [currentMonth]));

  async function load() {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const data = await shiftsAPI.list({ year, month });
      setShifts(data);
      buildMarkedDates(data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  function buildMarkedDates(allShifts) {
    const marks = {};
    for (const s of allShifts) {
      if (!marks[s.shift_date]) marks[s.shift_date] = { dots: [] };
      const dotColor = CLIENT_DOT_COLORS[s.client_abbreviation] || COLORS.navy;
      if (marks[s.shift_date].dots.length < 4) {
        marks[s.shift_date].dots.push({ color: dotColor, key: s.id });
      }
    }
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: COLORS.navy,
    };
    setMarkedDates(marks);
  }

  function onDayPress(day) {
    setSelectedDate(day.dateString);
    const updated = { ...markedDates };
    Object.keys(updated).forEach(d => {
      if (updated[d].selected) updated[d] = { ...updated[d], selected: false };
    });
    updated[day.dateString] = {
      ...(updated[day.dateString] || {}),
      selected: true,
      selectedColor: COLORS.navy,
    };
    setMarkedDates(updated);
  }

  async function handleDeleteShift(id) {
    Alert.alert('Delete Shift', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await shiftsAPI.delete(id);
            load();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        }
      },
    ]);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [currentMonth]);

  const dayShifts = shifts.filter(s => s.shift_date === selectedDate);
  const filteredShifts = filterClient
    ? dayShifts.filter(s => s.client_abbreviation === filterClient)
    : dayShifts;

  // Week view: group by day
  const weekDates = getWeekDates(selectedDate);
  const weekShiftsByDay = weekDates.map(d => ({
    date: d,
    shifts: (filterClient
      ? shifts.filter(s => s.shift_date === d && s.client_abbreviation === filterClient)
      : shifts.filter(s => s.shift_date === d)
    ),
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
        <View style={styles.headerRight}>
          {/* View toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'month' && styles.toggleBtnActive]}
              onPress={() => setViewMode('month')}
            >
              <Ionicons name="calendar" size={16} color={viewMode === 'month' ? COLORS.white : '#A8C4E0'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'week' && styles.toggleBtnActive]}
              onPress={() => setViewMode('week')}
            >
              <Ionicons name="list" size={16} color={viewMode === 'week' ? COLORS.white : '#A8C4E0'} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddShift', { date: selectedDate })}
          >
            <Ionicons name="add" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.navy} />}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'month' && (
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
              textDisabledColor: COLORS.border,
              arrowColor: COLORS.navy,
              monthTextColor: COLORS.navy,
              textMonthFontWeight: '700',
              textDayFontSize: 14,
            }}
            style={styles.calendar}
          />
        )}

        {/* Legend */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legend}>
          {Object.entries(CLIENT_DOT_COLORS).map(([abbr, color]) => (
            <TouchableOpacity
              key={abbr}
              style={[styles.legendItem, filterClient === abbr && styles.legendActive]}
              onPress={() => setFilterClient(filterClient === abbr ? null : abbr)}
            >
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{abbr}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {viewMode === 'month' ? (
          <>
            <View style={styles.daySection}>
              <Text style={styles.dayTitle}>{formatDate(selectedDate, 'EEEE, MMMM d, yyyy')}</Text>
              <Text style={styles.dayCount}>{filteredShifts.length} shift{filteredShifts.length !== 1 ? 's' : ''}</Text>
            </View>

            {filteredShifts.length > 0 ? (
              filteredShifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  onEdit={() => navigation.navigate('AddShift', { shiftId: shift.id })}
                  onDelete={() => handleDeleteShift(shift.id)}
                />
              ))
            ) : (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={40} color={COLORS.border} />
                <Text style={styles.emptyText}>No shifts on this day</Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => navigation.navigate('AddShift', { date: selectedDate })}
                >
                  <Text style={styles.emptyAddText}>+ Add Shift</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          // Week view
          <>
            <View style={styles.daySection}>
              <Text style={styles.dayTitle}>
                Week of {formatDate(weekDates[0], 'MMM d')} – {formatDate(weekDates[6], 'MMM d, yyyy')}
              </Text>
              <Text style={styles.dayCount}>
                {weekShiftsByDay.reduce((a, d) => a + d.shifts.length, 0)} shifts
              </Text>
            </View>
            {weekShiftsByDay.map(({ date, shifts: ds }) => {
              const isToday = date === new Date().toISOString().split('T')[0];
              const isSelected = date === selectedDate;
              return (
                <View key={date}>
                  <TouchableOpacity
                    style={[styles.weekDayHeader, isSelected && styles.weekDayHeaderSelected]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.weekDayText, isSelected && styles.weekDayTextSelected]}>
                      {formatDate(date, 'EEE, MMM d')}
                    </Text>
                    {isToday && <View style={styles.todayDot} />}
                    <Text style={[styles.weekDayCount, isSelected && { color: COLORS.white }]}>
                      {ds.length > 0 ? `${ds.length} shift${ds.length !== 1 ? 's' : ''}` : '—'}
                    </Text>
                  </TouchableOpacity>
                  {ds.map(shift => (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      onEdit={() => navigation.navigate('AddShift', { shiftId: shift.id })}
                      onDelete={() => handleDeleteShift(shift.id)}
                    />
                  ))}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ShiftCard({ shift, onEdit, onDelete }) {
  const bgColor = CLIENT_COLORS[shift.client_abbreviation] || COLORS.lightBlue;
  const isStatutory = shift.is_statutory_holiday;

  return (
    <TouchableOpacity
      style={[styles.shiftCard, {
        borderLeftColor: CLIENT_DOT_COLORS[shift.client_abbreviation] || COLORS.navy,
        backgroundColor: isStatutory ? '#FFF9E6' : COLORS.white
      }]}
      onPress={onEdit}
      activeOpacity={0.8}
    >
      <View style={[styles.shiftClientBadge, { backgroundColor: bgColor }]}>
        <Text style={styles.shiftClientText}>{shift.client_abbreviation}</Text>
      </View>
      <View style={styles.shiftInfo}>
        <View style={styles.shiftRow}>
          <Text style={styles.shiftEmployee}>{shift.employee_name}</Text>
          <StatusBadge status={shift.status} />
        </View>
        <Text style={styles.shiftDetail}>
          {shift.client_name} • {shift.position}
        </Text>
        <Text style={styles.shiftTime}>
          {formatTime(shift.time_in)} – {formatTime(shift.time_out)}
          {'  '}{parseFloat(shift.payroll_hours).toFixed(1)} hrs
          {isStatutory && ' ⚡ Statutory'}
        </Text>
      </View>
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  header: {
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: { color: COLORS.white, fontSize: 22, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  toggleBtnActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  addBtn: {
    backgroundColor: COLORS.green,
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1, backgroundColor: COLORS.lightGray },
  calendar: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  legend: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    gap: 5,
  },
  legendActive: { backgroundColor: COLORS.lightBlue },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  daySection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  dayCount: { fontSize: 13, color: COLORS.textSecondary },
  weekDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  weekDayHeaderSelected: { backgroundColor: COLORS.navy },
  weekDayText: { fontSize: 13, fontWeight: '700', color: COLORS.text, flex: 1 },
  weekDayTextSelected: { color: COLORS.white },
  weekDayCount: { fontSize: 12, color: COLORS.textSecondary },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green },
  shiftCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  shiftClientBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shiftClientText: { fontSize: 11, fontWeight: '700', color: COLORS.navy },
  shiftInfo: { flex: 1 },
  shiftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  shiftEmployee: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  shiftDetail: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  shiftTime: { fontSize: 12, color: COLORS.navy, fontWeight: '500' },
  deleteBtn: { padding: 6, marginLeft: 4 },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
  emptyAddBtn: { marginTop: 8 },
  emptyAddText: { color: COLORS.navy, fontSize: 15, fontWeight: '600' },
});

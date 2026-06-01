import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Switch, Platform, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { shiftsAPI, usersAPI, clientsAPI } from '../../services/api';
import { COLORS } from '../../utils/colors';
import { POSITIONS, formatDate } from '../../utils/formatting';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ScreenHeader from '../../components/common/ScreenHeader';

const LAST_CLIENT_KEY = 'addshift_last_client_id';
const LAST_POSITION_KEY = 'addshift_last_position';
const DRAFT_KEY = 'champ_shift_draft';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export default function AddShiftScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { date, shiftId } = route.params || {};
  const isEdit = !!shiftId;

  const [form, setForm] = useState({
    employee_id: '',
    client_id: '',
    shift_date: date || new Date().toISOString().split('T')[0],
    time_in: '07:00',
    time_out: '15:00',
    position: 'PSW',
    notes: '',
    is_statutory_holiday: false,
    status: 'pending',
  });

  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(null);
  const [calculatedHours, setCalculatedHours] = useState({ payroll: 0, invoice: 0 });
  const [draftBanner, setDraftBanner] = useState(false);

  useEffect(() => {
    loadData();
    if (isEdit) loadShift();
    else checkDraft();
  }, []);

  useEffect(() => {
    calculateHours();
  }, [form.time_in, form.time_out, form.is_statutory_holiday]);

  // Auto-save draft whenever form changes (new shifts only)
  useEffect(() => {
    if (!isEdit) saveDraft();
  }, [form]);

  async function checkDraft() {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const { form: savedForm, savedAt } = JSON.parse(raw);
      if (Date.now() - savedAt < DRAFT_MAX_AGE_MS) {
        setDraftBanner(true);
        // Don't auto-restore — wait for user confirmation
      } else {
        await AsyncStorage.removeItem(DRAFT_KEY);
      }
    } catch { /* ignore */ }
  }

  async function saveDraft() {
    try {
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ form, savedAt: Date.now() }));
    } catch { /* ignore */ }
  }

  async function restoreDraft() {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const { form: savedForm } = JSON.parse(raw);
      setForm(savedForm);
      setDraftBanner(false);
    } catch { /* ignore */ }
  }

  async function discardDraft() {
    await AsyncStorage.removeItem(DRAFT_KEY);
    setDraftBanner(false);
  }

  async function loadData() {
    try {
      const [emps, cls] = await Promise.all([
        usersAPI.list({ role: 'employee', is_active: true }),
        clientsAPI.list(),
      ]);
      setEmployees(emps);
      setClients(cls);

      // Apply smart defaults only for new shifts
      if (!isEdit) {
        const [lastClient, lastPos] = await Promise.all([
          AsyncStorage.getItem(LAST_CLIENT_KEY),
          AsyncStorage.getItem(LAST_POSITION_KEY),
        ]);
        setForm(prev => ({
          ...prev,
          client_id: lastClient && cls.some(c => c.id === lastClient) ? lastClient : prev.client_id,
          position: lastPos && POSITIONS.includes(lastPos) ? lastPos : prev.position,
        }));
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  async function loadShift() {
    try {
      const shift = await shiftsAPI.get(shiftId);
      setForm({
        employee_id: shift.employee_id,
        client_id: shift.client_id,
        shift_date: shift.shift_date,
        time_in: shift.time_in,
        time_out: shift.time_out,
        position: shift.position,
        notes: shift.notes || '',
        is_statutory_holiday: shift.is_statutory_holiday,
        status: shift.status,
      });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  function calculateHours() {
    const [inH, inM] = form.time_in.split(':').map(Number);
    const [outH, outM] = form.time_out.split(':').map(Number);
    const inMins = inH * 60 + inM;
    const outMins = outH * 60 + outM;
    const isOvernight = outMins <= inMins;
    const totalMins = isOvernight ? (1440 - inMins) + outMins : outMins - inMins;
    const totalHours = totalMins / 60;
    const invoice = totalHours;

    let payroll, statLabel;
    const isStat = form.is_statutory_holiday;

    if (!isStat) {
      payroll = totalHours > 6 ? totalHours - 0.5 : totalHours;
      statLabel = null;
    } else if (isOvernight) {
      const beforeHours = (1440 - inMins) / 60;
      const afterHours = outMins / 60;
      const beforePayroll = beforeHours > 6 ? beforeHours - 0.5 : beforeHours;
      const afterBase = afterHours > 6 ? afterHours - 0.5 : afterHours;
      payroll = beforePayroll + afterBase * 1.5;
      statLabel = 'Stat 1.5×';
    } else {
      const base = totalHours > 6 ? totalHours - 0.5 : totalHours;
      payroll = base * 1.5;
      statLabel = 'Stat 1.5×';
    }

    setCalculatedHours({
      payroll: payroll.toFixed(2),
      invoice: invoice.toFixed(2),
      statLabel,
    });
  }

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    if (!form.employee_id || !form.client_id || !form.position) {
      Alert.alert('Validation', 'Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await shiftsAPI.update(shiftId, form);
      } else {
        await shiftsAPI.create(form);
        await Promise.all([
          AsyncStorage.setItem(LAST_CLIENT_KEY, form.client_id),
          AsyncStorage.setItem(LAST_POSITION_KEY, form.position),
          AsyncStorage.removeItem(DRAFT_KEY),
        ]);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  const timeToDate = (t) => {
    const [h, m] = t.split(':');
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m), 0);
    return d;
  };

  const dateFromStr = (s) => new Date(s + 'T12:00:00');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={isEdit ? 'Edit Shift' : 'Add Shift'}
        showBack
        rightAction={
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {draftBanner && (
          <View style={styles.draftBanner}>
            <Ionicons name="document-outline" size={18} color={COLORS.navy} />
            <Text style={styles.draftText}>You have an unsaved draft</Text>
            <TouchableOpacity onPress={restoreDraft} style={styles.draftRestoreBtn}>
              <Text style={styles.draftRestoreText}>Restore</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={discardDraft}>
              <Ionicons name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.form}>
          {/* Date */}
          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.pickerText}>{formatDate(form.shift_date, 'MMMM d, yyyy')}</Text>
            <Ionicons name="calendar-outline" size={18} color={COLORS.navy} />
          </TouchableOpacity>

          {/* iOS date picker modal */}
          {Platform.OS === 'ios' ? (
            <Modal visible={showDatePicker} transparent animationType="slide">
              <View style={styles.pickerOverlay}>
                <View style={styles.pickerModal}>
                  <View style={styles.pickerModalHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.pickerCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerModalTitle}>Select Date</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.pickerDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ backgroundColor: '#FFFFFF' }}>
                    <DateTimePicker
                      value={dateFromStr(form.shift_date)}
                      mode="date"
                      display="spinner"
                      themeVariant="light"
                      onChange={(e, d) => {
                        if (d) setField('shift_date', d.toISOString().split('T')[0]);
                      }}
                      style={{ backgroundColor: '#FFFFFF' }}
                    />
                  </View>
                </View>
              </View>
            </Modal>
          ) : (
            showDatePicker && (
              <DateTimePicker
                value={dateFromStr(form.shift_date)}
                mode="date"
                display="default"
                onChange={(e, d) => {
                  setShowDatePicker(false);
                  if (d) setField('shift_date', d.toISOString().split('T')[0]);
                }}
              />
            )
          )}

          {/* Employee */}
          <Text style={styles.label}>Employee *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {employees.map(emp => (
              <TouchableOpacity
                key={emp.id}
                style={[styles.chip, form.employee_id === emp.id && styles.chipActive]}
                onPress={() => { setField('employee_id', emp.id); setField('position', emp.position || form.position); }}
              >
                <Text style={[styles.chipText, form.employee_id === emp.id && styles.chipTextActive]}>
                  {emp.name.split(' ')[0]}
                </Text>
                <Text style={[styles.chipSub, form.employee_id === emp.id && { color: COLORS.lightBlue }]}>
                  {emp.position}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Client */}
          <Text style={styles.label}>Client *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {clients.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, form.client_id === c.id && styles.chipActive]}
                onPress={() => setField('client_id', c.id)}
              >
                <Text style={[styles.chipText, form.client_id === c.id && styles.chipTextActive]}>
                  {c.abbreviation}
                </Text>
                <Text style={[styles.chipSub, form.client_id === c.id && { color: COLORS.lightBlue }]} numberOfLines={1}>
                  {c.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Position */}
          <Text style={styles.label}>Position *</Text>
          <View style={styles.chipRow}>
            {POSITIONS.map(pos => (
              <TouchableOpacity
                key={pos}
                style={[styles.chip, form.position === pos && styles.chipActive]}
                onPress={() => setField('position', pos)}
              >
                <Text style={[styles.chipText, form.position === pos && styles.chipTextActive]}>{pos}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Time In/Out */}
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Time In *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowTimePicker('in')}>
                <Text style={styles.pickerText}>{form.time_in}</Text>
                <Ionicons name="time-outline" size={18} color={COLORS.navy} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.label}>Time Out *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowTimePicker('out')}>
                <Text style={styles.pickerText}>{form.time_out}</Text>
                <Ionicons name="time-outline" size={18} color={COLORS.navy} />
              </TouchableOpacity>
            </View>
          </View>

          {/* iOS time picker modal */}
          {Platform.OS === 'ios' ? (
            <Modal visible={!!showTimePicker} transparent animationType="slide">
              <View style={styles.pickerOverlay}>
                <View style={styles.pickerModal}>
                  <View style={styles.pickerModalHeader}>
                    <TouchableOpacity onPress={() => setShowTimePicker(null)}>
                      <Text style={styles.pickerCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerModalTitle}>
                      {showTimePicker === 'in' ? 'Select Time In' : 'Select Time Out'}
                    </Text>
                    <TouchableOpacity onPress={() => setShowTimePicker(null)}>
                      <Text style={styles.pickerDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ backgroundColor: '#FFFFFF' }}>
                    <DateTimePicker
                      value={timeToDate(showTimePicker === 'in' ? form.time_in : form.time_out)}
                      mode="time"
                      display="spinner"
                      themeVariant="light"
                      is24Hour={true}
                      onChange={(e, d) => {
                        if (d) {
                          const h = String(d.getHours()).padStart(2, '0');
                          const m = String(d.getMinutes()).padStart(2, '0');
                          setField(showTimePicker === 'in' ? 'time_in' : 'time_out', `${h}:${m}`);
                        }
                      }}
                      style={{ backgroundColor: '#FFFFFF' }}
                    />
                  </View>
                </View>
              </View>
            </Modal>
          ) : (
            showTimePicker && (
              <DateTimePicker
                value={timeToDate(showTimePicker === 'in' ? form.time_in : form.time_out)}
                mode="time"
                display="default"
                is24Hour={true}
                onChange={(e, d) => {
                  setShowTimePicker(null);
                  if (d) {
                    const h = String(d.getHours()).padStart(2, '0');
                    const m = String(d.getMinutes()).padStart(2, '0');
                    setField(showTimePicker === 'in' ? 'time_in' : 'time_out', `${h}:${m}`);
                  }
                }}
              />
            )
          )}

          {/* Calculated hours */}
          <View style={styles.hoursBox}>
            <View style={styles.hoursItem}>
              <Text style={styles.hoursLabel}>Payroll Hours</Text>
              <Text style={styles.hoursValue}>{calculatedHours.payroll} hrs</Text>
              {calculatedHours.statLabel && (
                <Text style={styles.hoursStatLabel}>{calculatedHours.statLabel}</Text>
              )}
            </View>
            <View style={styles.hoursDivider} />
            <View style={styles.hoursItem}>
              <Text style={styles.hoursLabel}>Invoice Hours</Text>
              <Text style={styles.hoursValue}>{calculatedHours.invoice} hrs</Text>
            </View>
          </View>

          {/* Statutory */}
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>Statutory Holiday</Text>
              <Text style={styles.switchSub}>1.5x pay rate for employee, 2x for client</Text>
            </View>
            <Switch
              value={form.is_statutory_holiday}
              onValueChange={v => setField('is_statutory_holiday', v)}
              trackColor={{ false: COLORS.border, true: COLORS.green + '80' }}
              thumbColor={form.is_statutory_holiday ? COLORS.green : COLORS.textSecondary}
            />
          </View>

          {/* Status (edit only) */}
          {isEdit && (
            <>
              <Text style={styles.label}>Status</Text>
              <View style={styles.chipRow}>
                {['pending', 'approved', 'invoiced'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, form.status === s && styles.chipActive]}
                    onPress={() => setField('status', s)}
                  >
                    <Text style={[styles.chipText, form.status === s && styles.chipTextActive]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Notes */}
          <Input
            label="Notes"
            value={form.notes}
            onChangeText={v => setField('notes', v)}
            placeholder="Optional notes..."
            multiline
            numberOfLines={3}
          />

          <Button title={isEdit ? 'Update Shift' : 'Add Shift'} onPress={handleSave} loading={saving} size="large" style={{ marginTop: 8, marginBottom: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { flex: 1, backgroundColor: COLORS.white },
  form: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.navy, marginBottom: 8, marginTop: 8 },
  picker: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: COLORS.white,
  },
  pickerText: { fontSize: 15, color: COLORS.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 52,
  },
  chipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  chipTextActive: { color: COLORS.white },
  chipSub: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  timeRow: { flexDirection: 'row', gap: 0, marginBottom: 4 },
  hoursBox: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: 10,
    flexDirection: 'row',
    marginVertical: 12,
    overflow: 'hidden',
  },
  hoursItem: { flex: 1, alignItems: 'center', padding: 12 },
  hoursDivider: { width: 1, backgroundColor: COLORS.navy + '20' },
  hoursLabel: { fontSize: 11, color: COLORS.navy, fontWeight: '500' },
  hoursValue: { fontSize: 18, fontWeight: '700', color: COLORS.navy, marginTop: 2 },
  hoursStatLabel: { fontSize: 10, color: COLORS.green, fontWeight: '700', marginTop: 2 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  switchSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  saveText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerModalTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  pickerCancel: { fontSize: 16, color: COLORS.textSecondary },
  pickerDone: { fontSize: 16, fontWeight: '700', color: COLORS.navy },
  draftBanner: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  draftText: { flex: 1, fontSize: 13, color: COLORS.navy, fontWeight: '500' },
  draftRestoreBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  draftRestoreText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
});

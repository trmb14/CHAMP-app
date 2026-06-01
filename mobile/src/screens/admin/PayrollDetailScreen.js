import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { payrollAPI, shiftsAPI, payPeriodsAPI } from '../../services/api';
import { COLORS } from '../../utils/colors';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatting';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';

export default function PayrollDetailScreen() {
  const route = useRoute();
  const { payrollId, employeeName, payPeriodId } = route.params;

  const [record, setRecord] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [incomeTax, setIncomeTax] = useState('');
  const [uberMisc, setUberMisc] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const records = await payrollAPI.list(payPeriodId);
      const r = records.find(rec => rec.id === payrollId);
      if (r) {
        setRecord(r);
        setIncomeTax(String(r.income_tax || ''));
        setUberMisc(String(r.uber_misc_deduction || ''));
      }
      const period = await payPeriodsAPI.get(payPeriodId);
      const empShifts = await shiftsAPI.list({
        employee_id: r?.employee_id,
        start_date: period.start_date,
        end_date: period.end_date,
        status: 'approved',
      });
      setShifts(empShifts);
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await payrollAPI.save({
        pay_period_id: payPeriodId,
        employee_id: record.employee_id,
        income_tax: parseFloat(incomeTax || 0),
        uber_misc_deduction: parseFloat(uberMisc || 0),
      });
      load();
      Alert.alert('Saved', 'Payroll updated successfully');
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <LoadingScreen />;
  if (!record) return null;

  const cpp = parseFloat(record.cpp_deduction || 0);
  const ei = parseFloat(record.ei_deduction || 0);
  const tax = parseFloat(incomeTax || 0);
  const uber = parseFloat(uberMisc || 0);
  const totalDeductions = cpp + ei + tax + uber;
  const netPay = parseFloat(record.gross_pay || 0) - totalDeductions;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={employeeName || 'Payroll Detail'} showBack />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Earnings summary */}
        <View style={styles.earningsBanner}>
          <View>
            <Text style={styles.bannerLabel}>Gross Pay</Text>
            <Text style={styles.bannerAmount}>{formatCurrency(record.gross_pay)}</Text>
          </View>
          <View style={styles.bannerMid}>
            <Text style={styles.bannerLabel}>Total Hours</Text>
            <Text style={styles.bannerAmount}>{parseFloat(record.total_hours).toFixed(1)}</Text>
          </View>
          <View>
            <Text style={styles.bannerLabel}>Pay Rate</Text>
            <Text style={styles.bannerAmount}>{formatCurrency(record.pay_rate)}/hr</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Shift breakdown */}
          <Text style={styles.sectionTitle}>Shift Breakdown</Text>
          <Card padding={0}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1.2 }]}>Date</Text>
              <Text style={[styles.th, { flex: 0.8 }]}>Client</Text>
              <Text style={[styles.th, { flex: 0.6, textAlign: 'right' }]}>Hrs</Text>
              <Text style={[styles.th, { flex: 0.8, textAlign: 'right' }]}>Rate</Text>
              <Text style={[styles.th, { flex: 0.8, textAlign: 'right' }]}>Amount</Text>
            </View>
            {shifts.map((s, i) => {
              const rate = s.is_statutory_holiday
                ? parseFloat(record.pay_rate) * 1.5
                : parseFloat(record.pay_rate);
              const amount = parseFloat(s.payroll_hours) * rate;
              return (
                <View key={s.id} style={[styles.tableRow, i % 2 === 1 && { backgroundColor: COLORS.lightGray }]}>
                  <Text style={[styles.td, { flex: 1.2 }]}>{formatDate(s.shift_date, 'MMM d')}</Text>
                  <Text style={[styles.td, { flex: 0.8 }]}>{s.client_abbreviation}</Text>
                  <Text style={[styles.td, { flex: 0.6, textAlign: 'right' }]}>{parseFloat(s.payroll_hours).toFixed(1)}</Text>
                  <Text style={[styles.td, { flex: 0.8, textAlign: 'right' }]}>{formatCurrency(rate)}</Text>
                  <Text style={[styles.td, { flex: 0.8, textAlign: 'right', fontWeight: '600' }]}>{formatCurrency(amount)}</Text>
                </View>
              );
            })}
          </Card>

          {/* Deductions */}
          <Text style={styles.sectionTitle}>Deductions</Text>
          <Card padding={16}>
            <DeductionRow label="CPP (5.95%)" value={cpp} fixed />
            <DeductionRow label="EI (1.63%)" value={ei} fixed />

            <View style={styles.deductionRow}>
              <Text style={styles.deductionLabel}>Income Tax (CRA)</Text>
              <TextInput
                style={styles.deductionInput}
                value={incomeTax}
                onChangeText={setIncomeTax}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
            <View style={[styles.deductionRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.deductionLabel}>Uber / Misc</Text>
              <TextInput
                style={styles.deductionInput}
                value={uberMisc}
                onChangeText={setUberMisc}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>

            <View style={styles.totalDeductions}>
              <Text style={styles.totalLabel}>Total Deductions</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalDeductions)}</Text>
            </View>
          </Card>

          {/* Net Pay */}
          <View style={styles.netPayBox}>
            <Text style={styles.netLabel}>NET PAY</Text>
            <Text style={styles.netAmount}>{formatCurrency(netPay)}</Text>
          </View>

          <Button title="Save Changes" onPress={handleSave} loading={saving} size="large" style={{ marginBottom: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DeductionRow({ label, value, fixed }) {
  return (
    <View style={styles.deductionRow}>
      <Text style={styles.deductionLabel}>{label}</Text>
      <Text style={[styles.deductionValue, fixed && { color: COLORS.textSecondary }]}>
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { flex: 1, backgroundColor: COLORS.lightGray },
  earningsBanner: {
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    paddingBottom: 24,
  },
  bannerLabel: { color: '#A8C4E0', fontSize: 11, marginBottom: 4 },
  bannerAmount: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  bannerMid: { alignItems: 'center' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10, marginTop: 4 },
  tableHeader: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: COLORS.navy,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  th: { fontSize: 11, fontWeight: '700', color: COLORS.white },
  tableRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8 },
  td: { fontSize: 12, color: COLORS.text },
  deductionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  deductionLabel: { fontSize: 14, color: COLORS.text },
  deductionValue: { fontSize: 14, fontWeight: '600', color: COLORS.navy },
  deductionInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 100,
    textAlign: 'right',
    fontSize: 14,
    color: COLORS.text,
  },
  totalDeductions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  totalValue: { fontSize: 14, fontWeight: '700', color: COLORS.error },
  netPayBox: {
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  netLabel: { color: COLORS.white, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  netAmount: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
});

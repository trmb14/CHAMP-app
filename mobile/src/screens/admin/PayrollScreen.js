import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Animated, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { payPeriodsAPI, payrollAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { COLORS, SHADOWS } from '../../utils/colors';
import { formatCurrency, formatDate } from '../../utils/formatting';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import ScreenHeader from '../../components/common/ScreenHeader';
import { SkeletonListScreen } from '../../components/common/SkeletonLoader';

function PayrollBarChart({ data, colors }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={chartStyles.container}>
      <Text style={[chartStyles.title, { color: colors.text }]}>Gross Pay This Period</Text>
      {data.map((item, i) => {
        const pct = item.value / max;
        const barColor = i % 2 === 0 ? colors.navy : COLORS.green;
        return (
          <View key={item.name} style={chartStyles.row}>
            <Text style={[chartStyles.label, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.name.split(' ')[0]}
            </Text>
            <View style={chartStyles.barTrack}>
              <View style={[chartStyles.bar, { width: `${Math.max(pct * 100, 2)}%`, backgroundColor: barColor }]} />
            </View>
            <Text style={[chartStyles.amount, { color: colors.text }]}>{formatCurrency(item.value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  title: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  label: { width: 60, fontSize: 11, fontWeight: '500' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.border, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  amount: { width: 58, fontSize: 11, fontWeight: '600', textAlign: 'right' },
});

export default function PayrollScreen() {
  const navigation = useNavigation();
  const { isDark, colors } = useTheme();
  const [periods, setPeriods] = useState([]);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPaystubs, setGeneratingPaystubs] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      const [current, allPeriods] = await Promise.all([
        payPeriodsAPI.current(),
        payPeriodsAPI.list(),
      ]);
      setCurrentPeriod(current);
      setPeriods(allPeriods);
      const payroll = await payrollAPI.list(current.id);
      setPayrollData(payroll);
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

  async function handleCalculateAll() {
    if (!currentPeriod) return;
    try {
      const calc = await payrollAPI.calculate(currentPeriod.id);
      for (const emp of calc) {
        await payrollAPI.save({
          pay_period_id: currentPeriod.id,
          employee_id: emp.employee_id,
          income_tax: 0,
          uber_misc_deduction: 0,
        });
      }
      load();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  async function handleGeneratePaystubs() {
    if (!currentPeriod) return;
    Alert.alert(
      'Generate Paystubs',
      'Generate PDF paystubs for all employees in this period?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate', onPress: async () => {
            setGeneratingPaystubs(true);
            try {
              const result = await payrollAPI.generatePaystubs(currentPeriod.id);
              Alert.alert('Done', `${result.generated} paystub(s) generated.`);
              load();
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setGeneratingPaystubs(false);
            }
          }
        },
      ]
    );
  }

  async function handleExportPDF() {
    if (!currentPeriod) return;
    if (payrollData.length === 0) {
      Alert.alert('No Data', 'Calculate payroll first before exporting.');
      return;
    }
    setExporting(true);
    try {
      const result = await payrollAPI.exportSummary(currentPeriod.id);
      if (!result.pdf_url) throw new Error('No PDF generated');
      const filename = `payroll_summary_${currentPeriod.start_date}.pdf`;
      const localUri = FileSystem.cacheDirectory + filename;
      const base64 = result.pdf_url.split(',')[1];
      await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri, { mimeType: 'application/pdf', dialogTitle: 'Payroll Summary' });
      } else {
        Alert.alert('Saved', localUri);
      }
    } catch (err) {
      Alert.alert('Export Error', err.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleClosePeriod() {
    Alert.alert('Close Period', 'Close this pay period? This will lock all shifts.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close', style: 'destructive', onPress: async () => {
          try {
            await payPeriodsAPI.close(currentPeriod.id);
            load();
          } catch (err) { Alert.alert('Error', err.message); }
        }
      },
    ]);
  }

  const totalGross = payrollData.reduce((s, p) => s + parseFloat(p.gross_pay || 0), 0);
  const totalNet = payrollData.reduce((s, p) => s + parseFloat(p.net_pay || 0), 0);

  const chartData = payrollData.map(r => ({ name: r.employee_name || '?', value: parseFloat(r.gross_pay || 0) }));

  if (loading && !currentPeriod) return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.navy }]} edges={['top']}>
      <ScreenHeader title="Payroll" />
      <SkeletonListScreen count={4} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.navy }]} edges={['top']}>
      <ScreenHeader title="Payroll" />

      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.lightGray }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Period Banner */}
        {currentPeriod && (
          <View style={[styles.periodBanner, { backgroundColor: isDark ? colors.card : COLORS.lightBlue }]}>
            <View>
              <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>Current Pay Period</Text>
              <Text style={[styles.periodDates, { color: colors.navy }]}>
                {formatDate(currentPeriod.start_date, 'MMM d')} – {formatDate(currentPeriod.end_date, 'MMM d, yyyy')}
              </Text>
            </View>
            <StatusBadge status={currentPeriod.status} />
          </View>
        )}

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Summary */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card || colors.white }, SHADOWS.card]}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Gross</Text>
              <Text style={[styles.summaryValue, { color: colors.navy }]}>{formatCurrency(totalGross)}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card || colors.white }, SHADOWS.card]}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Net</Text>
              <Text style={[styles.summaryValue, { color: COLORS.green }]}>{formatCurrency(totalNet)}</Text>
            </View>
          </View>

          {/* Chart */}
          {chartData.length > 0 && (
            <View style={[styles.chartCard, { backgroundColor: colors.card || colors.white }, SHADOWS.card]}>
              <PayrollBarChart data={chartData} colors={colors} />
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Button
              title="Calculate"
              onPress={handleCalculateAll}
              variant="secondary"
              size="small"
              icon={<Ionicons name="calculator-outline" size={15} color={COLORS.navy} />}
              style={{ flex: 1 }}
            />
            <Button
              title="Paystubs"
              onPress={handleGeneratePaystubs}
              loading={generatingPaystubs}
              size="small"
              icon={<Ionicons name="document-text-outline" size={15} color={COLORS.white} />}
              style={{ flex: 1 }}
            />
            <Button
              title={exporting ? '...' : 'Export'}
              onPress={handleExportPDF}
              loading={exporting}
              variant="secondary"
              size="small"
              icon={<Ionicons name="share-outline" size={15} color={COLORS.navy} />}
              style={{ flex: 1 }}
            />
          </View>

          {currentPeriod?.status === 'open' && (
            <Button
              title="Close Pay Period"
              onPress={handleClosePeriod}
              variant="danger"
              size="small"
              style={{ marginBottom: 12 }}
            />
          )}

          {/* Employee list */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Employees ({payrollData.length})</Text>
          {payrollData.length > 0 ? (
            payrollData.map((record) => (
              <TouchableOpacity
                key={record.id}
                style={[styles.empCard, { backgroundColor: colors.card || colors.white }, SHADOWS.card]}
                onPress={() => navigation.navigate('PayrollDetail', {
                  payrollId: record.id,
                  employeeName: record.employee_name,
                  payPeriodId: currentPeriod?.id,
                })}
                activeOpacity={0.8}
              >
                <View style={[styles.empAvatar, { backgroundColor: colors.navy }]}>
                  <Text style={styles.empAvatarText}>
                    {record.employee_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.empInfo}>
                  <Text style={[styles.empName, { color: colors.text }]}>{record.employee_name}</Text>
                  <Text style={[styles.empDetail, { color: colors.textSecondary }]}>
                    {parseFloat(record.total_hours).toFixed(1)} hrs • {record.employee_position}
                  </Text>
                  {record.pdf_url && (
                    <View style={styles.paystubBadge}>
                      <Ionicons name="document-text" size={11} color={COLORS.green} />
                      <Text style={styles.paystubText}>Paystub ready</Text>
                    </View>
                  )}
                </View>
                <View style={styles.empAmounts}>
                  <Text style={[styles.netPay, { color: colors.navy }]}>{formatCurrency(record.net_pay)}</Text>
                  <Text style={[styles.grossPay, { color: colors.textSecondary }]}>Gross: {formatCurrency(record.gross_pay)}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.empty, { backgroundColor: colors.card || colors.white }, SHADOWS.card]}>
              <Ionicons name="cash-outline" size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No payroll data yet</Text>
              <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>Tap "Calculate" to compute for this period</Text>
              <TouchableOpacity onPress={handleCalculateAll} style={styles.emptyAction}>
                <Text style={styles.emptyActionText}>Calculate Payroll</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Past Periods */}
          {periods.filter(p => p.id !== currentPeriod?.id).length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 8, color: colors.text }]}>Past Periods</Text>
              {periods.filter(p => p.id !== currentPeriod?.id).slice(0, 8).map(period => (
                <View key={period.id} style={[styles.pastCard, { backgroundColor: colors.card || colors.white }, SHADOWS.card]}>
                  <View style={styles.pastCardTop}>
                    <Text style={[styles.pastDates, { color: colors.text }]}>
                      {formatDate(period.start_date, 'MMM d')} – {formatDate(period.end_date, 'MMM d, yyyy')}
                    </Text>
                    <StatusBadge status={period.status} />
                  </View>
                  {(period.total_gross != null || period.employee_count != null) && (
                    <View style={styles.pastCardStats}>
                      {period.employee_count != null && (
                        <View style={styles.pastStat}>
                          <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
                          <Text style={[styles.pastStatText, { color: colors.textSecondary }]}>
                            {period.employee_count} emp
                          </Text>
                        </View>
                      )}
                      {period.total_gross != null && (
                        <View style={styles.pastStat}>
                          <Ionicons name="cash-outline" size={12} color={colors.textSecondary} />
                          <Text style={[styles.pastStatText, { color: colors.textSecondary }]}>
                            Gross: {formatCurrency(period.total_gross)}
                          </Text>
                        </View>
                      )}
                      {period.total_net != null && (
                        <View style={styles.pastStat}>
                          <Ionicons name="wallet-outline" size={12} color={COLORS.green} />
                          <Text style={[styles.pastStatText, { color: COLORS.green }]}>
                            Net: {formatCurrency(period.total_net)}
                          </Text>
                        </View>
                      )}
                      {period.summary_pdf_url && (
                        <TouchableOpacity
                          style={styles.pastPdfBtn}
                          onPress={() => Linking.openURL(period.summary_pdf_url)}
                        >
                          <Ionicons name="document-text-outline" size={12} color={COLORS.navy} />
                          <Text style={styles.pastPdfText}>Summary PDF</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
          <View style={{ height: 20 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  periodBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  periodLabel: { fontSize: 11, fontWeight: '500' },
  periodDates: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  content: { padding: 16 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 14 },
  summaryLabel: { fontSize: 11, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  chartCard: { borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  empCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  empAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  empAvatarText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '600' },
  empDetail: { fontSize: 12, marginTop: 2 },
  empAmounts: { alignItems: 'flex-end' },
  netPay: { fontSize: 16, fontWeight: '700' },
  grossPay: { fontSize: 11, marginTop: 2 },
  paystubBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  paystubText: { fontSize: 11, color: COLORS.green, fontWeight: '500' },
  empty: { alignItems: 'center', padding: 32, borderRadius: 12, gap: 8, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  emptySubText: { fontSize: 12, textAlign: 'center' },
  emptyAction: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  emptyActionText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  pastCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  pastCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pastDates: { fontSize: 14, fontWeight: '500' },
  pastCardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  pastStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pastStatText: { fontSize: 11 },
  pastPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.lightBlue,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pastPdfText: { fontSize: 11, color: COLORS.navy, fontWeight: '600' },
});

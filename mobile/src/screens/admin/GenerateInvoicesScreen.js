import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { invoicesAPI } from '../../services/api';
import { COLORS } from '../../utils/colors';
import { formatCurrency, formatDate } from '../../utils/formatting';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ScreenHeader from '../../components/common/ScreenHeader';

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export default function GenerateInvoicesScreen() {
  const navigation = useNavigation();
  const [weekStart, setWeekStart] = useState(getMondayOfWeek(new Date()));
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => { loadPreview(); }, [weekStart]);

  async function loadPreview() {
    setLoading(true);
    try {
      const data = await invoicesAPI.preview(weekStart);
      setPreviews(data);
    } catch (err) {
      setPreviews([]);
    } finally { setLoading(false); }
  }

  async function handleGenerateOne(clientId) {
    setGeneratingId(clientId);
    try {
      await invoicesAPI.generate(clientId, weekStart);
      Alert.alert('Success', 'Invoice generated!');
      navigation.navigate('Invoices');
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setGeneratingId(null); }
  }

  async function handleGenerateAll() {
    Alert.alert(
      'Generate All Invoices',
      `Generate invoices for all ${previews.length} client(s) for this week?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate All', onPress: async () => {
            setGenerating(true);
            try {
              let count = 0;
              for (const p of previews) {
                await invoicesAPI.generate(p.client_id, weekStart);
                count++;
              }
              Alert.alert('Done', `${count} invoice(s) generated.`);
              navigation.navigate('Invoices');
            } catch (err) { Alert.alert('Error', err.message); }
            finally { setGenerating(false); }
          }
        },
      ]
    );
  }

  const weekEnd = new Date(weekStart + 'T12:00:00');
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Generate Invoices" showBack />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Week selector */}
        <View style={styles.weekSelector}>
          <TouchableOpacity
            style={styles.weekArrow}
            onPress={() => {
              const d = new Date(weekStart + 'T12:00:00');
              d.setDate(d.getDate() - 7);
              setWeekStart(d.toISOString().split('T')[0]);
            }}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.navy} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.weekLabel} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.weekText}>
              {formatDate(weekStart, 'MMM d')} – {formatDate(weekEnd.toISOString().split('T')[0], 'MMM d, yyyy')}
            </Text>
            <Text style={styles.weekSub}>Tap to change</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.weekArrow}
            onPress={() => {
              const d = new Date(weekStart + 'T12:00:00');
              d.setDate(d.getDate() + 7);
              setWeekStart(getMondayOfWeek(d));
            }}
          >
            <Ionicons name="chevron-forward" size={20} color={COLORS.navy} />
          </TouchableOpacity>
        </View>

        {Platform.OS === 'ios' ? (
          <Modal visible={showDatePicker} transparent animationType="slide">
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerModal}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.pickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerModalTitle}>Select Week</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ backgroundColor: '#FFFFFF' }}>
                  <DateTimePicker
                    value={new Date(weekStart + 'T12:00:00')}
                    mode="date"
                    display="spinner"
                    themeVariant="light"
                    onChange={(e, d) => { if (d) setWeekStart(getMondayOfWeek(d)); }}
                    style={{ backgroundColor: '#FFFFFF' }}
                  />
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          showDatePicker && (
            <DateTimePicker
              value={new Date(weekStart + 'T12:00:00')}
              mode="date"
              display="default"
              onChange={(e, d) => {
                setShowDatePicker(false);
                if (d) setWeekStart(getMondayOfWeek(d));
              }}
            />
          )
        )}

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingBox}>
              <Text style={styles.loadingText}>Loading preview...</Text>
            </View>
          ) : previews.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={40} color={COLORS.border} />
              <Text style={styles.emptyText}>No approved shifts for this week</Text>
            </View>
          ) : (
            <>
              <View style={styles.previewHeader}>
                <Text style={styles.sectionTitle}>{previews.length} client(s) with shifts</Text>
                <Button
                  title="Generate All"
                  onPress={handleGenerateAll}
                  loading={generating}
                  size="small"
                  icon={<Ionicons name="flash" size={14} color={COLORS.white} />}
                />
              </View>

              {previews.map((preview) => (
                <Card key={preview.client_id} padding={14} style={{ marginBottom: 12 }}>
                  <View style={styles.previewTop}>
                    <View>
                      <Text style={styles.previewClientName}>{preview.client_name}</Text>
                      <Text style={styles.previewInvNum}>{preview.invoice_number}</Text>
                    </View>
                    <Button
                      title="Generate"
                      onPress={() => handleGenerateOne(preview.client_id)}
                      loading={generatingId === preview.client_id}
                      size="small"
                      variant="secondary"
                    />
                  </View>

                  {/* Line items preview */}
                  <View style={styles.lineItems}>
                    {preview.line_items.map((item, i) => (
                      <View key={i} style={[styles.lineItem, item.is_statutory && styles.lineItemStat]}>
                        <Text style={styles.lineDate}>{formatDate(item.date_of_service || item.shift_date, 'MMM d')}</Text>
                        <Text style={[styles.lineDetail, item.is_statutory && styles.lineDetailStat]}>
                          {item.position} • {parseFloat(item.shift_hours).toFixed(1)}hrs
                        </Text>
                        <Text style={[styles.lineAmount, item.is_statutory && styles.lineAmountStat]}>{formatCurrency(item.total)}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Totals */}
                  <View style={styles.totalsBox}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Subtotal</Text>
                      <Text style={styles.totalVal}>{formatCurrency(preview.subtotal)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>HST 13%</Text>
                      <Text style={styles.totalVal}>{formatCurrency(preview.hst_amount)}</Text>
                    </View>
                    <View style={[styles.totalRow, styles.grandTotal]}>
                      <Text style={styles.grandLabel}>TOTAL DUE</Text>
                      <Text style={styles.grandVal}>{formatCurrency(preview.total_due)}</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { flex: 1, backgroundColor: COLORS.lightGray },
  weekSelector: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  weekArrow: { padding: 16 },
  weekLabel: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  weekText: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  weekSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  content: { padding: 16 },
  loadingBox: { alignItems: 'center', padding: 32 },
  loadingText: { color: COLORS.textSecondary },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  previewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  previewClientName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  previewInvNum: { fontSize: 12, color: COLORS.navy, fontWeight: '500', marginTop: 2 },
  lineItems: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  lineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  lineDate: { width: 50, fontSize: 12, color: COLORS.textSecondary },
  lineDetail: { flex: 1, fontSize: 12, color: COLORS.text },
  lineAmount: { fontSize: 12, fontWeight: '600', color: COLORS.navy },
  totalsBox: { backgroundColor: COLORS.lightGray, borderRadius: 8, padding: 10, marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 12, color: COLORS.textSecondary },
  totalVal: { fontSize: 12, color: COLORS.text },
  grandTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4, paddingTop: 6 },
  grandLabel: { fontSize: 13, fontWeight: '700', color: COLORS.navy },
  grandVal: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  lineItemStat: { backgroundColor: '#FFF3E0' },
  lineDetailStat: { color: '#B85C00', fontWeight: '500' },
  lineAmountStat: { color: '#B85C00', fontWeight: '700' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerModal: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 32 },
  pickerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  pickerModalTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  pickerCancel: { fontSize: 16, color: '#9CA3AF' },
  pickerDone: { fontSize: 16, fontWeight: '700', color: '#1F4E79' },
});

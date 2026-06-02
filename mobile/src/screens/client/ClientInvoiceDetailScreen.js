import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Linking, ActivityIndicator
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { invoicesAPI } from '../../services/api';
import { COLORS, SHADOWS } from '../../utils/colors';
import { formatCurrency, formatDate } from '../../utils/formatting';
import StatusBadge from '../../components/common/StatusBadge';

export default function ClientInvoiceDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { invoiceId } = route.params;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => { load(); }, [invoiceId]);

  async function load() {
    try {
      const data = await invoicesAPI.get(invoiceId);
      setInvoice(data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailInvoice() {
    if (!invoice?.pdf_url) {
      Alert.alert('No PDF', 'Invoice PDF is not ready yet.');
      return;
    }
    setSharing(true);
    try {
      const filename = `${invoice.invoice_number || invoiceId}.pdf`;
      const localUri = FileSystem.cacheDirectory + filename;
      if (invoice.pdf_url.startsWith('data:')) {
        const base64 = invoice.pdf_url.split(',')[1];
        await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      } else {
        await FileSystem.downloadAsync(invoice.pdf_url, localUri);
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Email Invoice ${invoice.invoice_number}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Not Available', 'Sharing is not available on this device.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSharing(false);
    }
  }

  async function handleMarkPaid() {
    Alert.alert('Mark as Paid', 'Confirm this invoice has been paid?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          setMarking(true);
          try {
            await invoicesAPI.updateStatus(invoiceId, 'paid');
            await load();
          } catch (err) {
            Alert.alert('Error', err.message);
          } finally {
            setMarking(false);
          }
        }
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.navy} />
        </View>
      </SafeAreaView>
    );
  }

  if (!invoice) return null;

  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const canMarkPaid = invoice.status === 'pending' || invoice.status === 'sent';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice #{invoice.invoice_number}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary card */}
        <View style={[styles.summaryCard, SHADOWS.card]}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <StatusBadge status={invoice.status} />
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Invoice Date</Text>
            <Text style={styles.summaryValue}>{formatDate(invoice.invoice_date, 'MMM d, yyyy')}</Text>
          </View>
          {invoice.week_start && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Week Of</Text>
              <Text style={styles.summaryValue}>{formatDate(invoice.week_start, 'MMM d, yyyy')}</Text>
            </View>
          )}
          {invoice.due_date && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Due Date</Text>
              <Text style={styles.summaryValue}>{formatDate(invoice.due_date, 'MMM d, yyyy')}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>{formatCurrency(invoice.total_amount)}</Text>
          </View>
        </View>

        {/* Line items */}
        {lineItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Line Items</Text>
            <View style={[styles.lineItemsCard, SHADOWS.card]}>
              <View style={styles.lineHeader}>
                <Text style={[styles.lineHeaderText, { flex: 2 }]}>Description</Text>
                <Text style={[styles.lineHeaderText, { flex: 1, textAlign: 'center' }]}>Hrs</Text>
                <Text style={[styles.lineHeaderText, { flex: 1, textAlign: 'center' }]}>Rate</Text>
                <Text style={[styles.lineHeaderText, { flex: 1, textAlign: 'right' }]}>Amount</Text>
              </View>
              {lineItems.map((item, i) => (
                <View key={i} style={[styles.lineRow, i < lineItems.length - 1 && styles.lineRowBorder]}>
                  <Text style={[styles.lineText, { flex: 2 }]} numberOfLines={2}>{item.description || `${item.position}`}</Text>
                  <Text style={[styles.lineText, { flex: 1, textAlign: 'center' }]}>
                    {item.hours != null ? parseFloat(item.hours).toFixed(1) : '—'}
                  </Text>
                  <Text style={[styles.lineText, { flex: 1, textAlign: 'center' }]}>
                    {item.rate != null ? formatCurrency(item.rate) : '—'}
                  </Text>
                  <Text style={[styles.lineAmount, { flex: 1, textAlign: 'right' }]}>
                    {formatCurrency(item.amount || item.total)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {invoice.pdf_url && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.pdfBtn]}
              onPress={() => Linking.openURL(invoice.pdf_url)}
            >
              <Ionicons name="document-text-outline" size={18} color={COLORS.white} />
              <Text style={styles.actionBtnText}>View PDF</Text>
            </TouchableOpacity>
          )}
          {invoice.pdf_url && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.emailBtn, sharing && styles.actionBtnDisabled]}
              onPress={handleEmailInvoice}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator size="small" color={COLORS.navy} />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={18} color={COLORS.navy} />
                  <Text style={[styles.actionBtnText, { color: COLORS.navy }]}>Email Invoice</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {canMarkPaid && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.paidBtn, marking && styles.actionBtnDisabled]}
              onPress={handleMarkPaid}
              disabled={marking}
            >
              {marking ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Mark as Paid</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { padding: 6 },
  headerTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
  scroll: { flex: 1, backgroundColor: COLORS.lightGray },
  summaryCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  totalAmount: { fontSize: 20, fontWeight: '800', color: COLORS.navy },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.navy, marginHorizontal: 16, marginBottom: 8 },
  lineItemsCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  lineHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lineHeaderText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  lineRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  lineRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  lineText: { fontSize: 13, color: COLORS.text },
  lineAmount: { fontSize: 13, fontWeight: '600', color: COLORS.navy },
  actions: { marginHorizontal: 16, gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  pdfBtn: { backgroundColor: COLORS.navy },
  emailBtn: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.navy },
  paidBtn: { backgroundColor: COLORS.green },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});

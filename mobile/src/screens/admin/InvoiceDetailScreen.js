import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { invoicesAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { COLORS } from '../../utils/colors';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatting';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';

const STATUS_CONFIG = {
  draft:  { color: COLORS.textSecondary, label: 'Draft' },
  sent:   { color: COLORS.navy,          label: 'Sent' },
  paid:   { color: COLORS.success,       label: 'Paid' },
};

export default function InvoiceDetailScreen() {
  const route = useRoute();
  const { invoiceId } = route.params;
  const { isDark, colors } = useTheme();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await invoicesAPI.get(invoiceId);
      setInvoice(data);
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setLoading(false); }
  }

  async function handleUpdateStatus(status) {
    setUpdatingStatus(true);
    try {
      await invoicesAPI.updateStatus(invoiceId, status);
      load();
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setUpdatingStatus(false); }
  }

  async function handleEmailInvoice() {
    if (!invoice?.pdf_url) return;
    // Download PDF to local file then open share sheet (allows Mail attachment)
    setDownloading(true);
    try {
      const filename = `CHAMP-${invoice.invoice_number || invoiceId}.pdf`;
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
      setDownloading(false);
    }
  }

  async function handleShare(mimeType = 'application/pdf') {
    if (!invoice?.pdf_url) return;
    setDownloading(true);
    try {
      const filename = `CHAMP-${invoice.invoice_number || invoiceId}.pdf`;
      const localUri = FileSystem.cacheDirectory + filename;
      if (invoice.pdf_url.startsWith('data:')) {
        const base64 = invoice.pdf_url.split(',')[1];
        await FileSystem.writeAsStringAsync(localUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        await FileSystem.downloadAsync(invoice.pdf_url, localUri);
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri, { mimeType, dialogTitle: `Invoice ${invoice.invoice_number}` });
      } else {
        Alert.alert('Saved', `File saved to: ${localUri}`);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (!invoice) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.navy }]} edges={['top']}>
      <ScreenHeader
        title={invoice.invoice_number || 'Invoice'}
        showBack
        rightAction={
          invoice.pdf_url ? (
            <TouchableOpacity onPress={() => handleShare()} disabled={downloading} style={styles.headerBtn}>
              <Ionicons name="share-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.lightGray }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Invoice header */}
        <View style={[styles.invHeader, { backgroundColor: colors.navy }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.invNumber}>{invoice.invoice_number}</Text>
            <Text style={styles.invClient}>{invoice.client_name}</Text>
            <Text style={styles.invWeek}>
              {formatDate(invoice.week_start, 'MMM d')} – {formatDate(invoice.week_end, 'MMM d, yyyy')}
            </Text>
          </View>
          <StatusBadge status={invoice.status} />
        </View>

        <View style={styles.content}>
          {/* Invoice meta */}
          <Card padding={14} style={{ marginBottom: 12, backgroundColor: colors.card || colors.white }}>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Invoice No.</Text>
                <Text style={[styles.metaValue, { color: colors.navy }]}>{invoice.invoice_number}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Invoice Date</Text>
                <Text style={[styles.metaValue, { color: colors.navy }]}>
                  {invoice.invoice_date ? formatDate(invoice.invoice_date, 'MMM d, yyyy') : '—'}
                </Text>
              </View>
            </View>
          </Card>

          {/* Client details */}
          <Card padding={14} style={{ marginBottom: 12, backgroundColor: colors.card || colors.white }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bill To</Text>
            <Text style={[styles.clientName, { color: colors.text }]}>{invoice.client_name}</Text>
            <Text style={[styles.detail, { color: colors.text }]}>{invoice.address}</Text>
            <Text style={[styles.detail, { color: colors.text }]}>{invoice.city}, {invoice.province}  {invoice.postal_code}</Text>
            {invoice.phone ? <Text style={[styles.detail, { color: colors.text }]}>Tel: {invoice.phone}</Text> : null}
            {invoice.fax ? <Text style={[styles.detail, { color: colors.text }]}>Fax: {invoice.fax}</Text> : null}
            {invoice.contact_name ? <Text style={[styles.detail, { color: colors.text }]}>Attn: {invoice.contact_name}</Text> : null}
          </Card>

          {/* Line items */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Line Items</Text>
          <Card padding={0} style={{ backgroundColor: colors.card || colors.white }}>
            <View style={[styles.tableHeader, { backgroundColor: colors.navy }]}>
              <Text style={[styles.th, { flex: 1.2 }]}>Date</Text>
              <Text style={[styles.th, { flex: 0.7 }]}>Pos</Text>
              <Text style={[styles.th, { flex: 0.8 }]}>In</Text>
              <Text style={[styles.th, { flex: 0.8 }]}>Out</Text>
              <Text style={[styles.th, { flex: 0.6, textAlign: 'right' }]}>Hrs</Text>
              <Text style={[styles.th, { flex: 0.8, textAlign: 'right' }]}>Rate</Text>
              <Text style={[styles.th, { flex: 0.8, textAlign: 'right' }]}>Total</Text>
            </View>
            {(invoice.line_items || []).map((item, i) => (
              <View
                key={item.id}
                style={[
                  styles.tableRow,
                  i % 2 === 1 && { backgroundColor: colors.lightGray },
                  item.is_statutory && { backgroundColor: isDark ? COLORS.statutory : '#FFF9E6' },
                ]}
              >
                <Text style={[styles.td, { flex: 1.2, color: colors.text }]}>{formatDate(item.date_of_service, 'MMM d')}</Text>
                <Text style={[styles.td, { flex: 0.7, color: colors.text }]}>{item.position}</Text>
                <Text style={[styles.td, { flex: 0.8, color: colors.text }]}>{formatTime(item.time_in)}</Text>
                <Text style={[styles.td, { flex: 0.8, color: colors.text }]}>{formatTime(item.time_out)}</Text>
                <Text style={[styles.td, { flex: 0.6, textAlign: 'right', color: colors.text }]}>
                  {parseFloat(item.shift_hours).toFixed(1)}{item.is_statutory ? '*' : ''}
                </Text>
                <Text style={[styles.td, { flex: 0.8, textAlign: 'right', color: colors.text }]}>{formatCurrency(item.rate)}</Text>
                <Text style={[styles.td, { flex: 0.8, textAlign: 'right', fontWeight: '600', color: colors.text }]}>
                  {formatCurrency(item.total)}
                </Text>
              </View>
            ))}
          </Card>

          {/* Totals */}
          <Card padding={14} style={{ marginTop: 12, backgroundColor: colors.card || colors.white }}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.totalVal, { color: colors.text }]}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>HST (13%)</Text>
              <Text style={[styles.totalVal, { color: colors.text }]}>{formatCurrency(invoice.hst_amount)}</Text>
            </View>
            <Text style={[styles.hstNote, { color: colors.textSecondary }]}>HST# 824640858RT0001</Text>
            <View style={[styles.totalRow, styles.grandTotal, { borderTopColor: colors.border }]}>
              <Text style={[styles.grandLabel, { color: colors.navy }]}>TOTAL DUE</Text>
              <Text style={[styles.grandVal, { color: colors.navy }]}>{formatCurrency(invoice.total_due)}</Text>
            </View>
          </Card>

          {/* Action buttons */}
          {invoice.pdf_url && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.navy, flex: 1 }]}
                onPress={() => handleShare()}
                disabled={downloading}
              >
                <Ionicons name="download-outline" size={18} color={COLORS.white} />
                <Text style={styles.actionBtnText}>{downloading ? 'Preparing…' : 'Download PDF'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.green, flex: 1 }]}
                onPress={handleEmailInvoice}
              >
                <Ionicons name="mail-outline" size={18} color={COLORS.white} />
                <Text style={styles.actionBtnText}>Email Invoice</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Status update */}
          <Text style={[styles.sectionTitle, { marginTop: 16, color: colors.text }]}>Update Status</Text>
          <View style={styles.statusBtns}>
            {['draft', 'sent', 'paid'].map(s => {
              const cfg = STATUS_CONFIG[s];
              const isActive = invoice.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusBtn,
                    { borderColor: cfg.color, backgroundColor: isActive ? cfg.color : 'transparent' },
                  ]}
                  onPress={() => handleUpdateStatus(s)}
                  disabled={updatingStatus || isActive}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusBtnText, { color: isActive ? COLORS.white : cfg.color }]}>
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  headerBtn: { padding: 4 },
  invHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 4,
  },
  invNumber: { color: '#A8C4E0', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 2 },
  invClient: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  invWeek: { color: '#A8C4E0', fontSize: 13, marginTop: 2 },
  content: { padding: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 11, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  clientName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  detail: { fontSize: 13, marginBottom: 2 },
  tableHeader: {
    flexDirection: 'row',
    padding: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  th: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  tableRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 7 },
  td: { fontSize: 11 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 14 },
  totalVal: { fontSize: 14 },
  hstNote: { fontSize: 11, fontStyle: 'italic', marginVertical: 4 },
  grandTotal: { borderTopWidth: 1, marginTop: 6, paddingTop: 8 },
  grandLabel: { fontSize: 15, fontWeight: '700' },
  grandVal: { fontSize: 18, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 10,
  },
  actionBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  statusBtns: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statusBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statusBtnText: { fontSize: 14, fontWeight: '700' },
});

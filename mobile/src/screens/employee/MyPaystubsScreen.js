import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { payrollAPI } from '../../services/api';
import { COLORS, SHADOWS } from '../../utils/colors';
import { formatCurrency, formatDate } from '../../utils/formatting';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';

export default function MyPaystubsScreen() {
  const navigation = useNavigation();
  const [paystubs, setPaystubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      const data = await payrollAPI.myPaystubs();
      setPaystubs(data);
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setLoading(false); }
  }

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, []);

  async function handleShare(item) {
    if (!item.pdf_url) return;
    try {
      const filename = `paystub_${item.start_date}.pdf`;
      const localUri = FileSystem.cacheDirectory + filename;
      if (item.pdf_url.startsWith('data:')) {
        const base64 = item.pdf_url.split(',')[1];
        await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      } else {
        await FileSystem.downloadAsync(item.pdf_url, localUri);
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri, { mimeType: 'application/pdf', dialogTitle: 'Paystub' });
      } else {
        Alert.alert('Saved', localUri);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  if (loading && paystubs.length === 0) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="My Paystubs" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.navy} />}
        showsVerticalScrollIndicator={false}
      >
        {paystubs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>No paystubs available yet</Text>
            <Text style={styles.emptySubText}>Paystubs will appear here after each pay period</Text>
          </View>
        ) : (
          <>
            {/* Summary banner */}
            <View style={styles.summaryBanner}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryVal}>{paystubs.length}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryVal}>
                  {formatCurrency(paystubs.reduce((sum, p) => sum + parseFloat(p.net_pay || 0), 0))}
                </Text>
                <Text style={styles.summaryLabel}>Net Earned</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryVal}>
                  {paystubs.reduce((sum, p) => sum + parseFloat(p.total_hours || 0), 0).toFixed(0)} hrs
                </Text>
                <Text style={styles.summaryLabel}>Total Hours</Text>
              </View>
            </View>

            {/* Timeline */}
            {paystubs.map((item, index) => {
              const isLast = index === paystubs.length - 1;
              return (
                <View key={item.id} style={styles.timelineRow}>
                  {/* Timeline spine */}
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, index === 0 && styles.timelineDotLatest]} />
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>

                  {/* Card */}
                  <TouchableOpacity
                    style={[styles.card, SHADOWS.card, !item.pdf_url && styles.cardPending]}
                    onPress={() => navigation.navigate('PDFViewer', { url: item.pdf_url, title: 'Paystub' })}
                    activeOpacity={item.pdf_url ? 0.8 : 1}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.periodBadge}>
                        <Ionicons name="calendar-outline" size={12} color={COLORS.navy} />
                        <Text style={styles.periodText}>
                          {formatDate(item.start_date, 'MMM d')} – {formatDate(item.end_date, 'MMM d, yyyy')}
                        </Text>
                      </View>
                      {item.pdf_url ? (
                        <TouchableOpacity onPress={() => handleShare(item)} style={styles.shareBtn}>
                          <Ionicons name="share-outline" size={18} color={COLORS.navy} />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingText}>Pending</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.amounts}>
                      <View style={styles.amountMain}>
                        <Text style={styles.netLabel}>Net Pay</Text>
                        <Text style={styles.netValue}>{formatCurrency(item.net_pay)}</Text>
                      </View>
                      <View style={styles.amountDetails}>
                        <View style={styles.amountDetailItem}>
                          <Text style={styles.detailLabel}>Gross</Text>
                          <Text style={styles.detailValue}>{formatCurrency(item.gross_pay)}</Text>
                        </View>
                        <View style={styles.amountDetailItem}>
                          <Text style={styles.detailLabel}>Deductions</Text>
                          <Text style={[styles.detailValue, { color: COLORS.error }]}>
                            -{formatCurrency(parseFloat(item.gross_pay) - parseFloat(item.net_pay))}
                          </Text>
                        </View>
                        <View style={styles.amountDetailItem}>
                          <Text style={styles.detailLabel}>Hours</Text>
                          <Text style={[styles.detailValue, { color: COLORS.green }]}>
                            {parseFloat(item.total_hours).toFixed(1)} hrs
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
            <View style={{ height: 20 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { flex: 1, backgroundColor: COLORS.lightGray },
  content: { padding: 16 },
  summaryBanner: {
    backgroundColor: COLORS.navy,
    borderRadius: 14,
    flexDirection: 'row',
    padding: 16,
    marginBottom: 20,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },
  timelineRow: { flexDirection: 'row', marginBottom: 16 },
  timelineLeft: { width: 28, alignItems: 'center', paddingTop: 16 },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
    borderWidth: 2,
    borderColor: COLORS.navy,
  },
  timelineDotLatest: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  timelineLine: { flex: 1, width: 2, backgroundColor: COLORS.border, marginTop: 4 },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginLeft: 8,
  },
  cardPending: { opacity: 0.7 },
  pendingBadge: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.lightBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  periodText: { fontSize: 12, fontWeight: '600', color: COLORS.navy },
  shareBtn: { padding: 4 },
  amounts: { flexDirection: 'row', alignItems: 'center' },
  amountMain: { marginRight: 16 },
  netLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  netValue: { fontSize: 22, fontWeight: '800', color: COLORS.navy },
  amountDetails: { flex: 1, gap: 4 },
  amountDetailItem: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 11, color: COLORS.textSecondary },
  detailValue: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500' },
  emptySubText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
});

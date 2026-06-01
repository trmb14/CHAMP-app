import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../utils/colors';
import ScreenHeader from '../../components/common/ScreenHeader';

// Note: react-native-pdf requires native linking.
// For managed Expo workflow, use expo-web-browser or open in browser.
export default function PDFViewerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { url, title } = route.params || {};
  const hasUrl = !!url;

  async function openInBrowser() {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open PDF. Please try again later.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={title || 'Document'} showBack />

      <View style={styles.container}>
        <View style={[styles.pdfIcon, !hasUrl && styles.pdfIconPending]}>
          <Ionicons
            name={hasUrl ? 'document-text' : 'document-text-outline'}
            size={80}
            color={hasUrl ? COLORS.navy : COLORS.textSecondary}
          />
        </View>

        <Text style={styles.title}>{title || 'Your Document'}</Text>
        <Text style={styles.subtitle}>
          {hasUrl
            ? 'Your PDF is ready. Open it in your browser to view or save.'
            : 'Your paystub is being prepared. Please check back soon.'}
        </Text>

        <TouchableOpacity
          style={[styles.openBtn, !hasUrl && styles.openBtnDisabled]}
          onPress={hasUrl ? openInBrowser : undefined}
          disabled={!hasUrl}
          activeOpacity={hasUrl ? 0.8 : 1}
        >
          <Ionicons name="open-outline" size={22} color={COLORS.white} />
          <Text style={styles.openText}>Open PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.downloadBtn, !hasUrl && styles.downloadBtnDisabled]}
          onPress={hasUrl ? openInBrowser : undefined}
          disabled={!hasUrl}
          activeOpacity={hasUrl ? 0.8 : 1}
        >
          <Ionicons
            name="download-outline"
            size={20}
            color={hasUrl ? COLORS.navy : COLORS.textSecondary}
          />
          <Text style={[styles.downloadText, !hasUrl && styles.downloadTextDisabled]}>
            Download / Share
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  pdfIcon: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.navy, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  pdfIconPending: { backgroundColor: COLORS.lightGray },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  openBtnDisabled: { backgroundColor: COLORS.border },
  openText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.navy,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  downloadBtnDisabled: { borderColor: COLORS.border },
  downloadText: { color: COLORS.navy, fontSize: 15, fontWeight: '600' },
  downloadTextDisabled: { color: COLORS.textSecondary },
});

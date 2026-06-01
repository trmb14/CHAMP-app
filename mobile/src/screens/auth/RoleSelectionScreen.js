import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import ChampLogo from '../../components/common/ChampLogo';
import { COLORS, SHADOWS } from '../../utils/colors';

export default function RoleSelectionScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[COLORS.navy, '#0D2B4E']} style={styles.gradient}>
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.content}>
          <ChampLogo size="medium" />

          <Text style={styles.title}>Join CHAMP Health Care Services</Text>
          <Text style={styles.subtitle}>Choose your account type</Text>

          {/* Employee card */}
          <TouchableOpacity
            style={[styles.card, SHADOWS.card]}
            onPress={() => navigation.navigate('EmployeeSignUp')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIcon, { backgroundColor: COLORS.navy + '15' }]}>
              <Ionicons name="person" size={36} color={COLORS.navy} />
              <View style={styles.crossBadge}>
                <Ionicons name="add" size={14} color={COLORS.white} />
              </View>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Employee</Text>
              <Text style={styles.cardDesc}>PSW, RPN, Housekeeping, and other healthcare staff</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
          </TouchableOpacity>

          {/* Client card */}
          <TouchableOpacity
            style={[styles.card, SHADOWS.card]}
            onPress={() => navigation.navigate('ClientSignUp')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIcon, { backgroundColor: COLORS.green + '15' }]}>
              <Ionicons name="business" size={36} color={COLORS.green} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Client Facility</Text>
              <Text style={styles.cardDesc}>Retirement homes and long-term care facilities</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
          </TouchableOpacity>

          <View style={styles.adminNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#7BA3C8" />
            <Text style={styles.adminNoteText}>
              Admin accounts are created by CHAMP management only
            </Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  gradient: { flex: 1 },
  backBtn: { padding: 16 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 28,
  },
  subtitle: {
    color: '#A8C4E0',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 16,
  },
  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  crossBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: COLORS.green,
    borderRadius: 8,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.navy, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  adminNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  adminNoteText: { color: '#7BA3C8', fontSize: 12, textAlign: 'center' },
});

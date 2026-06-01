import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import ChampLogo from '../../components/common/ChampLogo';
import { COLORS } from '../../utils/colors';

export default function SignUpSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const role = route.params?.role || 'employee';
  const isClient = role === 'client';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LinearGradient colors={[COLORS.navy, '#0D2B4E']} style={styles.gradient}>
        <View style={styles.content}>
          <ChampLogo size="medium" />

          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.green} />
          </View>

          <Text style={styles.title}>Application Submitted!</Text>

          <Text style={styles.body}>
            {isClient
              ? 'Your client facility account request has been received. A CHAMP administrator will review and activate your account shortly.'
              : 'Your employee account request has been received. A CHAMP administrator will review your application and activate your account shortly.'}
          </Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color="#7BA3C8" style={{ marginTop: 1 }} />
            <Text style={styles.infoText}>
              You will receive a push notification once your account is approved. You can then sign in with the credentials you created.
            </Text>
          </View>

          <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.btnText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  gradient: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 20,
  },
  iconWrap: {
    marginTop: 16,
    marginBottom: 4,
  },
  title: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: '#A8C4E0',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    color: '#A8C4E0',
    fontSize: 13,
    lineHeight: 19,
  },
  btn: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  btnText: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '700',
  },
});

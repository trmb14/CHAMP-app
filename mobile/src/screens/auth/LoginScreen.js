import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Alert, TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import ChampLogo from '../../components/common/ChampLogo';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { COLORS } from '../../utils/colors';
import {
  isBiometricSupported, isBiometricEnabled, authenticate,
  saveCredentials, getCredentials, getBiometricTypeName,
} from '../../services/biometric';

export default function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricTypeName, setBiometricTypeName] = useState('Biometrics');

  useEffect(() => {
    checkBiometric();
  }, []);

  async function checkBiometric() {
    const supported = await isBiometricSupported();
    const enabled = await isBiometricEnabled();
    setBiometricAvailable(supported);
    setBiometricEnabled(enabled);
    if (supported) {
      const name = await getBiometricTypeName();
      setBiometricTypeName(name);
    }
  }

  function validate() {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // After successful login, offer to enable biometrics if not already set up
      if (biometricAvailable && !biometricEnabled) {
        Alert.alert(
          `Enable ${biometricTypeName}?`,
          `Sign in faster next time using ${biometricTypeName}.`,
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Enable', onPress: async () => {
                await saveCredentials(email.trim().toLowerCase(), password);
                setBiometricEnabled(true);
              }
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    try {
      const credentials = await getCredentials();
      if (!credentials) {
        Alert.alert('Not Set Up', 'Please sign in with your email and password first.');
        return;
      }
      const success = await authenticate(`Sign in with ${biometricTypeName}`);
      if (!success) return;
      setLoading(true);
      await login(credentials.email, credentials.password);
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[COLORS.navy, '#0D2B4E']} style={styles.gradient}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={styles.logoSection}>
              <ChampLogo size="large" />
              <Text style={styles.tagline}>Healthcare Staffing Management</Text>
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sign In</Text>
              <Text style={styles.cardSubtitle}>Welcome back to CHAMP</Text>

              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                style={styles.input}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                error={errors.password}
                style={styles.input}
              />

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                size="large"
                style={styles.loginBtn}
              />

              {biometricAvailable && biometricEnabled && (
                <TouchableOpacity
                  style={styles.biometricBtn}
                  onPress={handleBiometricLogin}
                  disabled={loading}
                >
                  <Ionicons
                    name={biometricTypeName === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                    size={24}
                    color={COLORS.navy}
                  />
                  <Text style={styles.biometricText}>Sign in with {biometricTypeName}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot your password?</Text>
              </TouchableOpacity>

              <View style={styles.signUpRow}>
                <Text style={styles.signUpLabel}>New to CHAMP? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')}>
                  <Text style={styles.signUpLink}>Create an account</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>CHAMP Health Care Services</Text>
              <Text style={styles.footerAddress}>920 Lesage Way, Orleans, ON  •  613-824-5065</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  gradient: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  tagline: {
    color: '#A8C4E0',
    fontSize: 14,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  loginBtn: {
    marginTop: 8,
    borderRadius: 12,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.navy,
  },
  biometricText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.navy,
  },
  forgotBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '500',
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signUpLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signUpLink: {
    fontSize: 14,
    color: COLORS.navy,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
  },
  footerText: {
    color: '#A8C4E0',
    fontSize: 13,
    fontWeight: '500',
  },
  footerAddress: {
    color: '#7BA3C8',
    fontSize: 11,
  },
});

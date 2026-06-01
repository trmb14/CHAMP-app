import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { authAPI } from '../../services/api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import { COLORS } from '../../utils/colors';

export const OTTAWA_RETIREMENT_HOMES = [
  'Alta Vista Retirement Community',
  'Bearbrook Retirement Residence',
  'Island View Retirement Residence',
  'Queenswood Villa',
  "Shepherd's of Good Hope",
  'Amica Beechwood',
  'Amica Westboro',
  'Amica Kanata',
  'Bruyère Village',
  'The Glebe Centre',
  'Carleton Lodge',
  'Carlingview Manor',
  'Extendicare Medex',
  'Extendicare West End Villa',
  'Forest Hill Retirement Residence',
  'Garden Terrace Retirement Residence',
  'Granite Ridge Retirement Living',
  'Hillel Lodge',
  'Maison Deschatelets',
  'Manor Village Life Centers',
  'Merivale Gardens',
  'Mon Sheong Ottawa Care Centre',
  'Montfort Renaissance',
  'Ottawa Hebrew Centre (Hillel Lodge)',
  'Peter D. Clark Long-Term Care Centre',
  'Riverstone Retirement Communities',
  'Rideau Place On-The-River',
  'Rothwell Heights Retirement Residence',
  'Royal Ottawa Place',
  'Stonebridge Retirement Community',
  'Sun Life Financial Centre for Active Living',
  "The Perley and Rideau Veterans' Health Centre",
  'The Wexford',
  'Twilight Wish Foundation Ottawa',
  'Villa Marconi Long Term Care Centre',
  'Waterford Retirement Residence',
  'Westwood Long Term Care Centre',
  'Winchester District Memorial Hospital LTC',
];

export default function ClientSignUpScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', confirm_password: '', client_facility: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validate() {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.last_name.trim()) e.last_name = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    if (!form.client_facility) e.client_facility = 'Please select your retirement home';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await authAPI.register({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirm_password: form.confirm_password,
        role: 'client',
        client_facility: form.client_facility === '__other__' ? 'Other' : form.client_facility,
      });
      navigation.replace('SignUpSuccess', { role: 'client' });
    } catch (err) {
      Alert.alert('Sign Up Failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[COLORS.navy, '#0D2B4E']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Client Facility Sign Up</Text>
          <View style={{ width: 38 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Create Your Account</Text>
              <Text style={styles.cardSub}>Fill in your details to get started</Text>

              <View style={styles.nameRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="First Name"
                    value={form.first_name}
                    onChangeText={v => setField('first_name', v)}
                    placeholder="John"
                    autoCapitalize="words"
                    error={errors.first_name}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Last Name"
                    value={form.last_name}
                    onChangeText={v => setField('last_name', v)}
                    placeholder="Smith"
                    autoCapitalize="words"
                    error={errors.last_name}
                  />
                </View>
              </View>

              <Input
                label="Email Address"
                value={form.email}
                onChangeText={v => setField('email', v)}
                placeholder="john@facility.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                style={styles.field}
              />
              <Input
                label="Password"
                value={form.password}
                onChangeText={v => setField('password', v)}
                placeholder="Min. 8 characters"
                secureTextEntry
                error={errors.password}
                style={styles.field}
              />
              <Input
                label="Confirm Password"
                value={form.confirm_password}
                onChangeText={v => setField('confirm_password', v)}
                placeholder="Re-enter password"
                secureTextEntry
                error={errors.confirm_password}
                style={styles.field}
              />

              <SearchableDropdown
                label="Retirement Home"
                options={OTTAWA_RETIREMENT_HOMES}
                value={form.client_facility}
                onSelect={v => setField('client_facility', v)}
                placeholder="Select your facility"
                error={errors.client_facility}
              />

              <Button
                title="Create Account"
                onPress={handleSubmit}
                loading={loading}
                variant="success"
                size="large"
                style={{ marginTop: 4 }}
              />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  scroll: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: COLORS.navy, marginBottom: 4 },
  cardSub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 20 },
  nameRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  field: { marginBottom: 4 },
});

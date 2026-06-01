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
import { COLORS } from '../../utils/colors';
import { POSITIONS, POSITION_LABELS } from '../../utils/formatting';

const POSITION_OPTIONS = POSITIONS.map(p => ({ label: POSITION_LABELS[p], value: p }));

export default function EmployeeSignUpScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    first_name: '', last_name: '', position: '', email: '', password: '', confirm_password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [posOpen, setPosOpen] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validate() {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.last_name.trim()) e.last_name = 'Last name is required';
    if (!form.position) e.position = 'Position is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
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
        role: 'employee',
        position: form.position,
      });
      navigation.replace('SignUpSuccess', { role: 'employee' });
    } catch (err) {
      Alert.alert('Sign Up Failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedPos = POSITION_OPTIONS.find(p => p.value === form.position);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[COLORS.navy, '#0D2B4E']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Employee Sign Up</Text>
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
                    placeholder="Jane"
                    autoCapitalize="words"
                    error={errors.first_name}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Last Name"
                    value={form.last_name}
                    onChangeText={v => setField('last_name', v)}
                    placeholder="Doe"
                    autoCapitalize="words"
                    error={errors.last_name}
                  />
                </View>
              </View>

              {/* Position picker */}
              <Text style={styles.fieldLabel}>Position</Text>
              <TouchableOpacity
                style={[styles.picker, errors.position && styles.pickerError]}
                onPress={() => setPosOpen(!posOpen)}
              >
                <Text style={[styles.pickerText, !form.position && styles.pickerPlaceholder]}>
                  {selectedPos ? selectedPos.label : 'Select your position'}
                </Text>
                <Ionicons name={posOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {posOpen && (
                <View style={styles.posDropdown}>
                  {POSITION_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.posOption, form.position === opt.value && styles.posOptionActive]}
                      onPress={() => { setField('position', opt.value); setPosOpen(false); }}
                    >
                      <Text style={[styles.posOptionText, form.position === opt.value && styles.posOptionTextActive]}>
                        {opt.label}
                      </Text>
                      {form.position === opt.value && <Ionicons name="checkmark" size={16} color={COLORS.navy} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {errors.position && <Text style={styles.errorText}>{errors.position}</Text>}

              <Input
                label="Email Address"
                value={form.email}
                onChangeText={v => setField('email', v)}
                placeholder="jane@email.com"
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

              <Button
                title="Create Account"
                onPress={handleSubmit}
                loading={loading}
                variant="success"
                size="large"
                style={{ marginTop: 8 }}
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
  scroll: { padding: 20, paddingTop: 8 },
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
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: COLORS.white,
  },
  pickerError: { borderColor: COLORS.error },
  pickerText: { flex: 1, fontSize: 15, color: COLORS.text },
  pickerPlaceholder: { color: COLORS.textSecondary },
  posDropdown: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  posOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  posOptionActive: { backgroundColor: COLORS.lightBlue },
  posOptionText: { fontSize: 14, color: COLORS.text },
  posOptionTextActive: { color: COLORS.navy, fontWeight: '600' },
  errorText: { color: COLORS.error, fontSize: 12, marginTop: 4, marginBottom: 8 },
  field: { marginBottom: 4 },
});

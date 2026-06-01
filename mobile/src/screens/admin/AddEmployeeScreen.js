import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usersAPI } from '../../services/api';
import { COLORS } from '../../utils/colors';
import { POSITIONS } from '../../utils/formatting';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ScreenHeader from '../../components/common/ScreenHeader';

const ROLES = ['employee', 'admin', 'superadmin'];

export default function AddEmployeeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { employeeId } = route.params || {};
  const isEdit = !!employeeId;
  const { isSuperAdmin } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    position: 'PSW',
    pay_rate: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) loadEmployee();
  }, []);

  async function loadEmployee() {
    try {
      const emp = await usersAPI.get(employeeId);
      setForm({
        name: emp.name,
        email: emp.email,
        password: '',
        role: emp.role,
        position: emp.position || 'PSW',
        pay_rate: String(emp.pay_rate || ''),
        phone: emp.phone || '',
      });
    } catch (err) { Alert.alert('Error', err.message); }
  }

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!isEdit && !form.password) errs.password = 'Password is required';
    if (!form.pay_rate || isNaN(parseFloat(form.pay_rate))) errs.pay_rate = 'Valid pay rate required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const data = { ...form, pay_rate: parseFloat(form.pay_rate) };
      if (isEdit && !data.password) delete data.password;
      if (isEdit) {
        await usersAPI.update(employeeId, data);
      } else {
        await usersAPI.create(data);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  const ChipSelector = ({ label, options, value, onSelect }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, value === opt && styles.chipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={isEdit ? 'Edit Employee' : 'Add Employee'} showBack />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Input label="Full Name *" value={form.name} onChangeText={v => setField('name', v)} placeholder="Jane Doe" autoCapitalize="words" error={errors.name} />
          <Input label="Email *" value={form.email} onChangeText={v => setField('email', v)} placeholder="jane@champ.ca" keyboardType="email-address" error={errors.email} />
          <Input label={isEdit ? 'New Password (leave blank to keep)' : 'Password *'} value={form.password} onChangeText={v => setField('password', v)} secureTextEntry placeholder={isEdit ? 'Leave blank to keep current' : 'Min 8 characters'} error={errors.password} />
          <Input label="Phone" value={form.phone} onChangeText={v => setField('phone', v)} placeholder="613-555-0100" keyboardType="phone-pad" />
          <Input label="Pay Rate ($/hr) *" value={form.pay_rate} onChangeText={v => setField('pay_rate', v)} placeholder="24.00" keyboardType="decimal-pad" error={errors.pay_rate} />

          <ChipSelector label="Position" options={POSITIONS} value={form.position} onSelect={v => setField('position', v)} />

          {isSuperAdmin() && (
            <ChipSelector label="Role" options={ROLES} value={form.role} onSelect={v => setField('role', v)} />
          )}

          <Button title={isEdit ? 'Save Changes' : 'Add Employee'} onPress={handleSave} loading={saving} size="large" style={{ marginTop: 16, marginBottom: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { flex: 1, backgroundColor: COLORS.white },
  form: { padding: 20 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.navy, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  chipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  chipTextActive: { color: COLORS.white },
});

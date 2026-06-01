import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  enabled: 'champ_biometric_enabled',
  email: 'champ_saved_email',
  password: 'champ_saved_password',
};

export async function isBiometricSupported() {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function getBiometricTypeName() {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Touch ID';
  return 'Biometrics';
}

export async function isBiometricEnabled() {
  const val = await SecureStore.getItemAsync(KEYS.enabled);
  return val === 'true';
}

export async function authenticate(promptMessage) {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: promptMessage || 'Authenticate to continue',
    cancelLabel: 'Cancel',
    fallbackLabel: 'Use Password',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function saveCredentials(email, password) {
  await SecureStore.setItemAsync(KEYS.email, email);
  await SecureStore.setItemAsync(KEYS.password, password);
  await SecureStore.setItemAsync(KEYS.enabled, 'true');
}

export async function getCredentials() {
  const email = await SecureStore.getItemAsync(KEYS.email);
  const password = await SecureStore.getItemAsync(KEYS.password);
  return email && password ? { email, password } : null;
}

export async function clearCredentials() {
  await SecureStore.deleteItemAsync(KEYS.enabled);
  await SecureStore.deleteItemAsync(KEYS.email);
  await SecureStore.deleteItemAsync(KEYS.password);
}

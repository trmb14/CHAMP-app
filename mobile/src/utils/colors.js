import { useColorScheme } from 'react-native';

export const COLORS = {
  navy: '#1F4E79',
  green: '#7AA84A',
  white: '#FFFFFF',
  lightBlue: '#D9E2F3',
  gray: '#666666',
  lightGray: '#F5F5F5',
  border: '#E0E0E0',
  error: '#C0392B',
  success: '#27AE60',
  warning: '#F39C12',
  text: '#1A1A2E',
  textSecondary: '#666666',
  background: '#F5F5F5',
  card: '#FFFFFF',

  // Client colors
  clients: {
    IS: '#FCE4D6',   // Island View — Peach
    SGH: '#DDEBF7',  // Shepherd's — Light Blue
    QW: '#E2EFDA',   // Queenswood — Light Green
    BR: '#FFF2CC',   // Bearbrook — Light Yellow
    AL: '#EDE7F6',   // Alta Vista — Light Purple
  },

  clientText: {
    IS: '#C0392B',
    SGH: '#1F4E79',
    QW: '#27AE60',
    BR: '#D4AC0D',
    AL: '#6C3483',
  },

  statutory: '#FFE699',
};

export const DARK_COLORS = {
  navy: '#1F4E79',
  green: '#7AA84A',
  white: '#1A3550',
  lightBlue: '#152A3D',
  gray: '#8899AA',
  lightGray: '#0D2137',
  border: '#2A4565',
  error: '#E74C3C',
  success: '#2ECC71',
  warning: '#F39C12',
  text: '#E8F0F8',
  textSecondary: '#8AAABB',
  background: '#0D2137',
  card: '#1A3550',

  clients: {
    IS: '#3D1F10',
    SGH: '#152A3D',
    QW: '#152D15',
    BR: '#302810',
    AL: '#221840',
  },

  clientText: {
    IS: '#F4B898',
    SGH: '#7AB8EE',
    QW: '#7AC870',
    BR: '#E8D060',
    AL: '#C0A8F8',
  },

  statutory: '#302810',
};

export function useColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DARK_COLORS : COLORS;
}

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    shadowColor: '#1F4E79',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
};

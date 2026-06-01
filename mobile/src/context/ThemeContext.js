import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS, DARK_COLORS } from '../utils/colors';

const ThemeContext = createContext({ isDark: false, colors: COLORS });

export function ThemeProvider({ children }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  return (
    <ThemeContext.Provider value={{ isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

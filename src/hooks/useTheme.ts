import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { COLORS } from '../constants/theme';

export const useTheme = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useTheme must be used within AppProvider');

  const { state: { darkMode }, dispatch } = context;
  const colors = darkMode ? COLORS.dark : COLORS.light;

  const toggleTheme = () => {
    const newMode = !darkMode;
    dispatch({ type: 'SET_DARK_MODE', payload: newMode });
    import('@react-native-async-storage/async-storage')
      .then(m => m.default.setItem('@dark_mode', String(newMode)));
  };

  return { darkMode, colors, toggleTheme };
};

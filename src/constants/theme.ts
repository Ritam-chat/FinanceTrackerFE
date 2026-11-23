export const COLORS = {
  dark: {
    background: '#0F0F14',
    surface: '#1A1A24',
    surfaceAlt: '#22222F',
    border: '#2E2E40',
    text: '#F0F0F8',
    textSecondary: '#8888AA',
    // Accents
    blue: '#4A9EFF',
    amber: '#FFB347',
    green: '#4CAF82',
    red: '#FF6B6B',
    purple: '#9B6FFF',
  },
  light: {
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceAlt: '#F0F2F5',
    border: '#E1E4E8',
    text: '#1A1A24',
    textSecondary: '#6A737D',
    // Accents
    blue: '#0366D6',
    amber: '#D97706',
    green: '#28A745',
    red: '#D73A49',
    purple: '#6F42C1',
  }
};

export const BANK_COLORS: Record<string, keyof typeof COLORS.dark> = {
  HDFC: 'blue',
  SBI: 'blue',
  ONE: 'amber',
  IDFC: 'amber',
  KOTAK: 'red',
  HSBC: 'red',
  AXIS: 'purple',
  ICICI: 'amber',
  'YES BANK': 'blue',
  AMEX: 'blue',
  RBL: 'purple',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface BadgeProps {
  label: string;
  variant?: 'blue' | 'amber' | 'green' | 'red' | 'purple' | 'gray';
  style?: any;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'gray', style }) => {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'blue': return { bg: `${colors.blue}20`, text: colors.blue };
      case 'amber': return { bg: `${colors.amber}20`, text: colors.amber };
      case 'green': return { bg: `${colors.green}20`, text: colors.green };
      case 'red': return { bg: `${colors.red}20`, text: colors.red };
      case 'purple': return { bg: `${colors.purple}20`, text: colors.purple };
      default: return { bg: colors.surfaceAlt, text: colors.textSecondary };
    }
  };

  const currentStyles = getVariantStyles();

  return (
    <View style={[styles.container, { backgroundColor: currentStyles.bg }, style]}>
      <Text style={[styles.text, { color: currentStyles.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

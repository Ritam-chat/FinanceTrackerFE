import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatAmount } from '../../utils/formatters';

interface SummaryCardProps {
  title: string;
  amount: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  variant?: 'blue' | 'purple' | 'amber' | 'green' | 'red';
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, icon, variant = 'blue' }) => {
  const { colors } = useTheme();

  const colorHex = colors[variant];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconWrapper, { backgroundColor: `${colorHex}15` }]}>
        <MaterialCommunityIcons name={icon} size={24} color={colorHex} />
      </View>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      <Text style={[styles.amount, { color: colors.text }]}>{formatAmount(amount.toString())}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    minWidth: 150,
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    justifyContent: 'space-between',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
  },
});

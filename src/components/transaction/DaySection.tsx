import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FlatTransaction } from '../../utils/flatten';
import { formatAmount } from '../../utils/formatters';

interface DaySectionProps {
  dateLabel: string;
  debitTotal: number;
  creditTotal: number;
}

export const DaySection: React.FC<DaySectionProps> = ({ dateLabel, debitTotal, creditTotal }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{dateLabel}</Text>
      <View style={styles.totals}>
        {creditTotal > 0 && (
          <Text style={[styles.totalText, { color: colors.green }]}>
            +{formatAmount(creditTotal.toString())}
          </Text>
        )}
        {debitTotal > 0 && (
          <Text style={[styles.totalText, { color: colors.red, marginLeft: 8 }]}>
            -{formatAmount(debitTotal.toString())}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totals: {
    flexDirection: 'row',
  },
  totalText: {
    fontSize: 13,
    fontWeight: '600',
  }
});

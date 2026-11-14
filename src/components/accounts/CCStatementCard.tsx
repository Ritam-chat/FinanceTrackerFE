import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FlatTransaction } from '../../utils/flatten';
import { filterTxForPeriod, getStatementPeriod } from '../../utils/ccStatement';
import { formatAmount } from '../../utils/formatters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CCStatementCardProps {
  bank: string;
  account: string;
  transactions: FlatTransaction[];
  statementDay: number;
  onSaveDay: (day: number) => void;
}

export const CCStatementCard: React.FC<CCStatementCardProps> = ({ bank, account, transactions, statementDay: initDay, onSaveDay }) => {
  const { colors } = useTheme();

  const [statementDay, setStatementDay] = useState<number>(initDay);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(initDay.toString());

  useEffect(() => {
    setStatementDay(initDay);
    setInputValue(initDay.toString());
  }, [initDay]);

  const handleSaveDay = () => {
    let day = parseInt(inputValue, 10);
    if (isNaN(day) || day < 1 || day > 28) day = 15;

    setStatementDay(day);
    setInputValue(day.toString());
    setIsEditing(false);
    onSaveDay(day);
  };

  const period = getStatementPeriod(statementDay);
  const periodTxs = filterTxForPeriod(transactions, period.from, period.to, bank, account);

  // Calculate total spent in this period
  const totalSpent = periodTxs.reduce((sum, tx) => {
    const amount = tx.split?.enabled ? tx.split.myShare : parseFloat(tx.amount);
    return sum + amount;
  }, 0);

  const formatShortDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  // Due date is usually 20 days after statement date
  const dueDate = new Date(period.to);
  dueDate.setDate(dueDate.getDate() + 20);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="credit-card-chip-outline" size={24} color={colors.amber} style={{ marginRight: 8 }} />
          <Text style={[styles.bankName, { color: colors.text }]}>{bank} (**** **** **** {account})</Text>
        </View>
      </View>

      <View style={[styles.periodBox, { backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Statement Period</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {formatShortDate(period.from)} — {formatShortDate(period.to)}
          </Text>
        </View>

        {isEditing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              keyboardType="numeric"
              value={inputValue}
              onChangeText={setInputValue}
              maxLength={2}
              autoFocus
            />
            <TouchableOpacity onPress={handleSaveDay} style={{ marginLeft: 8 }}>
              <Text style={{ color: colors.blue, fontWeight: '600' }}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text style={{ color: colors.blue, fontSize: 12 }}>Edit Day ({statementDay})</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Total Spent</Text>
          <Text style={[styles.amount, { color: colors.red }]}>{formatAmount(totalSpent.toString())}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Payment Due</Text>
          <Text style={[styles.value, { color: colors.text }]}>{formatShortDate(dueDate)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '700',
  },
  periodBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    width: 40,
    height: 32,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 22,
    fontWeight: '800',
  }
});

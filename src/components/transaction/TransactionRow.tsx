import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FlatTransaction } from '../../utils/flatten';
import { useTheme } from '../../hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge } from '../ui/Badge';
import { formatAmount } from '../../utils/formatters';

interface TransactionRowProps {
  transaction: FlatTransaction;
  onPress: () => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ transaction, onPress }) => {
  const { colors } = useTheme();
  const context = useContext(AppContext);
  const spendType = context?.state?.spendType || 'my';
  
  const isDebit = transaction.type === 'Debit';
  const amountColor = isDebit ? colors.red : colors.green;
  const isSplit = transaction.split?.enabled;
  const displayAmount = (isSplit && isDebit && spendType === 'my') ? transaction.split!.myShare : parseFloat(transaction.amount);

  const getModeIcon = () => {
    switch (transaction.mode) {
      case 'UPI': return 'qrcode-scan';
      case 'Card': return 'credit-card-outline';
      case 'Withdrawal': return 'cash-multiple';
      case 'Refund': return 'cash-refund';
      default: return 'bank-outline';
    }
  };

  const getBankIcon = () => {
    return transaction.accountType === 'Credit Card' ? 'credit-card-chip' : 'bank';
  };
  
  const bankColor = transaction.accountType === 'Credit Card' ? colors.amber : colors.blue;

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${bankColor}15` }]}>
        <MaterialCommunityIcons name={getBankIcon()} size={20} color={bankColor} />
      </View>
      
      <View style={styles.centerCol}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {transaction.to_from || transaction.mode}
        </Text>
        <View style={styles.badges}>
          <Badge label={`${transaction.bank} • ${transaction.account}`} variant="blue" style={{ marginRight: 4 }} />
          <Badge label={transaction.mode} variant="gray" style={{ marginRight: 4 }} />
          {isSplit && <Badge label="SPLIT" variant="purple" style={{ marginRight: 4 }}/>}
          {transaction.tags.includes('Ignore') && <Badge label="IGNORED" variant="red" style={{ marginRight: 4 }}/>}
        </View>
      </View>

      <View style={styles.rightCol}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {isDebit ? '-' : '+'}{formatAmount(displayAmount.toString())}
        </Text>
        <Text style={[styles.time, { color: colors.textSecondary }]}>
          {transaction.time.split(',')[1]?.trim() || transaction.time}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  centerCol: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
  }
});

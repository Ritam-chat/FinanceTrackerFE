import React, { useContext, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { AppContext, ConfiguredBank } from '../../src/context/AppContext';
import { CCStatementCard } from '../../src/components/accounts/CCStatementCard';
import { EmptyState } from '../../src/components/ui/SkeletonRow';

export default function AccountsScreen() {
  const { colors } = useTheme();
  const { state: { transactions, configuredBanks, customTags }, saveConfiguredBanks, saveCustomTags } = useContext(AppContext)!;

  const [newTag, setNewTag] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [bankName, setBankName] = useState('');
  const [customBankName, setCustomBankName] = useState('');
  const [nickname, setNickname] = useState('');
  const [accountDigits, setAccountDigits] = useState('');
  const [accountType, setAccountType] = useState<'Savings' | 'Credit Card'>('Savings');

  // Linked card management state
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [newCardDigits, setNewCardDigits] = useState('');
  const [newCardNickname, setNewCardNickname] = useState('');

  const handleAddBank = async () => {
    const finalBank = bankName === 'Other' ? customBankName.trim() : bankName.trim();
    if (!finalBank) {
      Alert.alert('Error', 'Bank name is required');
      return;
    }
    const newBank: ConfiguredBank = {
      id: Math.random().toString(36).substring(7),
      bankName: finalBank,
      accountDigits: accountDigits.trim(),
      accountType,
      nickname: nickname.trim() || undefined,
    };
    const success = await saveConfiguredBanks([...configuredBanks, newBank]);
    if (success) {
      setIsAdding(false);
      setBankName('');
      setCustomBankName('');
      setNickname('');
      setAccountDigits('');
      setAccountType('Savings');
    } else {
      Alert.alert('Error', 'Failed to save configuration');
    }
  };

  const handleRemoveBank = async (id: string) => {
    await saveConfiguredBanks(configuredBanks.filter(b => b.id !== id));
  };

  const updateConfiguredBank = async (id: string, partial: Partial<ConfiguredBank>) => {
    const updated = configuredBanks.map(b => b.id === id ? { ...b, ...partial } : b);
    await saveConfiguredBanks(updated);
  };

  const accountGroups = useMemo(() => {
    const ccList = configuredBanks.filter(b => b.accountType === 'Credit Card');
    const savingsList = configuredBanks.filter(b => b.accountType === 'Savings');
    return { ccList, savingsList };
  }, [configuredBanks]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Accounts</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
        
        {/* User Specific Configurations */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>My Bank Configurations</Text>
        
        {configuredBanks.map(bank => (
          <View key={bank.id} style={[styles.configCard, { backgroundColor: colors.surface, flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
                   {bank.bankName} {bank.nickname ? `• ${bank.nickname} ` : ''}{bank.accountDigits ? `(••${bank.accountDigits})` : ''}
                </Text>
                <Text style={{ color: colors.textSecondary }}>{bank.accountType}</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                {bank.accountType === 'Savings' && (
                  <TouchableOpacity onPress={() => setEditingBankId(editingBankId === bank.id ? null : bank.id)} style={{ marginRight: 16 }}>
                    <Text style={{ color: colors.blue, fontWeight: '600' }}>{editingBankId === bank.id ? 'Close' : 'Cards'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleRemoveBank(bank.id)}>
                  <Text style={{ color: colors.red, fontWeight: '600' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>

            {editingBankId === bank.id && bank.accountType === 'Savings' && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8, fontSize: 14 }}>Linked Debit Cards</Text>
                
                {/* List existing cards */}
                {Object.entries(bank.linkedCards || {}).map(([digits, nickname]) => (
                  <View key={digits} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>••{digits} ({nickname})</Text>
                    <TouchableOpacity onPress={() => {
                      const updatedCards = { ...bank.linkedCards };
                      delete updatedCards[digits];
                      updateConfiguredBank(bank.id, { linkedCards: updatedCards });
                    }}>
                      <Text style={{ color: colors.red, fontSize: 12, fontWeight: '500' }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add new card form */}
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  <TextInput
                    style={[styles.smallInput, { color: colors.text, borderColor: colors.border, width: 80 }]}
                    placeholder="Digits"
                    placeholderTextColor={colors.textSecondary}
                    value={newCardDigits}
                    onChangeText={setNewCardDigits}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  <TextInput
                    style={[styles.smallInput, { color: colors.text, borderColor: colors.border, flex: 1, marginLeft: 8 }]}
                    placeholder="Nickname (e.g. Visa)"
                    placeholderTextColor={colors.textSecondary}
                    value={newCardNickname}
                    onChangeText={setNewCardNickname}
                  />
                  <TouchableOpacity 
                    style={{ backgroundColor: colors.blue, paddingHorizontal: 12, borderRadius: 6, marginLeft: 8, justifyContent: 'center' }}
                    onPress={() => {
                      if (newCardDigits.length < 3) {
                        Alert.alert('Error', 'Please enter at least 3-4 digits');
                        return;
                      }
                      const updatedCards = { ...(bank.linkedCards || {}), [newCardDigits]: newCardNickname || 'Debit Card' };
                      updateConfiguredBank(bank.id, { linkedCards: updatedCards });
                      setNewCardDigits('');
                      setNewCardNickname('');
                    }}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 18 }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}

        {isAdding ? (
          <View style={[styles.formContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Select Bank</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {['HDFC', 'SBI', 'ONE', 'IDFC', 'AXIS', 'ICICI', 'KOTAK', 'HSBC', 'YES BANK', 'AMEX', 'RBL', 'PAYTM', 'KIWI', 'Other'].map(b => (
                <TouchableOpacity 
                  key={b} 
                  style={[
                    styles.bankChip, 
                    { borderColor: colors.border },
                    bankName === b && { backgroundColor: colors.blue, borderColor: colors.blue }
                  ]}
                  onPress={() => setBankName(b)}
                >
                  <Text style={{ color: bankName === b ? '#FFF' : colors.text, fontSize: 13, fontWeight: '500' }}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {bankName === 'Other' && (
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="Enter Provider / Bank Name (e.g. AMEX)"
                placeholderTextColor={colors.textSecondary}
                value={customBankName}
                onChangeText={setCustomBankName}
                autoCapitalize="characters"
              />
            )}
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder={accountType === 'Credit Card' ? "Card Nickname (e.g. 811, Live Plus, Millennia)" : "Account Nickname (Optional)"}
              placeholderTextColor={colors.textSecondary}
              value={nickname}
              onChangeText={setNickname}
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Account Last Digits (Optional)"
              placeholderTextColor={colors.textSecondary}
              value={accountDigits}
              onChangeText={setAccountDigits}
              keyboardType="numeric"
            />
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <TouchableOpacity 
                 style={[styles.toggleBtn, { backgroundColor: accountType === 'Savings' ? colors.blue : colors.surfaceAlt }]}
                 onPress={() => setAccountType('Savings')}>
                 <Text style={{ color: accountType === 'Savings' ? '#FFF' : colors.text }}>Savings</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                 style={[styles.toggleBtn, { backgroundColor: accountType === 'Credit Card' ? colors.blue : colors.surfaceAlt, marginLeft: 8 }]}
                 onPress={() => setAccountType('Credit Card')}>
                 <Text style={{ color: accountType === 'Credit Card' ? '#FFF' : colors.text }}>Credit Card</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <TouchableOpacity onPress={() => setIsAdding(false)} style={[styles.actionBtn, { borderColor: colors.border, borderWidth: 1, backgroundColor: 'transparent' }]}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddBank} style={[styles.actionBtn, { backgroundColor: colors.blue }]}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Save Configuration</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={[styles.addBtn, { borderColor: colors.blue }]} onPress={() => setIsAdding(true)}>
             <Text style={{ color: colors.blue, fontWeight: '600' }}>+ Add Bank Configuration</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Credit Card Statements</Text>
        
        {accountGroups.ccList.length === 0 ? (
          <EmptyState message="No credit cards found." />
        ) : (
          accountGroups.ccList.map(cc => (
            <CCStatementCard 
              key={cc.id} 
              bank={cc.bankName} 
              account={cc.accountDigits}
              nickname={cc.nickname}
              transactions={transactions} 
              statementDay={cc.statementDay || 15}
              onSaveDay={(day) => updateConfiguredBank(cc.id, { statementDay: day })}
            />
          ))
        )}

        <View style={{ height: 32 }} />
        
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Savings Accounts Overview</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
          Historical data shows we have tracked transactions for {accountGroups.savingsList.length} savings accounts.
          Balances are not tracked to preserve privacy.
        </Text>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {accountGroups.savingsList.map((acc) => {
             return (
               <View key={acc.id} style={[styles.savingsChip, { backgroundColor: colors.surface }]}>
                 <Text style={{ color: colors.text, fontWeight: '600' }}>{acc.bankName}</Text>
                 <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{acc.accountDigits ? `...${acc.accountDigits}` : 'All'}</Text>
               </View>
             );
          })}
        </View>

        <View style={{ height: 32 }} />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Custom Tags</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
          Manage your transaction tags (Max 20).
        </Text>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
          {customTags.map((tag) => (
            <View key={tag} style={[styles.bankChip, { borderColor: colors.border, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '500' }}>{tag}</Text>
              <TouchableOpacity 
                style={{ marginLeft: 8 }}
                onPress={() => {
                  const updatedTags = customTags.filter(t => t !== tag);
                  saveCustomTags(updatedTags);
                }}
              >
                <Text style={{ color: colors.red, fontSize: 16 }}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {customTags.length < 20 && (
          <View style={{ flexDirection: 'row' }}>
            <TextInput
              style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, marginBottom: 0 }]}
              placeholder="Add new tag"
              placeholderTextColor={colors.textSecondary}
              value={newTag}
              onChangeText={setNewTag}
              onSubmitEditing={() => {
                if (newTag.trim() && !customTags.includes(newTag.trim())) {
                  saveCustomTags([...customTags, newTag.trim()]);
                  setNewTag('');
                }
              }}
            />
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.blue, flex: 0, paddingHorizontal: 24, marginLeft: 8 }]}
              onPress={() => {
                if (newTag.trim() && !customTags.includes(newTag.trim())) {
                  saveCustomTags([...customTags, newTag.trim()]);
                  setNewTag('');
                }
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Add</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 32 }} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  bankChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    height: 36,
    justifyContent: 'center',
  },
  savingsChip: {
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    marginBottom: 12,
    alignItems: 'center',
    width: 100,
  },
  configCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
  },
  formContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  smallInput: {
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 13,
  },
  toggleBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  actionBtn: {
    height: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    marginHorizontal: 4,
  },
  addBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 8,
    borderStyle: 'dashed',
    marginBottom: 16,
  }
});

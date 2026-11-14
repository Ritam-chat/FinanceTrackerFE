import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { AppContext } from '../../context/AppContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const CategorizationRulesModal: React.FC<Props> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const context = useContext(AppContext);
  if (!context) return null;

  const { state: { categorizationRules, categories }, saveCategorizationRules, applyCategorizationRulesToPast } = context;

  const [keywordInput, setKeywordInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || 'Food & Dining');
  const [isMigrating, setIsMigrating] = useState(false);

  const ruleEntries = Object.entries(categorizationRules || {});

  const handleAddRule = async () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Invalid Merchant Keyword', 'Please enter a valid merchant keyword (e.g. Swiggy, Amazon).');
      return;
    }

    const updatedRules = { ...categorizationRules, [trimmed]: selectedCategory };
    const success = await saveCategorizationRules(updatedRules);
    if (success) {
      setKeywordInput('');
    } else {
      Alert.alert('Error', 'Failed to save categorization rule.');
    }
  };

  const handleDeleteRule = async (pattern: string) => {
    const updated = { ...categorizationRules };
    delete updated[pattern];
    await saveCategorizationRules(updated);
  };

  const handleMigratePast = async () => {
    if (ruleEntries.length === 0) {
      Alert.alert('No Rules Defined', 'Please add at least one categorization rule before running migration.');
      return;
    }

    Alert.alert(
      'Migrate Past Transactions',
      `This will apply your ${ruleEntries.length} rule(s) across all past transactions. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply Rules',
          onPress: async () => {
            setIsMigrating(true);
            const { updatedCount } = await applyCategorizationRulesToPast();
            setIsMigrating(false);
            Alert.alert(
              'Migration Complete',
              updatedCount > 0
                ? `Successfully categorized ${updatedCount} past transaction(s)!`
                : 'All past transactions already match your current rules!'
            );
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Categorization Rules</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Automatically assign categories based on merchant names.
          </Text>

          {/* Add Rule Form */}
          <View style={[styles.card, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.text }]}>Add New Rule</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Merchant keyword (e.g., Uber, Swiggy)"
              placeholderTextColor={colors.textSecondary}
              value={keywordInput}
              onChangeText={setKeywordInput}
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 8 }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedCategory === cat ? colors.purple : colors.background,
                      borderColor: selectedCategory === cat ? colors.purple : colors.border,
                    }
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={{ color: selectedCategory === cat ? '#FFF' : colors.text, fontSize: 12, fontWeight: '600' }}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.purple }]} onPress={handleAddRule}>
              <Text style={{ color: '#FFF', fontWeight: '700' }}>Save Rule</Text>
            </TouchableOpacity>
          </View>

          {/* Rules List */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Rules ({ruleEntries.length})</Text>
          <ScrollView style={styles.rulesList} showsVerticalScrollIndicator={false}>
            {ruleEntries.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginVertical: 16 }}>
                No rules created yet. Add one above!
              </Text>
            ) : (
              ruleEntries.map(([pattern, cat]) => (
                <View key={pattern} style={[styles.ruleRow, { borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{pattern}</Text>
                    <Text style={{ color: colors.purple, fontSize: 13, marginTop: 2 }}>➔ {cat}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteRule(pattern)} style={{ padding: 4 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.red} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          {/* Migrate Button */}
          <TouchableOpacity
            style={[styles.migrateBtn, { backgroundColor: colors.blue, opacity: isMigrating ? 0.7 : 1 }]}
            onPress={handleMigratePast}
            disabled={isMigrating}
          >
            {isMigrating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="database-sync" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.migrateBtnText}>Apply Rules to Past Transactions</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  sub: {
    fontSize: 13,
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  addBtn: {
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  rulesList: {
    flex: 1,
    marginBottom: 16,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  migrateBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  migrateBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

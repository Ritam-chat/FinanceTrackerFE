import React, { useState, useRef, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Linking, useWindowDimensions, Modal, Animated, TouchableWithoutFeedback } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { FlatTransaction } from '../../utils/flatten';
import { useTheme } from '../../hooks/useTheme';
import { AppContext } from '../../context/AppContext';
import { TagPill } from '../ui/TagPill';
import { Badge } from '../ui/Badge';
import { formatAmount } from '../../utils/formatters';
import { SplitExpenseFlow } from './SplitExpenseFlow';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTransactions } from '../../hooks/useTransactions';

interface TransactionDetailSheetProps {
  transaction: FlatTransaction;
  onClose: () => void;
}

export const TransactionDetailSheet: React.FC<TransactionDetailSheetProps> = ({ transaction, onClose }) => {
  const { colors } = useTheme();
  const { state: { customTags, categories, categorizationRules }, updateTransactionFields, saveCategories, saveCategorizationRules } = useContext(AppContext)!;
  const { topTags30Days } = useTransactions();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { width } = useWindowDimensions();
  const isWebWide = width >= 768;

  const [tags, setTags] = useState<string[]>([...transaction.tags]);
  const [customTag, setCustomTag] = useState('');
  const [showSplit, setShowSplit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditDetails, setShowEditDetails] = useState(false);

  // Editable detail fields
  const [editAmount, setEditAmount] = useState(transaction.amount);
  const [editToFrom, setEditToFrom] = useState(transaction.to_from);
  const [editMode, setEditMode] = useState(transaction.mode);
  const [editTime, setEditTime] = useState(transaction.time);
  const [editCategory, setEditCategory] = useState(transaction.category || 'Uncategorized');
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const MODES = ['UPI', 'Card', 'Withdrawal', 'NEFT', 'RTGS', 'IMPS', 'Repayment', 'Other'];

  const slideAnim = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    if (isWebWide) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isWebWide, width]);

  const closeWebDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag) && tag.trim().length > 0) {
      setTags([...tags, tag.trim()]);
    }
    setCustomTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleAddCustomCategory = async () => {
    const trimmed = newCategoryInput.trim();
    if (trimmed && !categories.includes(trimmed)) {
      const updated = [...categories, trimmed];
      await saveCategories(updated);
      setEditCategory(trimmed);
      setNewCategoryInput('');
    }
  };

  const hasTagChanges = tags.length !== transaction.tags.length || tags.some(t => !transaction.tags.includes(t));
  const hasCategoryChanges = editCategory !== transaction.category;
  const hasDetailChanges = editAmount !== transaction.amount || editToFrom !== transaction.to_from || editMode !== transaction.mode || editTime !== transaction.time || hasCategoryChanges;
  const hasChanges = hasTagChanges || hasDetailChanges;

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateTransactionFields(transaction._key, {
      tags,
      category: editCategory,
      gps: transaction.gps,
      amount: editAmount,
      to_from: editToFrom,
      mode: editMode,
      time: editTime,
    });
    setIsSaving(false);

    if (success) {
      if (hasCategoryChanges && editToFrom.trim()) {
        const merchant = editToFrom.trim();
        Alert.alert(
          'Create Categorization Rule?',
          `Would you like to automatically categorize all future transactions from "${merchant}" as "${editCategory}"?`,
          [
            {
              text: 'No',
              onPress: () => {
                if (isWebWide) closeWebDrawer();
                else bottomSheetRef.current?.close();
              }
            },
            {
              text: 'Always Categorize',
              onPress: async () => {
                const newRules = { ...categorizationRules, [merchant.toLowerCase()]: editCategory };
                await saveCategorizationRules(newRules);
                if (isWebWide) closeWebDrawer();
                else bottomSheetRef.current?.close();
              }
            }
          ]
        );
      } else {
        if (isWebWide) closeWebDrawer();
        else bottomSheetRef.current?.close();
      }
    } else {
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  if (showSplit) {
    return <SplitExpenseFlow transaction={transaction} onClose={() => setShowSplit(false)} bottomSheetRef={bottomSheetRef} />;
  }

  const renderContent = () => (
    <>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.toFrom, { color: colors.text }]}>{transaction.to_from || transaction.mode}</Text>
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              <Badge label={`${transaction.bank} — ${transaction.account}`} variant="blue" style={{ marginRight: 8 }}/>
              <Badge label={transaction.type} variant={transaction.type === 'Debit' ? 'red' : 'green'} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.amount, { color: transaction.type === 'Debit' ? colors.red : colors.green }]}>
               {transaction.type === 'Debit' ? '-' : '+'}{formatAmount(transaction.amount)}
            </Text>
            <Text style={[styles.time, { color: colors.textSecondary }]}>{transaction.time}</Text>
          </View>
        </View>

        {/* Readonly info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>Mode: <Text style={{ color: colors.text }}>{transaction.mode}</Text></Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>Account Type: <Text style={{ color: colors.text }}>{transaction.accountType}</Text></Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>Ref No: <Text style={{ color: colors.text }}>{transaction.refNo}</Text></Text>
          {transaction.gps ? (
             <TouchableOpacity onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(transaction.gps)}`)} style={{ marginTop: 8 }}>
                <Text style={[styles.infoText, { color: colors.blue, fontWeight: 'bold' }]}>📍 View Location on Map</Text>
                <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: 12 }]}>{transaction.gps}</Text>
             </TouchableOpacity>
          ) : null}
        </View>

        {/* Edit Details Accordion */}
        <TouchableOpacity
          style={[styles.editDetailsHeader, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          onPress={() => setShowEditDetails(v => !v)}
        >
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Edit Details</Text>
          <MaterialCommunityIcons
            name={showEditDetails ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {showEditDetails && (
          <View style={[styles.editDetailsBody, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Amount</Text>
            <TextInput
              style={[styles.editInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
              placeholder="Amount"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Receiver / Sender</Text>
            <TextInput
              style={[styles.editInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={editToFrom}
              onChangeText={setEditToFrom}
              placeholder="To / From"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Mode</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {MODES.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeChip, {
                    backgroundColor: editMode === m ? colors.blue : colors.background,
                    borderColor: editMode === m ? colors.blue : colors.border,
                  }]}
                  onPress={() => setEditMode(m)}
                >
                  <Text style={{ color: editMode === m ? '#FFF' : colors.text, fontSize: 13, fontWeight: '500' }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Date / Time</Text>
            <TextInput
              style={[styles.editInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={editTime}
              onChangeText={setEditTime}
              placeholder="e.g. 01 Sep, 10:30 AM"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        )}

        {/* Category Selector */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.modeChip,
                {
                  backgroundColor: editCategory === cat ? colors.purple : colors.surfaceAlt,
                  borderColor: editCategory === cat ? colors.purple : colors.border,
                }
              ]}
              onPress={() => setEditCategory(cat)}
            >
              <Text style={{ color: editCategory === cat ? '#FFF' : colors.text, fontSize: 13, fontWeight: '600' }}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          <TextInput
            style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="Add custom category..."
            placeholderTextColor={colors.textSecondary}
            value={newCategoryInput}
            onChangeText={setNewCategoryInput}
            onSubmitEditing={handleAddCustomCategory}
            returnKeyType="done"
          />
          {newCategoryInput.trim().length > 0 && (
            <TouchableOpacity
              style={{ backgroundColor: colors.purple, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' }}
              onPress={handleAddCustomCategory}
            >
              <Text style={{ color: '#FFF', fontWeight: '700' }}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tags Editor */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tags</Text>
        <View style={styles.tagsContainer}>
          {tags.map(t => (
            <TagPill key={t} label={t} selected onRemove={() => handleRemoveTag(t)} />
          ))}
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {Array.from(new Set([...topTags30Days, ...customTags])).filter(t => !tags.includes(t)).map(t => (
            <TagPill key={t} label={t} onPress={() => handleAddTag(t)} />
          ))}
        </ScrollView>

        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          placeholder="Add custom tag..."
          placeholderTextColor={colors.textSecondary}
          value={customTag}
          onChangeText={setCustomTag}
          onSubmitEditing={() => handleAddTag(customTag)}
          returnKeyType="done"
        />

        {/* Split UI */}
        {transaction.type === 'Debit' && (
          <View style={{ marginTop: 32 }}>
            {transaction.split?.enabled ? (
              <View style={[styles.infoCard, { backgroundColor: colors.purple + '15' }]}>
                <Text style={[styles.sectionTitle, { color: colors.purple, marginTop: 0 }]}>Split Details</Text>
                <Text style={{ color: colors.text, marginBottom: 8, marginTop: 4 }}>Your Share: {formatAmount(transaction.split.myShare.toString())}</Text>
                {transaction.split.receivables.map(r => (
                  <View key={r.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: colors.text }}>{r.name}</Text>
                    <Text style={{ color: r.status === 'pending' ? colors.amber : colors.green, fontWeight: '600' }}>
                      {formatAmount(r.amount.toString())} ({r.status})
                    </Text>
                  </View>
                ))}
                <TouchableOpacity onPress={() => setShowSplit(true)} style={{ marginTop: 12 }}>
                  <Text style={{ color: colors.purple, fontWeight: '700' }}>Edit Split</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.btnOutline, { borderColor: colors.purple }]} onPress={() => setShowSplit(true)}>
                <Text style={{ color: colors.purple, fontWeight: '700' }}>Split this expense</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Save Button */}
        {hasChanges && (
          <TouchableOpacity 
             style={[styles.saveBtn, { backgroundColor: colors.blue, opacity: isSaving ? 0.7 : 1 }]} 
             onPress={handleSave}
             disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
          </TouchableOpacity>
        )}
    </>
  );

  if (isWebWide) {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={closeWebDrawer}>
        <TouchableOpacity style={styles.webOverlay} activeOpacity={1} onPress={closeWebDrawer}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View 
              style={[
                styles.webDrawer, 
                { width: width * 0.5, backgroundColor: colors.surface, transform: [{ translateX: slideAnim }] }
              ]} 
            >
              <ScrollView contentContainerStyle={styles.content}>
                {renderContent()}
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    );
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={['50%', '85%']}
      index={0}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.textSecondary }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {renderContent()}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  toFrom: {
    fontSize: 20,
    fontWeight: '700',
    maxWidth: 200,
  },
  amount: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  saveBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnOutline: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  webOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  webDrawer: {
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  editDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 2,
  },
  editDetailsBody: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
});

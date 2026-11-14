import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchStash, deleteStashedItem, addRecord, updateStashItem, clearStash } from '../src/api/client';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StashItem {
  id: string;
  address: string;
  raw: string;
  skip_reason: string;
  readable_date: string;
  user: string;
  updatedAt?: number;
}

const STASH_CACHE_KEY = 'cached_stash_messages';

export default function StashReviewScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<StashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [retryQueue, setRetryQueue] = useState<StashItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<StashItem | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editRaw, setEditRaw] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const saveToCache = async (stashItems: StashItem[]) => {
    try {
      await AsyncStorage.setItem(STASH_CACHE_KEY, JSON.stringify(stashItems));
    } catch (e) {
      console.error('Failed to save stash to cache', e);
    }
  };

  const loadFromCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(STASH_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as StashItem[];
      }
    } catch (e) {
      console.error('Failed to load stash from cache', e);
    }
    return [];
  };

  const syncStash = async (currentItems: StashItem[]) => {
    // Find the latest updatedAt to use for delta-sync
    const lastUpdate = currentItems.reduce((max, item) => Math.max(max, item.updatedAt || 0), 0);
    
    const freshData = await fetchStash(lastUpdate);
    
    if (freshData.length > 0) {
      // Merge: Add new ones, replace existing ones if any (though usually they are new)
      const merged = [...freshData];
      const newIds = new Set(freshData.map(f => `${f.address}_${f.id}`));
      
      currentItems.forEach(item => {
        if (!newIds.has(`${item.address}_${item.id}`)) {
          merged.push(item);
        }
      });

      // Sort by updatedAt descending
      const sorted = merged.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setItems(sorted);
      await saveToCache(sorted);
    }
  };

  const initStash = async () => {
    setLoading(true);
    const cached = await loadFromCache();
    setItems(cached);
    
    // Even if we have cache, we still show a loader if cache is empty
    // But if we have cache, we show it immediately and sync in background
    if (cached.length === 0) {
        setLoading(true);
    } else {
        setLoading(false);
    }
    
    await syncStash(cached);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // On hard refresh, we might want to just fetch everything or do a sync
    await syncStash(items);
    setRefreshing(false);
  };

  useEffect(() => {
    initStash();
  }, []);

  useEffect(() => {
    if (retryQueue.length > 0 && !isProcessingQueue) {
      processQueue();
    }
  }, [retryQueue, isProcessingQueue]);

  const processQueue = async () => {
    setIsProcessingQueue(true);
    const item = retryQueue[0];
    const itemKey = `${item.address}_${item.id}`;
    
    try {
      const message = await addRecord({
        address: item.address,
        body: item.raw,
        readable_date: item.readable_date
      });

      if (message === 'Record added successfully') {
        // Only alert on successful retry if we want, or skip it so it doesn't block. Let's skip the alert for batch retrying seamlessly.
        await deleteStashedItem(item.address, item.id);
        setItems(prev => {
          const next = prev.filter(i => `${i.address}_${i.id}` !== itemKey);
          saveToCache(next);
          return next;
        });
      } else {
        Alert.alert('Skipped', message);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to retry. Check connection.');
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
      setRetryQueue(prev => prev.slice(1));
      setIsProcessingQueue(false);
    }
  };

  const handleRetry = (item: StashItem) => {
    const itemKey = `${item.address}_${item.id}`;
    if (retryingIds.has(itemKey)) return;
    setRetryingIds(prev => new Set(prev).add(itemKey));
    setRetryQueue(prev => [...prev, item]);
  };

  const handleDelete = (item: StashItem) => {
    const itemKey = `${item.address}_${item.id}`;
    Alert.alert(
      'Delete Stash',
      'Are you sure you want to remove this message? You won\'t be able to review it again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const success = await deleteStashedItem(item.address, item.id);
            if (success) {
                const updated = items.filter(i => `${i.address}_${i.id}` !== itemKey);
                setItems(updated);
                await saveToCache(updated);
            }
          }
        }
      ]
    );
  };

  const handleDismissAll = () => {
    Alert.alert(
      'Dismiss All',
      'Are you sure you want to dismiss ALL stashed messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Dismiss All', 
          style: 'destructive',
          onPress: async () => {
            const success = await clearStash();
            if (success) {
                setItems([]);
                await saveToCache([]);
            } else {
                Alert.alert('Error', 'Failed to dismiss all items');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (item: StashItem) => {
    setEditingItem(item);
    setEditAddress(item.address);
    setEditRaw(item.raw);
    setEditDate(item.readable_date);
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    
    const updatedData = {
      ...editingItem,
      address: editAddress,
      raw: editRaw,
      readable_date: editDate,
    };

    const success = await updateStashItem(editingItem.address, editingItem.id, updatedData);
    
    if (success) {
      // Update local state
      const updatedItems = items.map(i => 
        (i.address === editingItem.address && i.id === editingItem.id) ? updatedData : i
      );
      setItems(updatedItems);
      await saveToCache(updatedItems);
      setEditingItem(null);
    } else {
      Alert.alert('Error', 'Failed to update stash item');
    }
    setIsSaving(false);
  };

  const getReasonColor = (reason: string) => {
    if (!reason) return colors.textSecondary;
    const r = reason.toLowerCase();
    if (r.includes('not_configured')) return colors.amber;
    if (r.includes('error')) return colors.red;
    return colors.textSecondary;
  };

  const renderItem = ({ item }: { item: StashItem }) => {
    const itemKey = `${item.address}_${item.id}`;
    const isRetrying = retryingIds.has(itemKey);

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.addressContainer}>
              <MaterialCommunityIcons name="message-text-outline" size={18} color={colors.blue} />
              <Text style={[styles.addressText, { color: colors.text }]}>{item.address}</Text>
            </View>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>{item.readable_date}</Text>
          </View>
    
          <View style={[styles.reasonBadge, { backgroundColor: getReasonColor(item.skip_reason) + '20' }]}>
            <Text style={[styles.reasonText, { color: getReasonColor(item.skip_reason) }]}>
              {(item.skip_reason || 'Unknown Reason').replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
    
          <Text style={[styles.rawBody, { color: colors.text }]}>{item.raw}</Text>
    
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]} 
              onPress={() => handleDelete(item)}
              disabled={isRetrying}
            >
              <MaterialCommunityIcons name="delete-outline" size={20} color={isRetrying ? colors.textSecondary : colors.red} />
              <Text style={[styles.actionText, { color: isRetrying ? colors.textSecondary : colors.red }]}>Dismiss</Text>
            </TouchableOpacity>
    
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: isRetrying ? colors.border : colors.blue }]} 
              onPress={() => handleRetry(item)}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialCommunityIcons name="sync" size={20} color="white" />
                  <Text style={[styles.actionText, { color: 'white' }]}>Retry</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]} 
              onPress={() => handleEdit(item)}
              disabled={isRetrying}
            >
              <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={32} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Stashed Messages</Text>
        </View>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleDismissAll} style={styles.dismissAllBtn}>
            <Text style={{ color: colors.red, fontWeight: '600' }}>Dismiss All</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => `${item.address}_${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="check-circle-outline" size={64} color={colors.green} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyText, { color: colors.text }]}>All clear!</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>No messages need review right now.</Text>
            </View>
          }
        />
      )}

      {/* Edit Modal */}
      <Modal visible={!!editingItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Stashed Message</Text>
            
            <ScrollView>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Sender Address</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={editAddress}
                onChangeText={setEditAddress}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Time (DD/MM/YY HH:MM AM/PM)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={editDate}
                onChangeText={setEditDate}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Message Body</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, height: 120, textAlignVertical: 'top' }]}
                value={editRaw}
                onChangeText={setEditRaw}
                multiline
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, { borderColor: colors.border, borderWidth: 1 }]} 
                onPress={() => setEditingItem(null)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.blue }]} 
                onPress={saveEdit}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '600' }}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  dismissAllBtn: {
    borderWidth: 1,
    borderColor: '#FF6B6B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  list: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
  },
  reasonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  reasonText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rawBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#FF6B6B30',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

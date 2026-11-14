import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, FlatList, Text, RefreshControl, Modal, Platform, TouchableWithoutFeedback, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { AppContext } from '../../src/context/AppContext';
import { useTransactions } from '../../src/hooks/useTransactions';
import { SummaryCard } from '../../src/components/ui/SummaryCard';
import { FilterBar } from '../../src/components/filter/FilterBar';
import { TransactionRow } from '../../src/components/transaction/TransactionRow';
import { DaySection } from '../../src/components/transaction/DaySection';
import { SkeletonRow, EmptyState } from '../../src/components/ui/SkeletonRow';
import { FlatTransaction } from '../../src/utils/flatten';
import { TransactionDetailSheet } from '../../src/components/transaction/TransactionDetailSheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ManualEntrySheet } from '../../src/components/transaction/ManualEntrySheet';
import BottomSheet from '@gorhom/bottom-sheet';

export default function DashboardScreen() {
  const { colors, toggleTheme, darkMode } = useTheme();
  const router = useRouter();
  const { state: { loading, username, isSyncing, configuredBanks, spendType }, dispatch, refreshRecords, logout } = React.useContext(AppContext)!;
  const manualSheetRef = React.useRef<BottomSheet>(null);
  const { groupedByDate, currentMonthSpent, currentMonthReceived, net } = useTransactions();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTx, setSelectedTx] = useState<FlatTransaction | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const handleLogout = () => {
    setProfileMenuVisible(false);
    logout();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshRecords();
    setRefreshing(false);
  }, [refreshRecords]);

  const renderItem = ({ item }: { item: any }) => {
    if (item.isHeader) {
      return <DaySection dateLabel={item.dateLabel} debitTotal={item.debitTotal} creditTotal={item.creditTotal} />;
    }
    return <TransactionRow transaction={item} onPress={() => {
      setSelectedTx(item);
      setSheetKey(prev => prev + 1);
    }} />;
  };

  const flattenedData = React.useMemo(() => {
    const list: any[] = [];
    groupedByDate.forEach(group => {
      list.push({ isHeader: true, ...group });
      group.txs.forEach(tx => list.push(tx));
    });
    return list;
  }, [groupedByDate]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text, fontSize: 16, fontWeight: '500' }]}>Hello, {username || 'User'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
            {isSyncing && (
              <View style={styles.syncContainer}>
                <ActivityIndicator size="small" color={colors.blue} />
                <Text style={{ color: colors.blue, fontSize: 12, fontWeight: '500' }}>Syncing...</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={() => setProfileMenuVisible(true)}>
           <MaterialCommunityIcons name="account-circle" size={36} color={colors.blue} />
        </TouchableOpacity>
      </View>

      {/* PROFILE MODAL MENU */}
      <Modal visible={profileMenuVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setProfileMenuVisible(false)}>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setProfileMenuVisible(false)}
        >
          <View style={styles.modalWrapper}>
            <TouchableWithoutFeedback>
              <View style={[styles.profileMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {/* Theme Toggle */}
                  <TouchableOpacity 
                    style={styles.menuItem} 
                    onPress={() => { toggleTheme(); setProfileMenuVisible(false); }}
                  >
                    <MaterialCommunityIcons name={darkMode ? "weather-sunny" : "weather-night"} size={22} color={colors.text} />
                    <Text style={[styles.menuText, { color: colors.text }]}>{darkMode ? "Light Mode" : "Dark Mode"}</Text>
                  </TouchableOpacity>
                  
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />

                  {/* Stash Review */}
                  <TouchableOpacity 
                    style={styles.menuItem} 
                    onPress={() => { setProfileMenuVisible(false); router.push('/stash-review'); }}
                  >
                    <MaterialCommunityIcons name="archive-alert-outline" size={22} color={colors.text} />
                    <Text style={[styles.menuText, { color: colors.text }]}>Review Stashed</Text>
                  </TouchableOpacity>

                  <View style={[styles.separator, { backgroundColor: colors.border }]} />

                  {/* Logout */}
                  <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={22} color={colors.red} />
                    <Text style={[styles.menuText, { color: colors.red }]}>Log Out</Text>
                  </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* SPEND TYPE TOGGLE */}
      <View style={[styles.toggleContainer, { backgroundColor: colors.surfaceAlt }]}>
        <TouchableOpacity 
          style={[styles.toggleBtn, spendType === 'total' && { backgroundColor: colors.surface }]}
          onPress={() => dispatch({ type: 'SET_SPEND_TYPE', payload: 'total' })}
        >
          <Text style={[styles.toggleBtnText, { color: colors.text, fontWeight: spendType === 'total' ? '700' : '400' }]}>Total Spends</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleBtn, spendType === 'my' && { backgroundColor: colors.surface }]}
          onPress={() => dispatch({ type: 'SET_SPEND_TYPE', payload: 'my' })}
        >
          <Text style={[styles.toggleBtnText, { color: colors.text, fontWeight: spendType === 'my' ? '700' : '400' }]}>My Spends</Text>
        </TouchableOpacity>
      </View>

      {/* SUMMARY CARDS */}
      <View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.summaryList}
          data={[
            { id: '1', title: spendType === 'my' ? 'My Spent' : 'Total Spent', amount: currentMonthSpent, variant: 'red', icon: 'arrow-down-circle-outline' as any },
            { id: '2', title: 'Total Received', amount: currentMonthReceived, variant: 'green', icon: 'arrow-up-circle-outline' as any },
            { id: '3', title: 'Net', amount: net, variant: 'blue', icon: 'scale-balance' as any },
          ]}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <SummaryCard title={item.title} amount={item.amount as number} icon={item.icon} variant={item.variant as any} />
          )}
        />
      </View>

      {/* FILTER BAR */}
      <FilterBar />

      {/* FEED */}
      {loading && !refreshing ? (
        <View style={{ flex: 1, marginTop: 16 }}>
          {[1,2,3,4,5,6].map(i => <SkeletonRow key={i} />)}
        </View>
      ) : flattenedData.length === 0 ? (
        <EmptyState message="No transactions found." />
      ) : (
        <FlatList
          data={flattenedData}
          keyExtractor={(item, index) => item.isHeader ? `header-${item.dateLabel}-${index}` : `${item._key}-${index}`}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {selectedTx && (
        <TransactionDetailSheet 
          key={`sheet-${sheetKey}`} 
          transaction={selectedTx} 
          onClose={() => setSelectedTx(null)} 
        />
      )}

      {/* MANUAL ENTRY SHEET */}
      <ManualEntrySheet 
        sheetRef={manualSheetRef} 
        configuredBanks={configuredBanks} 
        onSuccess={refreshRecords} 
      />

      {/* FAB */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.blue }]} 
        onPress={() => manualSheetRef.current?.expand()}
      >
        <MaterialCommunityIcons name="plus" size={30} color="#FFF" />
      </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 70 : 60,
    paddingRight: 16,
  },
  profileMenu: {
    width: 200,
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
  summaryList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnText: {
    fontSize: 14,
  },
});

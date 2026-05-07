import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView, TouchableOpacity, useColorScheme, Alert, Modal, TextInput, Platform, Switch, ScrollView } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useRef } from 'react';
import { getExpenses, getCategories, deleteExpense, updateExpense, Expense, CategoryItem } from '../store/ExpenseStore';
import { useSettings } from '../store/SettingsContext';

export default function HistoryScreen() {
  const { theme, isDark, currency, incomeModeEnabled } = useSettings();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeDate, setActiveDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit State
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState<'expense' | 'income'>('expense');
  const [editDate, setEditDate] = useState(new Date());
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const viewShotRef = useRef<ViewShot>(null);

  const isFocused = useIsFocused();

  const changeMonth = (offset: number) => {
    const newDate = new Date(activeDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setActiveDate(newDate);
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const loadData = async () => {
    setCategories(await getCategories());
    setExpenses(await getExpenses());
  };

  const handleDelete = (id: string) => {
    Alert.alert('Expense Options', 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteExpense(id);
        loadData();
      }}
    ]);
  };

  const openEdit = (item: Expense) => {
    setEditingExpense(item);
    setEditAmount(item.amount);
    setEditDescription(item.description || '');
    setEditDate(new Date(item.date));
    setEditType(item.type || 'expense');
    setEditIsRecurring(item.isRecurring || false);
  };

  const handleSaveEdit = async () => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, {
        amount: editAmount,
        description: editDescription,
        date: editDate.toISOString(),
        type: editType,
        isRecurring: editIsRecurring
      });
      setEditingExpense(null);
      loadData();
    }
  };

  const handleShare = async () => {
    if (viewShotRef.current?.capture) {
      try {
        const uri = await viewShotRef.current.capture();
        await Sharing.shareAsync(uri);
      } catch (e) {
        console.error("Error sharing image:", e);
      }
    }
  };

  const renderExpense = ({ item }: { item: Expense }) => {
    const dateObj = new Date(item.date);
    const dateStr = dateObj.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const catName = item.category || 'Other';
    const catObj = categories.find(c => c.name === catName);
    const color = catObj?.color || theme.primary;
    const icon = catObj?.icon || 'pricetag';

    return (
      <TouchableOpacity 
        style={[styles.expenseItem, { backgroundColor: theme.card }]} 
        onPress={() => openEdit(item)}
        onLongPress={() => handleDelete(item.id)}
      >
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={[styles.expenseCategory, { color: theme.text }]}>{catName}</Text>
          {!!item.description && (
            <Text style={[styles.expenseDescription, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          <Text style={[styles.expenseDate, { color: theme.textSecondary }]}>{dateStr}</Text>
        </View>
        <Text style={[styles.expenseAmount, { color: item.type === 'income' ? '#34C759' : theme.text }]}>
          {item.type === 'income' ? '+' : ''}{currency}{parseFloat(item.amount).toFixed(0)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>History</Text>
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth(-1)}>
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center', marginHorizontal: 16, width: 100 }}>
            <Text style={[styles.monthText, { color: theme.text }]}>{activeDate.toLocaleDateString('en-GB', { month: 'long' })}</Text>
            <Text style={[styles.yearText, { color: theme.textSecondary }]}>{activeDate.getFullYear()}</Text>
          </View>
          <TouchableOpacity onPress={() => changeMonth(1)}>
            <Ionicons name="chevron-forward" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search expenses..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={expenses.filter(e => {
          const d = new Date(e.date);
          const isCurrentMonth = d.getMonth() === activeDate.getMonth() && d.getFullYear() === activeDate.getFullYear();
          if (!isCurrentMonth) return false;
          
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (e.description?.toLowerCase().includes(query) || false) || 
                   e.amount.includes(query) || 
                   e.category.toLowerCase().includes(query);
          }
          return true;
        })}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.textSecondary, marginTop: 50 }}>No history.</Text>}
      />

      <Modal visible={!!editingExpense} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditingExpense(null)}><Text style={{ color: theme.primary, fontSize: 18 }}>Cancel</Text></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Expense</Text>
            <TouchableOpacity onPress={handleSaveEdit}><Text style={{ color: theme.primary, fontSize: 18, fontWeight: 'bold' }}>Save</Text></TouchableOpacity>
          </View>
          
          <ScrollView style={{ padding: 20 }}>
            <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }} style={{ backgroundColor: theme.background }}>
              <View style={[styles.expenseItem, { backgroundColor: theme.card, marginBottom: 20 }]}>
                <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons name="receipt" size={20} color={theme.primary} />
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={[styles.expenseCategory, { color: theme.text }]}>{editingExpense?.category}</Text>
                  {!!editDescription && <Text style={[styles.expenseDescription, { color: theme.textSecondary }]} numberOfLines={1}>{editDescription}</Text>}
                  <Text style={[styles.expenseDate, { color: theme.textSecondary }]}>{editDate.toLocaleDateString('en-GB')}</Text>
                </View>
                <Text style={[styles.expenseAmount, { color: editType === 'income' ? '#34C759' : theme.text }]}>
                  {editType === 'income' ? '+' : ''}{currency}{editAmount}
                </Text>
              </View>
            </ViewShot>

            <TouchableOpacity style={[styles.shareButton, { backgroundColor: theme.primary }]} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Share Receipt</Text>
            </TouchableOpacity>

            {incomeModeEnabled && (
              <View style={[styles.segmentedControl, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', marginTop: 24 }]}>
                <TouchableOpacity style={[styles.segment, editType === 'expense' && { backgroundColor: theme.card, shadowOpacity: 0.1 }]} onPress={() => setEditType('expense')}>
                  <Text style={[styles.segmentText, { color: editType === 'expense' ? theme.text : theme.textSecondary }]}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.segment, editType === 'income' && { backgroundColor: theme.card, shadowOpacity: 0.1 }]} onPress={() => setEditType('income')}>
                  <Text style={[styles.segmentText, { color: editType === 'income' ? '#34C759' : theme.textSecondary }]}>Income</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.label, { color: theme.textSecondary, marginTop: incomeModeEnabled ? 20 : 24 }]}>Amount ({currency})</Text>
            <TextInput style={[styles.input, { color: editType === 'income' ? '#34C759' : theme.text, borderColor: theme.border }]} keyboardType="numeric" value={editAmount} onChangeText={setEditAmount} />
            
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 20 }]}>Description</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={editDescription} onChangeText={setEditDescription} />
            
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 20 }]}>Date</Text>
            <TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: theme.border }]} onPress={() => setShowDatePicker(!showDatePicker)}>
              <Text style={{ color: theme.text, fontSize: 16 }}>{editDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              <Ionicons name={showDatePicker ? "chevron-up" : "chevron-down"} size={16} color={theme.border} />
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={editDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (Platform.OS !== 'ios') {
                    setShowDatePicker(false);
                  }
                  if (selectedDate) setEditDate(selectedDate);
                }}
              />
            )}
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 40 }}>
              <Text style={[styles.label, { color: theme.text, marginBottom: 0 }]}>Monthly Recurring</Text>
              <Switch value={editIsRecurring} onValueChange={setEditIsRecurring} trackColor={{ true: theme.primary }} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 16 },
  monthSelector: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginBottom: 10 },
  monthText: { fontSize: 16, fontWeight: '700' },
  yearText: { fontSize: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  expenseItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12 },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  expenseInfo: { flex: 1 },
  expenseCategory: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  expenseDescription: { fontSize: 14, marginBottom: 4 },
  expenseDate: { fontSize: 13 },
  expenseAmount: { fontSize: 18, fontWeight: '700' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { fontSize: 16, padding: 16, borderRadius: 12, borderWidth: 1, minHeight: 56 },
  segmentedControl: { flexDirection: 'row', padding: 4, borderRadius: 12 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segmentText: { fontSize: 14, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12 },
});

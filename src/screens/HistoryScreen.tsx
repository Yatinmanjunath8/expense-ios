import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getExpenses, getCategories, deleteExpense, Expense, CategoryItem } from '../store/ExpenseStore';
import { getTheme } from '../theme/Theme';

export default function HistoryScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = getTheme(isDarkMode);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeDate, setActiveDate] = useState(new Date());
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
    Alert.alert('Delete Expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteExpense(id);
        loadData();
      }}
    ]);
  };

  const renderExpense = ({ item }: { item: Expense }) => {
    const dateObj = new Date(item.date);
    const dateStr = dateObj.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const catName = item.category || 'Other';
    const catObj = categories.find(c => c.name === catName);
    const color = catObj?.color || theme.primary;
    const icon = catObj?.icon || 'pricetag';

    return (
      <TouchableOpacity style={[styles.expenseItem, { backgroundColor: theme.card }]} onLongPress={() => handleDelete(item.id)}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={[styles.expenseCategory, { color: theme.text }]}>{catName}</Text>
          <Text style={[styles.expenseDate, { color: theme.textSecondary }]}>{dateStr}</Text>
        </View>
        <Text style={[styles.expenseAmount, { color: theme.text }]}>₹{parseFloat(item.amount).toFixed(0)}</Text>
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

      <FlatList
        data={expenses.filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === activeDate.getMonth() && d.getFullYear() === activeDate.getFullYear();
        })}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.textSecondary, marginTop: 50 }}>No history.</Text>}
      />
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
  expenseDate: { fontSize: 13 },
  expenseAmount: { fontSize: 18, fontWeight: '700' },
});

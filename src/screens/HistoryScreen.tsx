import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { getExpenses, deleteExpense, Expense } from '../store/ExpenseStore';

export default function HistoryScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadExpenses();
    }
  }, [isFocused]);

  const loadExpenses = async () => {
    const data = await getExpenses();
    setExpenses(data);
  };

  const renderExpense = ({ item }: { item: Expense }) => {
    const dateStr = new Date(item.date).toLocaleDateString();
    return (
      <View style={styles.expenseItem}>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseAmount}>₹{item.amount}</Text>
          <Text style={styles.expenseDesc}>{item.description || 'No description'}</Text>
          {item.category ? <Text style={styles.expenseCategory}>{item.category} • {dateStr}</Text> : <Text style={styles.expenseCategory}>{dateStr}</Text>}
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    loadExpenses();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>All Expenses</Text>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No past expenses.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  title: { fontSize: 28, fontWeight: '800', margin: 20, textAlign: 'center', color: '#1A1A1A' },
  list: { padding: 20 },
  expenseItem: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 18, borderRadius: 16, marginBottom: 12, justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  expenseInfo: { flex: 1 },
  expenseAmount: { fontSize: 22, fontWeight: '800', color: '#2E7D32' },
  expenseDesc: { fontSize: 16, color: '#4A4A4A', marginTop: 6 },
  expenseCategory: { fontSize: 13, color: '#888', marginTop: 4, fontWeight: '600', textTransform: 'uppercase' },
  deleteButton: { padding: 10, backgroundColor: '#FFEBEE', borderRadius: 8 },
  deleteText: { color: '#D32F2F', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#9E9E9E', marginTop: 50, fontSize: 16 },
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

export interface Expense {
  id: string;
  amount: string;
  description: string;
  category: string;
  date: string;
  imageUri?: string;
  utr?: string;
}

const STORAGE_KEY = '@expenses';

export const saveExpense = async (expense: Omit<Expense, 'id' | 'date'>) => {
  try {
    const expenses = await getExpenses();
    const newExpense: Expense = {
      ...expense,
      id: uuid.v4() as string,
      date: new Date().toISOString(),
    };
    const updatedExpenses = [newExpense, ...expenses];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedExpenses));
    return newExpense;
  } catch (error) {
    console.error('Error saving expense:', error);
    throw error;
  }
};

export const getExpenses = async (): Promise<Expense[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting expenses:', error);
    return [];
  }
};

export const deleteExpense = async (id: string) => {
  try {
    const expenses = await getExpenses();
    const updatedExpenses = expenses.filter((e) => e.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedExpenses));
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};

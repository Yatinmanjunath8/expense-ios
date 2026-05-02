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
const CATEGORY_STORAGE_KEY = '@categories';

export interface CategoryItem {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: '1', name: 'Food', color: '#FF6384' },
  { id: '2', name: 'Travel', color: '#36A2EB' },
  { id: '3', name: 'Shopping', color: '#FFCE56' },
  { id: '4', name: 'Outing', color: '#4BC0C0' },
];

export const getCategories = async (): Promise<CategoryItem[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(CATEGORY_STORAGE_KEY);
    if (jsonValue != null) {
      return JSON.parse(jsonValue);
    }
    return DEFAULT_CATEGORIES;
  } catch (e) {
    console.error('Error fetching categories', e);
    return DEFAULT_CATEGORIES;
  }
};

export const addCategory = async (name: string, color: string): Promise<CategoryItem> => {
  try {
    const categories = await getCategories();
    const newCategory: CategoryItem = {
      id: uuid.v4().toString(),
      name,
      color,
    };
    const newCategories = [...categories, newCategory];
    await AsyncStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(newCategories));
    return newCategory;
  } catch (e) {
    console.error('Error adding category', e);
    throw e;
  }
};

export const saveExpense = async (expense: Omit<Expense, 'id'>) => {
  try {
    const expenses = await getExpenses();
    const newExpense: Expense = {
      ...expense,
      id: uuid.v4() as string,
      date: expense.date || new Date().toISOString(),
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

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
  icon: string;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: '1', name: 'Food', color: '#FF9500', icon: 'fast-food' }, // Orange
  { id: '2', name: 'Travel', color: '#00C7BE', icon: 'airplane' }, // Teal
  { id: '3', name: 'Shopping', color: '#FF2D55', icon: 'cart' }, // Pink
  { id: '4', name: 'Rent', color: '#5856D6', icon: 'home' }, // Purple
  { id: '5', name: 'Transport', color: '#007AFF', icon: 'car' }, // Blue
  { id: '6', name: 'Entertainment', color: '#FFCC00', icon: 'film' }, // Yellow
  { id: '7', name: 'Health', color: '#FF3B30', icon: 'medkit' }, // Red
  { id: '8', name: 'Groceries', color: '#34C759', icon: 'basket' }, // Green
];

export const getCategories = async (): Promise<CategoryItem[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(CATEGORY_STORAGE_KEY);
    if (jsonValue != null) {
      // Ensure backwards compatibility for old saved categories that might not have icons
      const parsed = JSON.parse(jsonValue);
      return parsed.map((cat: any) => ({ ...cat, icon: cat.icon || 'pricetag' }));
    }
    return DEFAULT_CATEGORIES;
  } catch (e) {
    console.error('Error fetching categories', e);
    return DEFAULT_CATEGORIES;
  }
};

export const addCategory = async (name: string, color: string, icon: string = 'pricetag'): Promise<CategoryItem> => {
  try {
    const categories = await getCategories();
    const newCategory: CategoryItem = {
      id: uuid.v4().toString(),
      name,
      color,
      icon,
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

export const updateExpense = async (id: string, updatedData: Partial<Expense>) => {
  try {
    const expenses = await getExpenses();
    const updatedExpenses = expenses.map((e) => 
      e.id === id ? { ...e, ...updatedData } : e
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedExpenses));
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
};

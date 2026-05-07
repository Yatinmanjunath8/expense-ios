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
  isRecurring?: boolean;
  type?: 'expense' | 'income';
}

const STORAGE_KEY = '@expenses';
const CATEGORY_STORAGE_KEY = '@categories';
const LAST_RECURRING_PROCESS_KEY = '@last_recurring_process';

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

export const processRecurringExpenses = async () => {
  try {
    const lastRunStr = await AsyncStorage.getItem(LAST_RECURRING_PROCESS_KEY);
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    
    if (lastRunStr === currentMonthKey) {
      return; // Already processed this month
    }

    const expenses = await getExpenses();
    
    // Find all recurring expenses
    const recurringExpenses = expenses.filter(e => e.isRecurring);
    
    // We only want to duplicate the most recent occurrence of each unique subscription
    // A subscription is uniquely identified by its description and category
    const uniqueSubs = new Map<string, Expense>();
    
    for (const exp of recurringExpenses) {
      const expDate = new Date(exp.date);
      // Skip if it's already in the current month
      if (expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()) {
        continue;
      }
      
      const key = `${exp.description}-${exp.category}`;
      const existing = uniqueSubs.get(key);
      if (!existing || new Date(exp.date) > new Date(existing.date)) {
        uniqueSubs.set(key, exp);
      }
    }

    // Now check if these unique subs have ALREADY been paid this month (maybe user manually added it)
    const currentMonthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const newExpensesToSave: Expense[] = [];
    
    for (const sub of uniqueSubs.values()) {
      const alreadyPaidThisMonth = currentMonthExpenses.some(
        e => e.description === sub.description && e.category === sub.category && e.isRecurring
      );
      
      if (!alreadyPaidThisMonth) {
        // Create a new expense for this month, keeping the same day of the month if possible
        const originalDate = new Date(sub.date);
        const newDate = new Date(now.getFullYear(), now.getMonth(), originalDate.getDate());
        
        // If the month doesn't have that many days (e.g. Feb 30th), it will roll over to next month. We can cap it.
        if (newDate.getMonth() !== now.getMonth()) {
          newDate.setDate(0); // Set to last day of current month
        }
        
        newExpensesToSave.push({
          ...sub,
          id: uuid.v4() as string,
          date: newDate.toISOString(),
        });
      }
    }

    if (newExpensesToSave.length > 0) {
      const updatedExpenses = [...newExpensesToSave, ...expenses];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedExpenses));
    }

    await AsyncStorage.setItem(LAST_RECURRING_PROCESS_KEY, currentMonthKey);
    return newExpensesToSave.length;
  } catch (error) {
    console.error('Error processing recurring expenses:', error);
    return 0;
  }
};

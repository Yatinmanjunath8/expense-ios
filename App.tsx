import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TextInput, Button, TouchableOpacity, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useShareIntent } from 'expo-share-intent';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { getExpenses, saveExpense, deleteExpense, Expense } from './src/store/ExpenseStore';
import { parseAmountFromText } from './src/utils/ocrParser';

export default function App() {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    if (hasShareIntent && shareIntent?.value && shareIntent?.type === 'media') {
      const mediaFiles = shareIntent.value as any[];
      const imageUri = mediaFiles[0]?.path || mediaFiles[0]?.contentUri;
      if (imageUri) {
        processSharedImage(imageUri);
      }
    }
  }, [hasShareIntent, shareIntent]);

  const loadExpenses = async () => {
    const data = await getExpenses();
    setExpenses(data);
  };

  const processSharedImage = async (uri: string) => {
    setIsProcessing(true);
    setCurrentImageUri(uri);
    try {
      const result = await TextRecognition.recognize(uri);
      const extractedAmount = parseAmountFromText(result.blocks);
      setAmount(extractedAmount);
      setShowModal(true);
    } catch (e) {
      console.error('OCR Error:', e);
      // Still show modal so user can manually enter it
      setShowModal(true);
    } finally {
      setIsProcessing(false);
      resetShareIntent();
    }
  };

  const handleSave = async () => {
    if (!amount) return;
    await saveExpense({
      amount,
      description,
      category,
      imageUri: currentImageUri || undefined,
    });
    setAmount('');
    setDescription('');
    setCategory('');
    setCurrentImageUri(null);
    setShowModal(false);
    loadExpenses();
  };

  const renderExpense = ({ item }: { item: Expense }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseAmount}>₹{item.amount}</Text>
        <Text style={styles.expenseDesc}>{item.description || 'No description'}</Text>
        {item.category ? <Text style={styles.expenseCategory}>{item.category}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    loadExpenses();
  };

  if (showModal) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.title}>New Expense</Text>
            {currentImageUri && (
              <Image source={{ uri: currentImageUri }} style={styles.previewImage} />
            )}
            <TextInput
              style={styles.input}
              placeholder="Amount (₹)"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Category (e.g. Food, Travel)"
              value={category}
              onChangeText={setCategory}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
            />
            <View style={styles.buttonRow}>
              <Button title="Cancel" onPress={() => setShowModal(false)} color="#E53935" />
              <Button title="Save Expense" onPress={handleSave} color="#43A047" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Expenses</Text>
      {isProcessing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#43A047" />
          <Text style={styles.loadingText}>Extracting amount...</Text>
        </View>
      )}
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No expenses yet. Share a screenshot to add one!</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    margin: 20,
    textAlign: 'center',
    color: '#1A1A1A',
  },
  list: {
    padding: 20,
  },
  expenseItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2E7D32',
  },
  expenseDesc: {
    fontSize: 16,
    color: '#4A4A4A',
    marginTop: 6,
  },
  expenseCategory: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  deleteButton: {
    padding: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  deleteText: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  modalContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: 350,
    resizeMode: 'contain',
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9E9E9E',
    marginTop: 50,
    fontSize: 16,
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#43A047',
    fontWeight: '600',
  },
});

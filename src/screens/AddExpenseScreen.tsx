import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, Alert, Image, useColorScheme, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { getCategories, getExpenses, saveExpense, addCategory, CategoryItem, Expense } from '../store/ExpenseStore';
import { parseAmountFromText, parseUtrFromText } from '../utils/ocrParser';
import { useAppTheme } from '../theme/ThemeContext';

export default function AddExpenseScreen() {
  const { theme, isDark } = useAppTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState<string | null>(null);
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    if (isFocused) {
      loadCategories();
    }
  }, [isFocused]);

  useEffect(() => {
    const handleDeepLink = (event: Linking.EventType) => {
      const { url } = event;
      if (url.includes('expensetracker://add')) {
        const parsed = Linking.parse(url);
        const imagePath = parsed.queryParams?.image as string;
        if (imagePath) {
          const formattedUri = imagePath.startsWith('file://') ? imagePath : `file://${imagePath}`;
          processImage(formattedUri);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const loadCategories = async () => {
    const data = await getCategories();
    const allExpenses = await getExpenses();
    
    // Sort categories by usage frequency
    const categoryCounts: Record<string, number> = {};
    allExpenses.forEach(e => {
      const cat = e.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    
    const sortedCategories = [...data].sort((a, b) => {
      const countA = categoryCounts[a.name] || 0;
      const countB = categoryCounts[b.name] || 0;
      return countB - countA;
    });
    
    setCategories(sortedCategories);
    if (!category && sortedCategories.length > 0) {
      setCategory(sortedCategories[0].name);
    }
    
    // Calculate current month total
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const total = allExpenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    setCurrentMonthTotal(total);
  };

  const handleImportPhotos = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Permission required!");
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, quality: 1,
    });
    if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
      processImage(pickerResult.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    setIsProcessing(true);
    setCurrentImageUri(uri);
    try {
      const result = await TextRecognition.recognize(uri);
      setAmount(parseAmountFromText(result.blocks));
      // UTR is no longer in the UI to keep it clean like screenshot 1, but we can save it silently or just drop it.
    } catch (e) {
      console.error('OCR Error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCustomCategory = () => {
    Alert.prompt(
      "New Category", "Enter a name",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Add", 
          onPress: async (name?: string) => {
            if (name && name.trim()) {
              const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
              await addCategory(name.trim(), randomColor, 'pricetag');
              await loadCategories();
              setCategory(name.trim());
            }
          }
        }
      ], "plain-text"
    );
  };

  const handleSave = async () => {
    if (!amount) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }
    await saveExpense({ amount, description, category: category || 'Other', imageUri: currentImageUri || undefined, date: date.toISOString(), isRecurring });
    setAmount(''); setDescription(''); setCategory(categories[0]?.name || ''); setCurrentImageUri(null); setDate(new Date()); setIsRecurring(false);
    Alert.alert('Success', 'Expense added!', [{ text: 'OK', onPress: () => navigation.navigate('History' as never) }]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>Add Expense</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>This Month: ₹{currentMonthTotal.toFixed(0)}</Text>
            </View>
            <TouchableOpacity onPress={handleImportPhotos} disabled={isProcessing}>
              <Ionicons name="camera" size={28} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {currentImageUri && <Image source={{ uri: currentImageUri }} style={styles.previewImage} />}

          {/* Amount Card */}
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="cash-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Amount</Text>
            </View>
            <View style={styles.amountInputContainer}>
              <Text style={[styles.currencySymbol, { color: theme.textSecondary }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.text }]}
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>
          </View>

          {/* Category Card */}
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="pricetag" size={16} color={theme.textSecondary} />
              <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Category</Text>
            </View>
            <View style={styles.chipsContainer}>
              {(showAllCategories ? categories : categories.slice(0, 4)).map((cat) => {
                const isActive = category === cat.name;
                return (
                  <TouchableOpacity 
                    key={cat.id} 
                    style={[styles.chip, { backgroundColor: isActive ? cat.color : (isDark ? '#2C2C2E' : '#F2F2F7') }]}
                    onPress={() => setCategory(cat.name)}
                  >
                    <Ionicons name={cat.icon as any} size={14} color={isActive ? '#FFF' : theme.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.chipText, { color: isActive ? '#FFF' : theme.text }]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
              
              {!showAllCategories && categories.length > 4 && (
                <TouchableOpacity style={[styles.chip, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]} onPress={() => setShowAllCategories(true)}>
                  <Ionicons name="chevron-down" size={16} color={theme.text} style={{ marginRight: 4 }} />
                  <Text style={[styles.chipText, { color: theme.text }]}>Show More</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.chip, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]} onPress={handleAddCustomCategory}>
                <Ionicons name="add" size={16} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description Card */}
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Description (Optional)</Text>
            </View>
            <TextInput
              style={[styles.descriptionInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="e.g. Lunch at cafe"
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <Text style={[styles.cardTitle, { color: theme.text, marginLeft: 0 }]}>Monthly Recurring</Text>
              <Switch value={isRecurring} onValueChange={setIsRecurring} trackColor={{ true: theme.primary }} />
            </View>
          </View>

          {/* Date Card */}
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Date</Text>
            </View>
            <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(!showDatePicker)}>
              <Text style={[styles.dateText, { color: theme.text }]}>{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              <Ionicons name={showDatePicker ? "chevron-up" : "chevron-down"} size={16} color={theme.border} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (Platform.OS !== 'ios') {
                    setShowDatePicker(false);
                  }
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
          </View>

        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.primary }]} onPress={handleSave}>
            <Ionicons name="add-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.submitButtonText}>Add Expense</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 10 },
  title: { fontSize: 32, fontWeight: '800' },
  subtitle: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  previewImage: { width: '100%', height: 150, borderRadius: 16, marginBottom: 20 },
  card: { borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { fontSize: 48, fontWeight: '400', marginRight: 8 },
  amountInput: { fontSize: 56, fontWeight: '700', flex: 1 },
  descriptionInput: { fontSize: 16, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, marginBottom: 10 },
  chipText: { fontSize: 14, fontWeight: '600' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 18, fontWeight: '600' },
  footer: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 0 : 20 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16 },
  submitButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});

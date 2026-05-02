import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, SafeAreaView, Modal, TextInput, Button, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { getExpenses, saveExpense, Expense } from '../store/ExpenseStore';
import { parseAmountFromText } from '../utils/ocrParser';

const screenWidth = Dimensions.get("window").width;

const chartConfig = {
  backgroundGradientFrom: "#FFFFFF",
  backgroundGradientTo: "#FFFFFF",
  color: (opacity = 1) => `rgba(67, 160, 71, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
  fillShadowGradientOpacity: 1,
  fillShadowGradientFrom: '#43A047',
  fillShadowGradientTo: '#43A047',
};

const PIE_COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

export default function DashboardScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const isFocused = useIsFocused();
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (isFocused) {
      loadExpenses();
    }
  }, [isFocused]);

  const loadExpenses = async () => {
    const data = await getExpenses();
    setExpenses(data);
  };

  const handleImportPhotos = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Permission to access camera roll is required!");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      processImage(pickerResult.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    setIsProcessing(true);
    setCurrentImageUri(uri);
    try {
      const result = await TextRecognition.recognize(uri);
      const extractedAmount = parseAmountFromText(result.blocks);
      setAmount(extractedAmount);
      setShowModal(true);
    } catch (e) {
      console.error('OCR Error:', e);
      setShowModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!amount) return;
    await saveExpense({ amount, description, category: category || 'Other', imageUri: currentImageUri || undefined });
    setAmount(''); setDescription(''); setCategory(''); setCurrentImageUri(null); setShowModal(false);
    loadExpenses();
  };

  // Analytics Calculations
  const currentMonthTotal = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }, [expenses]);

  const pieData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (parseFloat(e.amount) || 0);
    });
    return Object.keys(categoryTotals).map((cat, idx) => ({
      name: cat,
      population: categoryTotals[cat],
      color: PIE_COLORS[idx % PIE_COLORS.length],
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
    })).filter(d => d.population > 0);
  }, [expenses]);

  const barData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentMonth = now.getMonth();
    
    // Get last 6 months
    const last6Months = [];
    const monthlyTotals = [];
    
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      let year = now.getFullYear();
      if (m < 0) {
        m += 12;
        year -= 1;
      }
      last6Months.push(months[m]);
      
      const total = expenses
        .filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === m && d.getFullYear() === year;
        })
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      monthlyTotals.push(total);
    }

    return {
      labels: last6Months,
      datasets: [{ data: monthlyTotals.every(v => v === 0) ? [1, 1, 1, 1, 1, 1] : monthlyTotals }] // prevent empty chart crash
    };
  }, [expenses]);

  const allBarDataZero = barData.datasets[0].data.every(v => v === 1); // We set it to 1s if empty to prevent crash

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Total Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Current Month Total</Text>
          <Text style={styles.summaryAmount}>₹{currentMonthTotal.toFixed(2)}</Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.importButton} onPress={handleImportPhotos} disabled={isProcessing}>
          {isProcessing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.importButtonText}>📷 Import Screenshot</Text>}
        </TouchableOpacity>

        {/* Charts */}
        {expenses.length > 0 ? (
          <>
            <Text style={styles.chartTitle}>Expenses by Category</Text>
            <View style={styles.chartContainer}>
              <PieChart
                data={pieData}
                width={screenWidth - 40}
                height={200}
                chartConfig={chartConfig}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                absolute
              />
            </View>

            <Text style={styles.chartTitle}>Past 6 Months</Text>
            <View style={styles.chartContainer}>
              <BarChart
                data={barData}
                width={screenWidth - 40}
                height={220}
                yAxisLabel="₹"
                yAxisSuffix=""
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(67, 160, 71, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                verticalLabelRotation={0}
                showValuesOnTopOfBars={!allBarDataZero}
              />
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No data yet. Import a screenshot to see your dashboard!</Text>
          </View>
        )}

      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide">
        <SafeAreaView style={{flex: 1, backgroundColor: '#F7F9FC'}}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>New Expense</Text>
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
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  summaryCard: { backgroundColor: '#43A047', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  summaryTitle: { color: '#E8F5E9', fontSize: 16, fontWeight: '600', marginBottom: 5 },
  summaryAmount: { color: '#FFFFFF', fontSize: 36, fontWeight: '800' },
  importButton: { backgroundColor: '#1E88E5', borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 30, shadowColor: '#1E88E5', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  importButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  chartTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 10, marginLeft: 5 },
  chartContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 10, marginBottom: 25, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyStateText: { color: '#888', fontSize: 16, textAlign: 'center' },
  modalTitle: { fontSize: 28, fontWeight: '800', margin: 20, textAlign: 'center', color: '#1A1A1A' },
  modalContent: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  previewImage: { width: '100%', height: 300, resizeMode: 'contain', marginBottom: 20, borderRadius: 12, backgroundColor: '#E0E0E0' },
  input: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0', color: '#333' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
});

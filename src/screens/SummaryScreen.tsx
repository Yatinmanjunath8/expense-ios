import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, SafeAreaView, TouchableOpacity, useColorScheme } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { PieChart, StackedBarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getExpenses, getCategories, Expense, CategoryItem } from '../store/ExpenseStore';
import { getTheme } from '../theme/Theme';

const screenWidth = Dimensions.get("window").width;

export default function SummaryScreen() {
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
    setExpenses(await getExpenses());
    setCategories(await getCategories());
  };

  const { currentMonthTotal, pieData, categoryTotals } = useMemo(() => {
    const currentMonth = activeDate.getMonth();
    const currentYear = activeDate.getFullYear();
    
    const currentMonthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totals: Record<string, number> = {};
    currentMonthExpenses.forEach(e => {
      const cat = e.category || 'Other';
      totals[cat] = (totals[cat] || 0) + (parseFloat(e.amount) || 0);
    });

    const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    
    const pData = Object.keys(totals).map((catName) => {
      const catObj = categories.find(c => c.name === catName);
      return {
        name: catName,
        population: totals[catName],
        color: catObj?.color || theme.primary,
        legendFontColor: theme.textSecondary,
        legendFontSize: 12
      };
    }).filter(d => d.population > 0);

    return { currentMonthTotal: totalSpent, pieData: pData, categoryTotals: totals, count: currentMonthExpenses.length };
  }, [expenses, categories, theme, activeDate]);

  const barData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentMonth = now.getMonth();
    
    const last6Months = [];
    const monthlyData: number[][] = [];
    const usedCategories = new Set<string>();

    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      let year = now.getFullYear();
      if (m < 0) { m += 12; year -= 1; }
      last6Months.push(months[m]);
      
      const monthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === m && d.getFullYear() === year;
      });

      monthExpenses.forEach(e => usedCategories.add(e.category || 'Other'));
    }

    const legend = Array.from(usedCategories);
    const colors = legend.map(catName => categories.find(c => c.name === catName)?.color || theme.primary);

    if (legend.length === 0) {
      return null;
    }

    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      let year = now.getFullYear();
      if (m < 0) { m += 12; year -= 1; }
      
      const monthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === m && d.getFullYear() === year;
      });

      const row = legend.map(cat => {
        return monthExpenses.filter(e => (e.category || 'Other') === cat).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      });
      monthlyData.push(row);
    }

    return { labels: last6Months, legend, data: monthlyData, barColors: colors };
  }, [expenses, categories, theme]);

  const activeCategoryCount = pieData.length;

  const generatePDF = async () => {
    const currentMonth = activeDate.getMonth();
    const currentYear = activeDate.getFullYear();
    
    const currentMonthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const monthStr = activeDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    let rows = currentMonthExpenses.map(e => `
      <tr>
        <td>${new Date(e.date).toLocaleDateString('en-GB')}</td>
        <td>${e.category || 'Other'}</td>
        <td>${e.description || '-'}</td>
        <td>₹${parseFloat(e.amount).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Helvetica, sans-serif; padding: 40px; color: #333; }
            h1 { text-align: center; color: #111; font-size: 32px; margin-bottom: 5px; }
            h2 { text-align: center; color: #666; font-size: 18px; margin-top: 0; margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #ddd; padding: 14px 10px; text-align: left; }
            th { background-color: #f8f8f8; font-weight: bold; color: #555; text-transform: uppercase; font-size: 12px; }
            tr:nth-child(even) { background-color: #fafafa; }
            .total { font-weight: bold; font-size: 24px; margin-top: 30px; text-align: right; color: #111; }
          </style>
        </head>
        <body>
          <h1>Expense Report</h1>
          <h2>${monthStr}</h2>
          <table>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
            ${rows}
          </table>
          <div class="total">Total Spent: ₹${currentMonthTotal.toFixed(2)}</div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.error("Error generating PDF:", e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Summary</Text>
            <View style={[styles.monthSelector, { marginTop: 4 }]}>
              <TouchableOpacity onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-back" size={20} color={theme.primary} />
              </TouchableOpacity>
              <View style={{ alignItems: 'center', marginHorizontal: 12, width: 90 }}>
                <Text style={[styles.monthText, { color: theme.text }]}>{activeDate.toLocaleDateString('en-GB', { month: 'long' })}</Text>
                <Text style={[styles.yearText, { color: theme.textSecondary }]}>{activeDate.getFullYear()}</Text>
              </View>
              <TouchableOpacity onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-forward" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={[styles.pdfButton, { backgroundColor: theme.primary + '20' }]} onPress={generatePDF}>
            <Ionicons name="download-outline" size={20} color={theme.primary} />
            <Text style={{ color: theme.primary, marginLeft: 6, fontWeight: '600' }}>PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Total Spent Card */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardSub, { color: theme.textSecondary }]}>Total Spent</Text>
          <Text style={[styles.totalAmount, { color: theme.text }]}>₹{currentMonthTotal.toFixed(0)}</Text>
          <Text style={[styles.transactionCount, { color: theme.textSecondary }]}>{expenses.length} transactions</Text>
        </View>

        {expenses.length > 0 ? (
          <>
            {/* Donut Chart */}
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Breakdown</Text>
              <View style={styles.pieContainer}>
                <PieChart
                  data={pieData}
                  width={screenWidth - 80}
                  height={220}
                  chartConfig={{ color: () => theme.text }}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"0"}
                  center={[(screenWidth - 80) / 4, 0]}
                  hasLegend={false}
                  absolute
                />
                {/* Donut Hole */}
                <View style={[styles.donutHole, { backgroundColor: theme.card }]}>
                  <Text style={[styles.donutCount, { color: theme.text }]}>{activeCategoryCount}</Text>
                  <Text style={[styles.donutLabel, { color: theme.textSecondary }]}>categories</Text>
                </View>
              </View>
            </View>

            {/* By Category List */}
            <View style={styles.listContainer}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>By Category</Text>
              {Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]).map(catName => {
                const catObj = categories.find(c => c.name === catName);
                const color = catObj?.color || theme.primary;
                const icon = catObj?.icon || 'pricetag';
                const amount = categoryTotals[catName];
                const percentage = currentMonthTotal > 0 ? Math.round((amount / currentMonthTotal) * 100) : 0;
                
                return (
                  <View key={catName} style={[styles.listItem, { backgroundColor: theme.card }]}>
                    <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                      <Ionicons name={icon as any} size={20} color={color} />
                    </View>
                    <Text style={[styles.listName, { color: theme.text }]}>{catName}</Text>
                    <View style={styles.listRight}>
                      <Text style={[styles.listAmount, { color: theme.text }]}>₹{amount.toFixed(0)}</Text>
                      <Text style={[styles.listPercent, { color: theme.textSecondary }]}>{percentage}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Stacked Bar Chart */}
            {barData && (
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>6 Month Trend</Text>
                <StackedBarChart
                  data={barData}
                  width={screenWidth - 80}
                  height={220}
                  chartConfig={{
                    backgroundColor: theme.card,
                    backgroundGradientFrom: theme.card,
                    backgroundGradientTo: theme.card,
                    color: (opacity = 1) => theme.border,
                    labelColor: () => theme.textSecondary,
                  }}
                  hideLegend={true}
                />
              </View>
            )}
          </>
        ) : (
          <Text style={{ textAlign: 'center', marginTop: 50, color: theme.textSecondary }}>No data yet. Add an expense!</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800' },
  monthSelector: { flexDirection: 'row', alignItems: 'center' },
  monthText: { fontSize: 16, fontWeight: '700' },
  yearText: { fontSize: 12 },
  card: { borderRadius: 24, padding: 24, marginBottom: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardSub: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  totalAmount: { fontSize: 42, fontWeight: '800', marginBottom: 4 },
  transactionCount: { fontSize: 12, fontWeight: '500' },
  cardTitle: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  pieContainer: { justifyContent: 'center', alignItems: 'center' },
  donutHole: { position: 'absolute', width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  donutCount: { fontSize: 24, fontWeight: '800' },
  donutLabel: { fontSize: 12 },
  listContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10, marginLeft: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 10 },
  iconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  listName: { flex: 1, fontSize: 16, fontWeight: '600' },
  listRight: { alignItems: 'flex-end' },
  listAmount: { fontSize: 16, fontWeight: '700' },
  listPercent: { fontSize: 12, marginTop: 2 },
  pdfButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
});

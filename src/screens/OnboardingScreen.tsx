import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../store/SettingsContext';
import type { CurrencySymbol, ThemeMode } from '../store/SettingsContext';

export default function OnboardingScreen() {
  const { 
    theme, isDark, 
    currency, setCurrency, 
    mode, setMode, 
    incomeModeEnabled, setIncomeModeEnabled,
    setHasCompletedOnboarding 
  } = useSettings();

  const currencies: { symbol: CurrencySymbol, label: string }[] = [
    { symbol: '₹', label: 'INR' },
    { symbol: '$', label: 'USD' },
    { symbol: '€', label: 'EUR' },
    { symbol: '£', label: 'GBP' }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="wallet" size={64} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Welcome</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Let's set up your expense tracker</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Currency</Text>
          <View style={styles.row}>
            {currencies.map(c => (
              <TouchableOpacity 
                key={c.symbol} 
                style={[styles.chip, currency === c.symbol && { backgroundColor: theme.primary }]}
                onPress={() => setCurrency(c.symbol)}
              >
                <Text style={[styles.chipText, { color: currency === c.symbol ? '#FFF' : theme.text }]}>
                  {c.symbol} {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Theme Preference</Text>
          <View style={styles.row}>
            {(['system', 'light', 'dark'] as ThemeMode[]).map(m => (
              <TouchableOpacity 
                key={m} 
                style={[styles.chip, mode === m && { backgroundColor: theme.primary }]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.chipText, { color: mode === m ? '#FFF' : theme.text, textTransform: 'capitalize' }]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={[styles.cardTitle, { color: theme.textSecondary, marginBottom: 2 }]}>Income Tracking</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Track money you receive</Text>
            </View>
            <Switch 
              value={incomeModeEnabled} 
              onValueChange={setIncomeModeEnabled} 
              trackColor={{ true: '#34C759' }} 
            />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={() => setHasCompletedOnboarding(true)}
        >
          <Text style={styles.buttonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', marginTop: 16 },
  subtitle: { fontSize: 16, marginTop: 8 },
  card: { padding: 20, borderRadius: 20, marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#8E8E9320' },
  chipText: { fontSize: 15, fontWeight: '600' },
  footer: { padding: 24 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '700' }
});

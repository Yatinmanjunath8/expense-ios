import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { processRecurringExpenses } from './src/store/ExpenseStore';
import AppNavigator from './src/navigation/AppNavigator';
import { SettingsProvider, useSettings } from './src/store/SettingsContext';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { View, Text, SafeAreaView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 }}>
          <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold' }}>App Crashed!</Text>
          <Text style={{ color: 'white', marginTop: 10, textAlign: 'center' }}>{this.state.error?.message}</Text>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function AppRoot() {
  const { hasCompletedOnboarding, isLoading } = useSettings();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#FFF' }}>Loading...</Text>
      </View>
    );
  }

  return hasCompletedOnboarding ? <AppNavigator /> : <OnboardingScreen />;
}

export default function App() {
  useEffect(() => {
    setupNotifications();
    processRecurringExpenses();
  }, []);

  const setupNotifications = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Log Your Expenses! 💸",
        body: "Don't forget to track what you spent today.",
      },
      trigger: {
        hour: 20,
        minute: 30,
        repeats: true,
      } as any,
    });
  };

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <SettingsProvider>
          <AppRoot />
        </SettingsProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

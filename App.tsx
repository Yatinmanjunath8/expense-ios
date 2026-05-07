import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { processRecurringExpenses } from './src/store/ExpenseStore';
import AppNavigator from './src/navigation/AppNavigator';
import { SettingsProvider, useSettings } from './src/store/SettingsContext';
import OnboardingScreen from './src/screens/OnboardingScreen';

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
    return null; // Or a splash screen
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
    <SettingsProvider>
      <AppRoot />
    </SettingsProvider>
  );
}

import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  useEffect(() => {
    setupNotifications();
  }, []);

  const setupNotifications = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    // Clear existing to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Schedule daily notification at 8:30 PM (20:30)
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

  return <AppNavigator />;
}

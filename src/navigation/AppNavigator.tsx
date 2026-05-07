import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import SummaryScreen from '../screens/SummaryScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import { useAppTheme } from '../store/SettingsContext';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const { theme } = useAppTheme();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            borderTopWidth: 1,
            elevation: 0,
            paddingTop: 8,
          },
          tabBarIcon: ({ color, size }) => {
            let iconName: any = 'help-circle';
            if (route.name === 'Add') iconName = 'add-circle';
            else if (route.name === 'History') iconName = 'list';
            else if (route.name === 'Summary') iconName = 'pie-chart';
            else if (route.name === 'Settings') iconName = 'settings';

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Add" component={AddExpenseScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
        <Tab.Screen name="Summary" component={SummaryScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

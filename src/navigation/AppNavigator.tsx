import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/DashboardScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#43A047',
          tabBarInactiveTintColor: 'gray',
        }}
      >
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardScreen} 
          options={{ title: 'Dashboard' }} 
        />
        <Tab.Screen 
          name="History" 
          component={HistoryScreen} 
          options={{ title: 'History' }} 
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

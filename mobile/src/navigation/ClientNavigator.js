import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/colors';
import ClientDashboardScreen from '../screens/client/ClientDashboardScreen';
import ClientScheduleScreen from '../screens/client/ClientScheduleScreen';
import ClientInvoicesScreen from '../screens/client/ClientInvoicesScreen';
import ClientInvoiceDetailScreen from '../screens/client/ClientInvoiceDetailScreen';
import ClientProfileScreen from '../screens/client/ClientProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function InvoicesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InvoicesList" component={ClientInvoicesScreen} />
      <Stack.Screen name="InvoiceDetail" component={ClientInvoiceDetailScreen} />
    </Stack.Navigator>
  );
}

export default function ClientNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.navy,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Dashboard: focused ? 'home' : 'home-outline',
            Schedule:  focused ? 'calendar' : 'calendar-outline',
            Invoices:  focused ? 'receipt' : 'receipt-outline',
            Profile:   focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={ClientDashboardScreen} />
      <Tab.Screen name="Schedule" component={ClientScheduleScreen} />
      <Tab.Screen name="Invoices" component={InvoicesStack} />
      <Tab.Screen name="Profile" component={ClientProfileScreen} />
    </Tab.Navigator>
  );
}

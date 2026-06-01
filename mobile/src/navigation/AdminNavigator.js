import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/colors';
import { PendingProvider, usePending } from '../context/PendingContext';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import CalendarScreen from '../screens/admin/CalendarScreen';
import AddShiftScreen from '../screens/admin/AddShiftScreen';
import EmployeesScreen from '../screens/admin/EmployeesScreen';
import EmployeeDetailScreen from '../screens/admin/EmployeeDetailScreen';
import AddEmployeeScreen from '../screens/admin/AddEmployeeScreen';
import ClientsScreen from '../screens/admin/ClientsScreen';
import ClientDetailScreen from '../screens/admin/ClientDetailScreen';
import PayrollScreen from '../screens/admin/PayrollScreen';
import PayrollDetailScreen from '../screens/admin/PayrollDetailScreen';
import InvoicesScreen from '../screens/admin/InvoicesScreen';
import InvoiceDetailScreen from '../screens/admin/InvoiceDetailScreen';
import GenerateInvoicesScreen from '../screens/admin/GenerateInvoicesScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    </Stack.Navigator>
  );
}

function CalendarStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="AddShift" component={AddShiftScreen} />
    </Stack.Navigator>
  );
}

function PeopleStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Employees" component={EmployeesScreen} />
      <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} />
      <Stack.Screen name="AddEmployee" component={AddEmployeeScreen} />
      <Stack.Screen name="Clients" component={ClientsScreen} />
      <Stack.Screen name="ClientDetail" component={ClientDetailScreen} />
    </Stack.Navigator>
  );
}

function FinanceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Payroll" component={PayrollScreen} />
      <Stack.Screen name="PayrollDetail" component={PayrollDetailScreen} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
      <Stack.Screen name="GenerateInvoices" component={GenerateInvoicesScreen} />
    </Stack.Navigator>
  );
}

function AdminTabs() {
  const { count } = usePending();

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
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard: focused ? 'home' : 'home-outline',
            Schedule: focused ? 'calendar' : 'calendar-outline',
            People: focused ? 'people' : 'people-outline',
            Finance: focused ? 'card' : 'card-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen
        name="Schedule"
        component={CalendarStack}
        options={{ unmountOnBlur: true }}
      />
      <Tab.Screen
        name="People"
        component={PeopleStack}
        options={{
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.error,
            color: COLORS.white,
            fontSize: 10,
            minWidth: 16,
            height: 16,
            lineHeight: 16,
          },
        }}
      />
      <Tab.Screen name="Finance" component={FinanceStack} />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <PendingProvider>
      <AdminTabs />
    </PendingProvider>
  );
}

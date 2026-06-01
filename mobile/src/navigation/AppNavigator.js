import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';
import AuthNavigator from './AuthNavigator';
import AdminNavigator from './AdminNavigator';
import EmployeeNavigator from './EmployeeNavigator';
import ClientNavigator from './ClientNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthNavigator />;
  if (user.role === 'employee') return <EmployeeNavigator />;
  if (user.role === 'client') return <ClientNavigator />;
  return <AdminNavigator />;
}

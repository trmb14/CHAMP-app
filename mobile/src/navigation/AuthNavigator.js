import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import EmployeeSignUpScreen from '../screens/auth/EmployeeSignUpScreen';
import ClientSignUpScreen from '../screens/auth/ClientSignUpScreen';
import SignUpSuccessScreen from '../screens/auth/SignUpSuccessScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="EmployeeSignUp" component={EmployeeSignUpScreen} />
      <Stack.Screen name="ClientSignUp" component={ClientSignUpScreen} />
      <Stack.Screen name="SignUpSuccess" component={SignUpSuccessScreen} />
    </Stack.Navigator>
  );
}

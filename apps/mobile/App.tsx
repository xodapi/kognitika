import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BrainIdScreen from './src/screens/BrainIdScreen';
import SchulteScreen from './src/screens/SchulteScreen';
import { getStoredToken, clearAuth } from './src/lib/api';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Check auth state on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await getStoredToken();
        setIsAuthenticated(!!token);
      } catch (err) {
        console.warn('Failed to read auth state:', err);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  const handleAuthenticated = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await clearAuth();
      setIsAuthenticated(false);
    } catch (err) {
      console.warn('Logout failed:', err);
    }
  }, []);

  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0E1A' } }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Login">
              {(props) => <BrainIdScreen {...props} onAuthenticated={handleAuthenticated} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Schulte">
              {(props) => <SchulteScreen {...props} onLogout={handleLogout} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0E1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

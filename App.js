// App.js
import React from 'react';
// --- (FIX 3) SafeAreaContext Import ---
import { SafeAreaProvider } from 'react-native-safe-area-context'; 
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from './src/theme/colors';
import Toast from 'react-native-toast-message';

// --- (FIX 2) AuthProvider Import ---
import { AuthProvider } from './src/context/AuthContext';

const App = () => {
  return (
    // --- (FIX 2) AuthProvider 
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={COLORS.white} />
        <AppNavigator />
        <Toast />
      </SafeAreaProvider>
    </AuthProvider>
  );
};

export default App;
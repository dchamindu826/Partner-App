// App.js (Partner App)
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from './src/theme/colors';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/context/AuthContext';
import * as Notifications from 'expo-notifications';
import { Platform, LogBox, View, Text, StyleSheet } from 'react-native'; 
import { Ionicons } from '@expo/vector-icons';

// 🛑 Errors Ignore
LogBox.ignoreLogs([
  'NetworkError', 'Cannot open', 'EventSource', 'text strings', 'shouldShowAlert' 
]);

const REPEAT_SOUND_COUNT = 4;

// --- CUSTOM TOAST CONFIG (Lassanata Message Penna) ---
const toastConfig = {
  success: ({ text1, text2 }) => (
    <View style={[styles.toastContainer, { borderLeftColor: COLORS.success }]}>
      <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
      <View style={styles.textContainer}>
        <Text style={styles.toastTitle}>{text1}</Text>
        <Text style={styles.toastMessage}>{text2}</Text>
      </View>
    </View>
  ),
  error: ({ text1, text2 }) => (
    <View style={[styles.toastContainer, { borderLeftColor: '#D32F2F' }]}>
      <Ionicons name="close-circle" size={24} color="#D32F2F" />
      <View style={styles.textContainer}>
        <Text style={styles.toastTitle}>{text1}</Text>
        <Text style={styles.toastMessage}>{text2}</Text>
      </View>
    </View>
  ),
};

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const { data } = notification.request.content;

    // --- LOOP FIX START ---
    // Check if it's a new order AND NOT already a local repeat
    if (data.type === 'new_order' && !data.isLocalRepeat) {
        
        // Schedule repeats ONLY ONCE
        for (let i = 0; i < REPEAT_SOUND_COUNT; i++) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: notification.request.content.title,
                    body: notification.request.content.body,
                    // Mark as repeat so handler ignores it next time
                    data: { ...data, isLocalRepeat: true }, 
                    sound: 'new_order_alert.mp3',
                    priority: Notifications.AndroidNotificationPriority.MAX,
                },
                trigger: { seconds: i === 0 ? 1 : 3 * i, repeats: false },
            });
        }
        
        // Mulin apu eka silent karanawa (api schedule karapu tika wadina nisa)
        return { 
          shouldShowBanner: false, 
          shouldShowList: false,
          shouldPlaySound: false, 
          shouldSetBadge: false, 
        };
    }
    // --- LOOP FIX END ---

    // Normal notifications play sound
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

const App = () => {
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      
      Notifications.setNotificationChannelAsync('partner-alert', {
        name: 'Partner Order Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#FFD700',
        sound: 'new_order_alert.mp3' 
      });
    }
  }, []);

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={COLORS.white} />
        <AppNavigator />
        {/* Config pass karanawa toast ekata */}
        <Toast config={toastConfig} /> 
      </SafeAreaProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    height: 60,
    width: '90%',
    backgroundColor: 'white',
    borderLeftWidth: 5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    marginTop: 10
  },
  textContainer: { marginLeft: 10, flex: 1 },
  toastTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  toastMessage: { fontSize: 13, color: '#666' }
});

export default App;
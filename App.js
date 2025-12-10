// App.js (Partner App)
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from './src/theme/colors';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/context/AuthContext';
import * as Notifications from 'expo-notifications';
import { Platform, LogBox } from 'react-native'; 

// 🛑 Errors Ignore කිරීම
LogBox.ignoreLogs([
  'NetworkError',
  'Cannot open, already sending', 
  'EventSource',
  'text strings must be rendered',
  'shouldShowAlert' 
]);

const REPEAT_SOUND_COUNT = 4;

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const { data } = notification.request.content;

    // --- NEW ORDER (LOOP SOUND) ---
    if (data.type === 'new_order') {
        for (let i = 0; i < REPEAT_SOUND_COUNT; i++) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: notification.request.content.title,
                    body: notification.request.content.body,
                    data: data,
                    sound: 'new_order_alert.mp3',
                    channelId: 'partner-alert', 
                },
                trigger: { seconds: i === 0 ? 0.1 : 3 * i, repeats: false },
            });
        }
        return { 
          shouldShowBanner: true, // FIXED: Banner (Not Alert)
          shouldShowList: true,
          shouldPlaySound: false, 
          shouldSetBadge: true, 
        };
    }

    // --- NORMAL NOTIFICATIONS ---
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
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
        <Toast />
      </SafeAreaProvider>
    </AuthProvider>
  );
};

export default App;
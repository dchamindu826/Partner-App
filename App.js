import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from './src/theme/colors';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/context/AuthContext';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { Platform, LogBox, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs(['NetworkError', 'Cannot open, already sending', 'EventSource', 'expo-notifications', 'expo-av']);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const toastConfig = {
  success: (props) => (
    <View style={[styles.toastCard, { borderLeftColor: COLORS.success }]}>
      <View style={[styles.iconBox, { backgroundColor: COLORS.success }]}>
        <Ionicons name="checkmark" size={20} color="#FFF" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.toastTitle}>{props.text1}</Text>
        <Text style={styles.toastMessage}>{props.text2}</Text>
      </View>
    </View>
  ),
  error: (props) => (
    <View style={[styles.toastCard, { borderLeftColor: COLORS.danger }]}>
      <View style={[styles.iconBox, { backgroundColor: COLORS.danger }]}>
        <Ionicons name="close" size={20} color="#FFF" />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.toastTitle, { color: COLORS.danger }]}>{props.text1}</Text>
        <Text style={styles.toastMessage}>{props.text2}</Text>
      </View>
    </View>
  ),
};

const App = () => {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        });

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
          });
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    };

    prepare();

    const responseListener =
      Notifications.addNotificationResponseReceivedListener(() => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('Main', { screen: 'Orders' });
        }
      });

    return () => {
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  if (!appIsReady) return null;

  return (
    <AuthProvider>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: COLORS.white }}>
        <View style={{ flex: 1 }}>
          <StatusBar style="dark" backgroundColor={COLORS.white} />
          <AppNavigator />
          <Toast config={toastConfig} />
        </View>
      </SafeAreaProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  toastCard: { width: '90%', backgroundColor: 'white', borderRadius: 12, borderLeftWidth: 6, flexDirection: 'row', alignItems: 'center', padding: 15, marginTop: 15, elevation: 8 },
  iconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  textContainer: { flex: 1 },
  toastTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  toastMessage: { fontSize: 13, color: '#666' },
});

export default App;

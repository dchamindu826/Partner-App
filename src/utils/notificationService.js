// src/utils/notificationService.js

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants'; // Meka import karanna

// App eka open eke thiyeddi notification eka pennana widiha
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    // --- PROJECT ID FIX ---
    // Expo config eken Project ID eka gannawa. Natham undefined enna puluwan.
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId;

    if (!projectId) {
        console.log("Project ID not found. Check app.json");
    }

    try {
        // Project ID eka pass karala Token eka gannawa
        token = (await Notifications.getExpoPushTokenAsync({
            projectId: projectId, 
        })).data;
        
        console.log("Expo Push Token Generated:", token);
    } catch (e) {
        console.error("Error fetching token:", e);
    }

  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
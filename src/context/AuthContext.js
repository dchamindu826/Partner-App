import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';
import { client } from '../sanity/sanityClient';
// Notification helper eka import karamu (meka api pahala hadanawa)
import { registerForPushNotificationsAsync } from '../utils/notificationService';

const AuthContext = createContext(null);
// Partner App eka nisa me key eka 'restaurantUser' wenna ona
const STORAGE_KEY = 'restaurantUser'; 

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        // 1. Local Storage eken kalin save karapu user data gannawa
        const userDataString = await AsyncStorage.getItem(STORAGE_KEY);
        
        if (userDataString) {
          const storedUser = JSON.parse(userDataString);
          
          // 2. Sanity eken aluthma data eka gannawa (restaurant info ekkama)
          const query = `*[_type == "restaurantUser" && _id == $userId][0]{
            ...,
            restaurant->{_id, name, logo}
          }`;
          
          try {
              const freshUser = await client.fetch(query, { userId: storedUser._id });

              if (freshUser) {
                // 3. User wa set karanawa (Logout wenne na)
                setUser(freshUser);
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));
                
                // 4. Notification Token eka update karanawa (Background)
                updatePushToken(freshUser._id);
              } else {
                // User wa database eken ain karala nam witharak logout wenawa
                await logout();
              }
          } catch (fetchError) {
              // Internet nathnam, stored data walin hari login wela innawa (Offline Support)
              console.log("Offline Mode: Using stored user data");
              setUser(storedUser);
          }
        }
      } catch (e) {
        console.error("Failed to load user", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserFromStorage();
  }, []);

  // --- Notification Token Update Function ---
  const updatePushToken = async (userId) => {
      try {
          const token = await registerForPushNotificationsAsync();
          if (token) {
              // User ge document ekata token eka save karanawa
              await client.patch(userId).set({ pushToken: token }).commit();
              console.log("Push Token Updated in Sanity for Partner");
          }
      } catch (error) {
          console.error("Failed to update push token:", error);
      }
  };

  const login = async (userData) => {
    try {
      setUser(userData);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      // Login weddi token eka save karanawa
      updatePushToken(userData._id);
    } catch (e) {
      console.error("Failed to save user", e);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to remove user", e);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryYellow} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  }
});
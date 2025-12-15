// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';
import { client } from '../sanity/sanityClient';
import { registerForPushNotificationsAsync } from '../utils/notificationService';

const AuthContext = createContext(null);
const STORAGE_KEY = 'restaurantUser';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- (FIX) Token Update Function ---
  
  const updatePushToken = async (currentUser) => {
      if (!currentUser || !currentUser.restaurant) return;

      try {
          const token = await registerForPushNotificationsAsync();
          if (token) {
              
              await client
                .patch(currentUser.restaurant._id)
                .set({ pushToken: token })
                .commit();
              console.log("✅ Push Token Linked to Restaurant:", currentUser.restaurant.name);
          }
      } catch (error) {
          // Network errors, permission issues, etc., handle karala crash eka nawathwanawa
          console.error("⚠️ Failed to safely update push token:", error.message);
      }
  };

  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const userDataString = await AsyncStorage.getItem(STORAGE_KEY);
        
        if (userDataString) {
          const storedUser = JSON.parse(userDataString);
          
          
          const query = `*[_type == "restaurantUser" && _id == $userId][0]{
            ...,
            restaurant->{_id, name, logo}
          }`;
          
          try {
              const freshUser = await client.fetch(query, { userId: storedUser._id });

              if (freshUser) {
                setUser(freshUser);
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));
                
                
                updatePushToken(freshUser);
              } else {
                await logout();
              }
          } catch (fetchError) {
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

  const login = async (userData) => {
    try {
      setUser(userData);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      
      updatePushToken(userData);
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
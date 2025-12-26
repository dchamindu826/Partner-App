// src/navigation/AppNavigator.js

import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'; // DefaultTheme එකතු කළා
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNavigationContainerRef } from '@react-navigation/native'; // Ref එක සඳහා
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { client } from '../sanity/sanityClient';

// Navigation Ref එක export කිරීම (App.js හි භාවිතයට)
export const navigationRef = createNavigationContainerRef();

// Blinking issue එක විසඳීමට තේම් එකක් සෑදීම
const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.white, // ඇප් එකේ background එකට සමාන පාටක් මෙතනට දෙන්න
  },
};

// Screens (ඔබේ සියලුම screens එලෙසම තබා ගන්න)
import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import MenuScreen from '../screens/MenuScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import AddMenuItemScreen from '../screens/AddMenuItemScreen'; 
import ManageCategoriesScreen from '../screens/ManageCategoriesScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import OrderReportScreen from '../screens/OrderReportScreen';
import ManageStaffScreen from '../screens/ManageStaffScreen';
import AddStaffScreen from '../screens/AddStaffScreen';
import PaymentSettingsScreen from '../screens/PaymentSettingsScreen';
import HelpScreen from '../screens/HelpScreen';
import TermsScreen from '../screens/TermsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabBarIcon = ({ focused, color, size, route, badgeCount }) => {
  let iconName;
  if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
  else if (route.name === 'Orders') iconName = focused ? 'receipt' : 'receipt-outline';
  else if (route.name === 'Menu') iconName = focused ? 'restaurant' : 'restaurant-outline';
  else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
  
  return (
    <View style={styles.tabIconContainer}>
      <Ionicons name={iconName} size={size} color={color} />
      {route.name === 'Orders' && badgeCount > 0 && (
        <View style={styles.badge}></View>
      )}
    </View>
  );
};

function MainTabs() {
  const { user } = useAuth();
  const [activeOrderCount, setActiveOrderCount] = useState(0);

  useEffect(() => {
    if (!user || !user.restaurant) return;
    const restaurantId = user.restaurant._id;
    const countQuery = `count(*[_type == "foodOrder" && restaurant._ref == $restaurantId && orderStatus in ["pending", "preparing", "readyForPickup", "assigned", "onTheWay"]])`;
    client.fetch(countQuery, { restaurantId }).then(setActiveOrderCount);
    const subscription = client.listen(
        `*[_type == "foodOrder" && restaurant._ref == $restaurantId]`, 
        { restaurantId }
    ).subscribe(() => {
       client.fetch(countQuery, { restaurantId }).then(setActiveOrderCount);
    });
    return () => subscription.unsubscribe();
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: (props) => <TabBarIcon {...props} route={route} badgeCount={activeOrderCount} />,
        tabBarActiveTintColor: COLORS.primaryYellow,
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: COLORS.white,
          height: 60,
          paddingBottom: 5,
        },
        headerShown: false,
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ headerShown: false }}/>
      <Tab.Screen name="Menu" component={MenuScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryYellow} />
      </View>
    );
  }

  return (
    // theme={MyTheme} සහ ref={navigationRef} මෙහිදී එකතු කළා
    <NavigationContainer theme={MyTheme} ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="AddMenuItemScreen" component={AddMenuItemScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="ManageCategoriesScreen" component={ManageCategoriesScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="OrderDetailsScreen" component={OrderDetailsScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="OrderReportScreen" component={OrderReportScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="ManageStaffScreen" component={ManageStaffScreen} options={{ presentation: 'modal' }}/>
            <Stack.Screen name="AddStaffScreen" component={AddStaffScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="PaymentSettingsScreen" component={PaymentSettingsScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="HelpScreen" component={HelpScreen} />
            <Stack.Screen name="TermsScreen" component={TermsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: { width: 24, height: 24, position: 'relative' },
  badge: { 
      position: 'absolute', 
      top: -2, 
      right: -6, 
      width: 10, 
      height: 10, 
      borderRadius: 5, 
      backgroundColor: COLORS.danger, 
      borderWidth: 1.5, 
      borderColor: COLORS.white,
      zIndex: 10
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }
});

export default AppNavigator;
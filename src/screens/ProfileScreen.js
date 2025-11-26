// src/screens/ProfileScreen.js
// --- FINAL: Updated with new Profile Icon styling and Background ---

// ✅ Mehema wenas karanna
import React, { useState, useCallback,useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { client, urlFor } from '../sanity/sanityClient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const placeholderImage = 'https://placehold.co/100x100/e0e0e0/b0b0b0?text=Logo';

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  // --- (1) Fetch logic (unchanged) ---
  const fetchProfileData = async () => {
    if (!user || !user.restaurant) {
      setIsLoading(false);
      return;
    }
    const restaurantId = user.restaurant._ref;
    const query = `{
      "restaurant": *[_type == "restaurant" && _id == $restaurantId][0],
      "staff": *[_type == "restaurantUser" && _id == $userId][0]{_id, email, role}
    }`;
    try {
      const data = await client.fetch(query, { restaurantId, userId: user._id });
      setProfile(data);
      if (data?.staff?.role === 'Owner') {
        setIsOwner(true);
      } else {
        setIsOwner(false);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      Toast.show({ type: 'error', text1: 'Error fetching profile' });
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchProfileData();
    }, [user])
  );

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive", 
          onPress: () => logout()
        }
      ]
    );
  };

  const handleGenerateReport = () => {
    navigation.navigate('OrderReportScreen');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryYellow} />
      </SafeAreaView>
    );
  }

  const restaurantName = profile?.restaurant?.name || 'Restaurant';
  const userEmail = profile?.staff?.email || user.email;
  const logoUrl = profile?.restaurant?.logo
    ? urlFor(profile.restaurant.logo).width(200).url()
    : placeholderImage;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        
        <View style={styles.profileHeader}>
          <Image source={{ uri: logoUrl }} style={styles.profileImage} />
          <Text style={styles.restaurantName}>{restaurantName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => navigation.navigate('EditProfileScreen')}>
            <Ionicons name="pencil" size={16} color={COLORS.yellowButtonText} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuContainer}>
          {/* --- (2) Payment Settings (Owner-ta vitharak) --- */}
          {isOwner && (
            <ProfileMenuItem 
              icon="wallet-outline"
              title="Payment Account Settings"
              onPress={() => navigation.navigate('PaymentSettingsScreen')}
            />
          )}

          {isOwner && (
            <ProfileMenuItem 
              icon="people-outline"
              title="Staff Management"
              onPress={() => navigation.navigate('ManageStaffScreen')}
            />
          )}

          <ProfileMenuItem 
            icon="document-text-outline"
            title="Generate Order Report"
            onPress={handleGenerateReport}
          />
          
          <ProfileMenuItem 
            icon="information-circle-outline"
            title="Help & Support"
            onPress={() => navigation.navigate('HelpScreen')} // --- (3) Link to new static screen
          />
          <ProfileMenuItem 
            icon="shield-checkmark-outline"
            title="Terms & Conditions"
            onPress={() => navigation.navigate('TermsScreen')} // --- (4) Link to new static screen
          />
          <ProfileMenuItem 
            icon="log-out-outline"
            title="Logout"
            onPress={handleLogout}
            isDestructive={true}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const ProfileMenuItem = ({ icon, title, onPress, isDestructive = false }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Ionicons 
      name={icon} 
      size={24} 
      color={isDestructive ? COLORS.danger : COLORS.primaryYellow} 
      style={styles.menuIcon} 
    />
    <Text style={[styles.menuTitle, isDestructive && { color: COLORS.danger }]}>
      {title}
    </Text>
    <Ionicons 
      name="chevron-forward-outline" 
      size={22} 
      color={COLORS.textLight} 
    />
  </TouchableOpacity>
);

// --- Styles (CHANGED as requested) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white, // CHANGED: 'white space' nathi wenna white kalu
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white, // CHANGED: 'white space' nathi wenna white kalu
  },
  container: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: COLORS.white,
    paddingVertical: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  profileImage: {
    width: 120,       // CHANGED: Size eka wadi kala (100 -> 120)
    height: 120,      // CHANGED: Size eka wadi kala (100 -> 120)
    borderRadius: 60, // CHANGED: Size ekata galapenna (50 -> 60)
    backgroundColor: COLORS.border,
    marginBottom: 15,
    borderWidth: 4,    // ADDED: Yellow outline eka
    borderColor: COLORS.primaryYellow, // ADDED: Yellow outline eka
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  userEmail: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 15,
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryYellow,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  editButtonText: {
    color: COLORS.yellowButtonText,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  menuContainer: {
    marginTop: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIcon: {
    width: 30,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textNormal,
    marginLeft: 10,
  },
});

export default ProfileScreen;
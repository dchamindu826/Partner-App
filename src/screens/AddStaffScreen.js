// src/screens/AddStaffScreen.js
// --- FIXED: Removed 'name' field to match schema ---

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, StatusBar, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { client } from '../sanity/sanityClient';
import CustomButton from '../components/CustomButton';
import CustomTextInput from '../components/CustomTextInput';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';

const AddStaffScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);

  // --- (1) 'name' state eka ayin kala ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Staff');

  const handleAddStaff = async () => {
    // --- (2) 'name' validation eka ayin kala ---
    if (!email || !password || !role) {
      Toast.show({ type: 'error', text1: 'Missing Fields' });
      return;
    }
    setIsLoading(true);

    try {
      const restaurantId = user.restaurant._id;

      // --- (3) 'name' field eka nathiwa doc eka hadanawa ---
      const doc = {
        _type: 'restaurantUser',
        email: email.toLowerCase(),
        password: password,
        role: role,
        restaurant: { 
          _type: 'reference', 
          _ref: restaurantId 
        },
      };

      await client.create(doc);

      setIsLoading(false);
      Toast.show({ type: 'success', text1: 'Staff Member Added!' });
      navigation.goBack();

    } catch (err) {
      setIsLoading(false);
      console.error('Add staff error:', err);
      if (err.message.includes('already exists')) {
        Toast.show({ type: 'error', text1: 'Email Already Exists' });
      } else {
        Toast.show({ type: 'error', text1: 'Failed to add staff' });
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="close-outline" size={30} color={COLORS.textDark} />
            </TouchableOpacity>
            <Text style={styles.title}>Add New Staff Member</Text>
          </View>

          {/* --- (4) 'name' input eka ayin kala --- */}
          <CustomTextInput 
            iconName="mail-outline" 
            placeholder="Staff Login Email" 
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address"
          />
          <CustomTextInput 
            iconName="lock-closed-outline" 
            placeholder="Temporary Password" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry
          />

          <Text style={styles.label}>Select Role</Text>
          <View style={styles.pickerContainer}>
            <RNPickerSelect
              items={[
                { label: 'Staff (Orders Only)', value: 'Staff' },
                { label: 'Manager (Orders + Menu)', value: 'Manager' },
                { label: 'Owner (Full Access)', value: 'Owner' },
              ]}
              onValueChange={(value) => setRole(value)}
              value={role}
              style={pickerSelectStyles}
              useNativeAndroidPickerStyle={false}
              Icon={() => <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />}
            />
          </View>
          
          <View style={styles.buttonSection}>
            <CustomButton 
              title={isLoading ? 'Adding...' : 'Add Staff Member'} 
              onPress={handleAddStaff} 
              disabled={isLoading} 
            />
            {isLoading && <ActivityIndicator size="large" color={COLORS.primaryYellow} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Styles...
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backButton: { padding: 5 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark, marginLeft: 15, flex: 1 },
  label: { fontSize: 14, color: COLORS.textLight, marginBottom: 5, marginLeft: 5, marginTop: 10 },
  pickerContainer: {
    backgroundColor: COLORS.lightBackground, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 12,
  },
  buttonSection: { marginTop: 30, marginBottom: 40 },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: { fontSize: 16, paddingVertical: 18, paddingHorizontal: 15, color: COLORS.textDark },
  inputAndroid: { fontSize: 16, paddingVertical: 18, paddingHorizontal: 15, color: COLORS.textDark },
  iconContainer: { top: 18, right: 15 },
  placeholder: { color: COLORS.textLight },
});

export default AddStaffScreen;
// src/screens/PaymentSettingsScreen.js
// --- FIXED: Added 'ScrollView' and 'KeyboardAvoidingView' to imports ---

import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, 
  ScrollView, // --- (!!!) 1. SCROLLVIEW FIX EKA (!!!) ---
  Platform, StatusBar, TouchableOpacity, 
  ActivityIndicator, 
  KeyboardAvoidingView // --- (!!!) 2. KEYBOARD FIX EKA (!!!) ---
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { client } from '../sanity/sanityClient';
import CustomButton from '../components/CustomButton';
import CustomTextInput from '../components/CustomTextInput';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const PaymentSettingsScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [restaurantId, setRestaurantId] = useState(null);
  
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      if (user && user.restaurant) {
        const restId = user.restaurant._ref;
        setRestaurantId(restId);
        const query = `*[_type == "restaurant" && _id == $restId][0]{ 
          bankDetails,
          "accountName": bankDetails.accountName 
        }`;
        
        client.fetch(query, { restId }).then(data => {
          if (data && data.bankDetails) {
            setBankName(data.bankDetails.bankName || '');
            setAccountNumber(data.bankDetails.accountNumber || '');
            setAccountName(data.accountName || '');
          }
          setIsLoading(false);
        }).catch(err => {
          console.error("Fetch payment error:", err);
          setIsLoading(false);
          Toast.show({ type: 'error', text1: 'Error loading bank details' });
        });
      }
    }, [user])
  );

  const handleSave = async () => {
    if (!bankName || !accountNumber || !accountName) {
      Toast.show({ type: 'error', text1: 'Missing Fields' });
      return;
    }
    setIsSaving(true);

    try {
      await client.patch(restaurantId).set({
        bankDetails: {
          _type: 'object',
          bankName: bankName,
          accountNumber: accountNumber,
          accountName: accountName,
        }
      }).commit(); 

      setIsSaving(false);
      Toast.show({ type: 'success', text1: 'Bank Details Updated!' });
      navigation.goBack(); 

    } catch (err) {
      setIsSaving(false);
      console.error('Save bank error:', err);
      Toast.show({ type: 'error', text1: 'Update Failed', text2: err.message });
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
            <Text style={styles.title}>Payment Settings</Text>
          </View>

          {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.primaryYellow} style={{ marginTop: 50 }} />
          ) : (
              <View>
                  <Text style={styles.subtitle}>Enter the bank account details where RapidGo will transfer your weekly earnings.</Text>
                  
                  <CustomTextInput 
                      iconName="business-outline" 
                      placeholder="Bank Name" 
                      value={bankName} 
                      onChangeText={setBankName} 
                  />
                  <CustomTextInput 
                      iconName="keypad-outline" 
                      placeholder="Account Number" 
                      value={accountNumber} 
                      onChangeText={setAccountNumber} 
                      keyboardType="numeric"
                  />
                  <CustomTextInput 
                      iconName="person-outline" 
                      placeholder="Account Holder Name" 
                      value={accountName} 
                      onChangeText={setAccountName} 
                  />

                  <View style={styles.buttonSection}>
                      <CustomButton 
                        title={isSaving ? 'Saving...' : 'Save Details'} 
                        onPress={handleSave} 
                        disabled={isSaving} 
                      />
                      {isSaving && <ActivityIndicator size="large" color={COLORS.primaryYellow} />}
                  </View>
              </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { padding: 5 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark, marginLeft: 15 },
  subtitle: { fontSize: 16, color: COLORS.textNormal, marginBottom: 20 },
  buttonSection: { marginTop: 30, marginBottom: 40 },
});

export default PaymentSettingsScreen;
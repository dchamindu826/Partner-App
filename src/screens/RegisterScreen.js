// src/screens/RegisterScreen.js

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, StatusBar, Image, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../theme/colors';
import CustomButton from '../components/CustomButton';
import CustomTextInput from '../components/CustomTextInput';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { client } from '../sanity/sanityClient';
import Toast from 'react-native-toast-message';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [image, setImage] = useState(null);
  const [imageAsset, setImageAsset] = useState(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const selectedImageUri = result.assets[0].uri;
      setImage(selectedImageUri);
      Toast.show({ type: 'info', text1: 'Logo Uploading...' });

      try {
        const response = await fetch(selectedImageUri);
        const blob = await response.blob();
        const uploadedAsset = await client.assets.upload('image', blob);
        setImageAsset(uploadedAsset);
        Toast.show({ type: 'success', text1: 'Logo Uploaded Successfully!' });
      } catch (err) {
        console.error('Image upload error:', err);
        setImage(null);
        setImageAsset(null);
        Toast.show({ type: 'error', text1: 'Logo Upload Failed', text2: 'Please try again.' });
      }
    }
  };

  const handleRegister = async () => {
    if (!restaurantName || !email || !phone || !password || !confirmPassword) {
      Toast.show({ type: 'error', text1: 'Missing Fields' });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Password Mismatch' });
      return;
    }
    if (!imageAsset) {
      Toast.show({ type: 'error', text1: 'Missing Logo' });
      return;
    }

    setIsLoading(true);

    try {
      // --- (1) STEP 1: Create Restaurant ---
      const restaurantDoc = {
        _type: 'restaurant',
        name: restaurantName,
        phone: phone,
        logo: {
          _type: 'image',
          asset: { _type: 'reference', _ref: imageAsset._id }
        },
        slug: {
          _type: 'slug',
          current: restaurantName.toLowerCase().replace(/\s+/g, '-').slice(0, 200) + '-' + Math.floor(Math.random() * 1000),
        }
      };

      const createdRestaurant = await client.create(restaurantDoc);
      console.log("Restaurant Created ID:", createdRestaurant._id);

      // --- (2) STEP 2: Create User ---
      const userDoc = {
        _type: 'restaurantUser',
        email: email.toLowerCase(),
        password: password,
        role: 'Owner',
        restaurant: {
          _type: 'reference',
          _ref: createdRestaurant._id,
        },
      };
      
      await client.create(userDoc);

      setIsLoading(false);
      Alert.alert("Success", "Registration Successful! Please Login.");
      navigation.navigate('Login');

    } catch (err) {
      setIsLoading(false);
      console.error('Registration error:', err.message);
      
      if (err.message.includes('already exists')) {
        Toast.show({ type: 'error', text1: 'Registration Failed', text2: 'This email is already registered.' });
      } else {
        Toast.show({ type: 'error', text1: 'Registration Failed', text2: 'Please try again.' });
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back-outline" size={28} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join as a RapidGo Partner</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
        >
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.logoImage} />
            ) : (
              <>
                <Ionicons name="image-outline" size={40} color={COLORS.textLight} />
                <Text style={styles.imagePickerText}>Profile Picture</Text>
              </>
            )}
          </TouchableOpacity>

          <CustomTextInput
            iconName="restaurant-outline"
            placeholder="Restaurant Name"
            value={restaurantName}
            onChangeText={setRestaurantName}
          />
          
          <CustomTextInput
            iconName="mail-outline"
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          
          <CustomTextInput
            iconName="call-outline"
            placeholder="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          
          <CustomTextInput
            iconName="lock-closed-outline"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <CustomTextInput
            iconName="lock-closed-outline"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <View style={styles.buttonSection}>
            <CustomButton 
              title={isLoading ? "Registering..." : "Register"} 
              onPress={handleRegister} 
              disabled={isLoading} 
            />
            {isLoading && <ActivityIndicator size="large" color={COLORS.primaryYellow} style={{marginTop: 10}} />}
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginText}>Login Now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, paddingHorizontal: 25 },
  headerContainer: { paddingTop: 10, marginBottom: 20, alignItems: 'center' },
  backButton: { position: 'absolute', left: 0, top: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.textDark, marginTop: 10 },
  subtitle: { fontSize: 16, color: COLORS.textLight },
  imagePicker: { height: 120, width: 120, borderRadius: 60, backgroundColor: COLORS.lightBackground, borderColor: COLORS.border, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginVertical: 20, overflow: 'hidden' },
  logoImage: { height: 120, width: 120 },
  imagePickerText: { color: COLORS.textLight, fontSize: 12, marginTop: 5 },
  buttonSection: { marginTop: 10 },
  footerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { fontSize: 14, color: COLORS.textLight },
  loginText: { fontSize: 14, color: COLORS.primaryYellow, fontWeight: 'bold' },
});

export default RegisterScreen;
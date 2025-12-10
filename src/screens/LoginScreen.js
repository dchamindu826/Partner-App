// src/screens/LoginScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../theme/colors';
import CustomButton from '../components/CustomButton';
import CustomTextInput from '../components/CustomTextInput';
import { client } from '../sanity/sanityClient';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please enter email and password.' });
      return;
    }
    setIsLoading(true);

    try {
      const query = `*[_type == "restaurantUser" && email == $email && password == $password][0]{
  ...,
  restaurant->{_id, name, logo, isOpen}
}`;
      const params = {
        email: email.toLowerCase(),
        password: password,
      };
      const user = await client.fetch(query, params);

      if (user) {
        setIsLoading(false);
        Toast.show({ type: 'success', text1: 'Login Successful!' });
        login(user);
      } else {
        setIsLoading(false);
        Toast.show({ type: 'error', text1: 'Login Failed', text2: 'Invalid email or password.' });
      }
    } catch (err) {
      setIsLoading(false);
      console.error('Sanity login error:', err.message);
      Toast.show({ type: 'error', text1: 'Error', text2: 'An unknown error occurred.' });
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password?",
      "To reset your password, please contact RapidGo Admin at 077-1234567.",
      [
        { text: "OK", style: "default" }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        
        <View style={styles.headerContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
          />
          <Text style={styles.title}>Welcome, Partner</Text>
          <Text style={styles.subtitle}>Login to your restaurant dashboard</Text>
        </View>

        <View style={styles.inputSection}>
          <CustomTextInput
            iconName="mail-outline"
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <CustomTextInput
            iconName="lock-closed-outline"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          {/* Fixed: Removed comment from inside JSX to prevent text string error */}
          <TouchableOpacity 
            style={styles.forgotPasswordButton} 
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonSection}>
          <CustomButton 
            title={isLoading ? "Logging in..." : "Login"} 
            onPress={handleLogin} 
            disabled={isLoading}
          />
          {isLoading && <ActivityIndicator size="large" color={COLORS.primaryYellow} style={{marginTop: 10}} />}
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerText}>Register Now</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoImage: {
    width: 600,
    height: 250,
    resizeMode: 'contain',
    marginBottom: -40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  inputSection: {
    marginBottom: 10,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginVertical: 5,
  },
  forgotPasswordText: {
    color: COLORS.textNormal,
    fontSize: 14,
  },
  buttonSection: {
    marginTop: 10,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  registerText: {
    fontSize: 14,
    color: COLORS.primaryYellow,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
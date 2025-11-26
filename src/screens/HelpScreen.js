import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, StatusBar, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const HelpScreen = () => {
  const navigation = useNavigation();

  // Call Button Function
  const handleCall = () => {
    const phoneNumber = 'tel:0706004033';
    Linking.canOpenURL(phoneNumber)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneNumber);
        } else {
          Alert.alert("Error", "Phone calls are not supported on this device.");
        }
      })
      .catch((err) => console.error('An error occurred', err));
  };

  // Email Button Function
  const handleEmail = () => {
    const email = 'mailto:rapidgo.deliverysl@gmail.com?subject=Support Request - RapidGo Partner';
    Linking.canOpenURL(email)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(email);
        } else {
          Alert.alert("Error", "Email app is not available.");
        }
      })
      .catch((err) => console.error('An error occurred', err));
  };
  
  // WhatsApp Button Function (Optional)
  const handleWhatsApp = () => {
     const whatsappNo = 'whatsapp://send?phone=94706004033&text=Hello RapidGo Support, I need help.';
     Linking.canOpenURL(whatsappNo)
       .then((supported) => {
         if (supported) {
            return Linking.openURL(whatsappNo);
         } else {
            Alert.alert("Error", "WhatsApp is not installed.");
         }
       })
       .catch((err) => console.error('Error opening WhatsApp', err));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={30} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
      </View>
      
      <ScrollView style={styles.container}>
        <Text style={styles.sectionTitle}>Common Issues</Text>
        <Text style={styles.bodyText}>
          If you are experiencing app issues (crashing, slow loading, etc.), please ensure you have restarted your device. Most issues are resolved by clearing the app cache.
        </Text>
        
        <Text style={styles.sectionTitle}>Contact Support</Text>
        <Text style={styles.bodyText}>
          For urgent issues regarding order fulfillment or technical problems, tap below to contact us:
        </Text>
        
        <View style={styles.buttonContainer}>
          {/* Call Button */}
          <TouchableOpacity style={[styles.contactBtn, styles.callBtn]} onPress={handleCall}>
             <Ionicons name="call" size={24} color="#fff" />
             <Text style={styles.btnText}>Call Hotline</Text>
          </TouchableOpacity>

           {/* WhatsApp Button */}
           <TouchableOpacity style={[styles.contactBtn, styles.whatsappBtn]} onPress={handleWhatsApp}>
             <Ionicons name="logo-whatsapp" size={24} color="#fff" />
             <Text style={styles.btnText}>WhatsApp Us</Text>
          </TouchableOpacity>

          {/* Email Button */}
          <TouchableOpacity style={[styles.contactBtn, styles.emailBtn]} onPress={handleEmail}>
             <Ionicons name="mail" size={24} color="#fff" />
             <Text style={styles.btnText}>Send Email</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>Support operating hours are 9 AM - 10 PM daily.</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.lightBackground },
  headerContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.white },
  backButton: { padding: 5 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark, marginLeft: 15, flex: 1 },
  container: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginTop: 15, marginBottom: 10 },
  bodyText: { fontSize: 16, color: COLORS.textNormal, lineHeight: 24, marginBottom: 15 },
  
  // Button Styles
  buttonContainer: {
    gap: 15,
    marginBottom: 20,
    marginTop: 10,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    elevation: 3, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  callBtn: {
    backgroundColor: '#007bff', // Blue
  },
  whatsappBtn: {
    backgroundColor: '#25D366', // WhatsApp Green
  },
  emailBtn: {
    backgroundColor: '#E67E22', // Orange
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  
  footerText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 40,
  }
});

export default HelpScreen;
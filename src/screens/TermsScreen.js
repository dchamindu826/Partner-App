// src/screens/TermsScreen.js
// --- Static Page: Terms & Conditions ---

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const TermsScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={30} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.title}>Terms & Conditions</Text>
      </View>
      <ScrollView style={styles.container}>
        <Text style={styles.sectionTitle}>1. Agreement to Terms</Text>
        <Text style={styles.bodyText}>
          By accessing or using the RapidGo Partner Application, you agree to be bound by these Terms and Conditions. This agreement applies to all restaurant owners and staff using our platform.
        </Text>
        
        <Text style={styles.sectionTitle}>2. Order Acceptance and Fulfillment</Text>
        <Text style={styles.bodyText}>
          You must accept or decline new orders promptly. Once an order status is marked 'Ready for Pickup', the transfer of liability to RapidGo and the assigned rider is initiated.
        </Text>
        
        <Text style={styles.sectionTitle}>3. Payouts (COD)</Text>
        <Text style={styles.bodyText}>
          Payouts for all completed Cash On Delivery (COD) orders, minus RapidGo's commission, are reconciled and transferred weekly to the bank account provided in the Payment Settings section. Only orders marked 'Completed' in the system are eligible for weekly transfer.
        </Text>
        
        <Text style={styles.footerText}>Last Updated: 12 Nov 2025</Text>
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
  footerText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 30,
  }
});

export default TermsScreen;
// src/screens/ManageStaffScreen.js
// --- FIXED: Shows 'email' instead of 'name' ---

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Platform, StatusBar, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { client } from '../sanity/sanityClient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const ManageStaffScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);

  // --- (1) Query eken 'name' ayin kala ---
  const fetchStaff = async () => {
    if (!user || !user.restaurant) return;
    setIsLoading(true);
    const restaurantId = user.restaurant._id;
    const query = `*[_type == "restaurantUser" && restaurant._ref == $restaurantId && _id != $ownerId] | order(email asc) { _id, email, role }`;

    try {
      const data = await client.fetch(query, { restaurantId, ownerId: user._id });
      setStaffList(data || []);
    } catch (err) {
      console.error("Failed to fetch staff:", err);
      Toast.show({ type: 'error', text1: 'Error fetching staff' });
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStaff();
    }, [user])
  );

  // --- (2) Delete message eka 'email' walata wenas kala ---
  const handleDelete = (staffMember) => {
    Alert.alert(
      "Delete Staff Member",
      `Are you sure you want to delete ${staffMember.email}? This will remove their app access.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await client.delete(staffMember._id);
              Toast.show({ type: 'success', text1: 'Staff Member Deleted' });
              fetchStaff();
            } catch (err) {
              Toast.show({ type: 'error', text1: 'Delete Failed' });
            }
          }
        }
      ]
    );
  };

  // --- (3) List eke 'name' wenuwata 'email' pennanawa ---
  const renderStaffMember = ({ item }) => (
    <View style={styles.staffRow}>
      <View style={styles.staffInfo}>
        <Text style={styles.staffName}>{item.email}</Text>
        <Text style={styles.staffRole}>{item.role}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
        <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="close-outline" size={30} color={COLORS.textDark} />
            </TouchableOpacity>
            <Text style={styles.title}>Staff Management</Text>
          </View>

          {/* (Add Staff Form eka me file eken ayin karala, AddStaffScreen ekata gaththa) */}

          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primaryYellow} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={staffList}
              keyExtractor={(item) => item._id}
              ListEmptyComponent={<Text style={styles.emptyText}>No staff members found. Tap '+' to add.</Text>}
              renderItem={renderStaffMember}
            />
          )}

          <TouchableOpacity 
            style={styles.fab} 
            onPress={() => navigation.navigate('AddStaffScreen')}
          >
            <Ionicons name="add" size={32} color={COLORS.yellowButtonText} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  headerContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { padding: 5 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark, marginLeft: 15 },
  staffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: { // Me_class eka_dan 'email' ekata
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  staffEmail: { // Me class eka_dan_use wenne_na
    fontSize: 14,
    color: COLORS.textNormal,
  },
  staffRole: {
    fontSize: 12,
    color: COLORS.white,
    backgroundColor: COLORS.textLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  actionButton: {
    marginLeft: 20,
    padding: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    color: COLORS.textLight,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryYellow,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});

export default ManageStaffScreen;
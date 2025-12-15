// src/components/NewOrderAlert.js
// --- FINAL FIX: Modern Confirmation UI ---

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions, Animated } from 'react-native';
import { COLORS } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const { height, width } = Dimensions.get('window');

const NewOrderAlert = ({ isVisible, order, onAccept, onReject }) => {
  const [selectedTime, setSelectedTime] = useState(15);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionType, setActionType] = useState(null); // 'accept' or 'reject'

  if (!order || !isVisible) return null;

  const timeOptions = [10, 15, 20, 30, 45, 60];

  const formatCurrency = (amount) => {
    return (amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleRequestAccept = () => {
    setActionType('accept');
    setShowConfirm(true);
  };

  const handleRequestReject = () => {
    setActionType('reject');
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    if (actionType === 'accept') {
      onAccept(order, 'preparing', selectedTime);
    } else if (actionType === 'reject') {
      onReject(order);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
    setActionType(null);
  };

  return (
    <Modal transparent={true} visible={isVisible} animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        {/* Animated Box container */}
        <View style={styles.alertBox}>
          
          {/* --- CONFIRMATION VIEW (Redesigned) --- */}
          {showConfirm ? (
            <View style={styles.confirmContainer}>
              <View style={[
                  styles.confirmIconBg, 
                  { backgroundColor: actionType === 'accept' ? '#E8F5E9' : '#FFEBEE' }
              ]}>
                <Ionicons 
                  name={actionType === 'accept' ? "checkmark-circle" : "close-circle"} 
                  size={64} 
                  color={actionType === 'accept' ? COLORS.success : '#D32F2F'} 
                />
              </View>
              
              <Text style={styles.confirmTitle}>
                {actionType === 'accept' ? 'Accept Order?' : 'Reject Order?'}
              </Text>
              
              <Text style={styles.confirmText}>
                {actionType === 'accept' 
                  ? `You are setting prep time to ${selectedTime} mins.`
                  : 'Are you sure you want to decline this order?'}
              </Text>

              <View style={styles.confirmButtonRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelConfirm}>
                  <Text style={styles.cancelBtnText}>Back</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                      styles.confirmBtn, 
                      { backgroundColor: actionType === 'accept' ? COLORS.success : '#D32F2F' }
                  ]} 
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmBtnText}>
                    {actionType === 'accept' ? 'Yes, Accept' : 'Yes, Reject'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* --- NORMAL ORDER DETAILS VIEW --- */}
              <View style={styles.header}>
                <View style={styles.headerIconBg}>
                    <Ionicons name="notifications" size={28} color={COLORS.primaryYellow} />
                </View>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.title}>New Order Received!</Text>
                    <Text style={styles.orderId}>ID: #{order._id ? order._id.slice(-6).toUpperCase() : '---'}</Text>
                </View>
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* Customer Details */}
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Ionicons name="person" size={18} color={COLORS.textLight} />
                        <Text style={styles.cardTitle}>Customer</Text>
                    </View>
                    <Text style={styles.value}>{order.receiverName || 'Guest'}</Text>
                    <Text style={styles.subValue}>{order.deliveryAddress || 'Pick-up'}</Text>
                </View>

                {/* Items List */}
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Ionicons name="fast-food" size={18} color={COLORS.textLight} />
                        <Text style={styles.cardTitle}>Items</Text>
                    </View>
                    {order.orderedItems?.map((item, index) => {
                        const itemPrice = item.price ? item.price : 0;
                        const itemTotal = itemPrice * item.quantity;
                        return (
                            <View key={index} style={styles.itemRow}>
                                <Text style={styles.itemText}>{item.quantity} x {item.name}</Text>
                                <Text style={styles.itemPrice}>LKR {formatCurrency(itemTotal)}</Text>
                            </View>
                        );
                    })}
                    <View style={styles.divider} />
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Grand Total</Text>
                        <Text style={styles.totalValue}>LKR {formatCurrency(order.foodTotal)}</Text>
                    </View>
                </View>

                {/* Prep Time Selection */}
                <Text style={styles.sectionHeader}>Select Preparation Time (Mins)</Text>
                <View style={styles.timeContainer}>
                  {timeOptions.map((time) => (
                    <TouchableOpacity 
                      key={time} 
                      style={[styles.timeButton, selectedTime === time && styles.activeTimeButton]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Text style={[styles.timeText, selectedTime === time && styles.activeTimeText]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.rejectButton} onPress={handleRequestReject}>
                  <Text style={[styles.buttonText, {color: '#D32F2F'}]}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.acceptButton} 
                  onPress={handleRequestAccept}
                >
                  <Text style={styles.buttonText}>Accept ({selectedTime}m)</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  alertBox: { 
    width: width * 0.9, 
    backgroundColor: '#FAFAFA', 
    borderRadius: 20, 
    maxHeight: height * 0.85, 
    elevation: 20, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    overflow: 'hidden'
  },
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: COLORS.white, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  headerIconBg: { 
    width: 45, 
    height: 45, 
    borderRadius: 25, 
    backgroundColor: '#FFF9C4', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark },
  orderId: { fontSize: 14, color: COLORS.textLight, marginTop: 2 },

  content: { padding: 20 },
  
  // Cards
  card: { 
    backgroundColor: COLORS.white, 
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 15, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.textLight, marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  value: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  subValue: { fontSize: 14, color: COLORS.textNormal, marginTop: 2 },

  // Items
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemText: { fontSize: 15, color: COLORS.textDark, flex: 1, marginRight: 10 },
  itemPrice: { fontSize: 15, color: COLORS.textNormal, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.primaryYellow },

  // Time Selection
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: COLORS.textNormal, marginBottom: 10 },
  timeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  timeButton: { 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#ddd', 
    backgroundColor: COLORS.white 
  },
  activeTimeButton: { backgroundColor: COLORS.primaryYellow, borderColor: COLORS.primaryYellow },
  timeText: { fontSize: 14, color: COLORS.textNormal },
  activeTimeText: { color: 'white', fontWeight: 'bold' },

  // Action Buttons (Footer)
  buttonContainer: { 
    flexDirection: 'row', 
    padding: 20, 
    backgroundColor: COLORS.white, 
    borderTopWidth: 1, 
    borderTopColor: '#eee', 
    gap: 15 
  },
  rejectButton: { 
    flex: 1, 
    paddingVertical: 15, 
    borderRadius: 12, 
    alignItems: 'center', 
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2'
  },
  acceptButton: { 
    flex: 1.5, 
    backgroundColor: COLORS.primaryYellow, 
    paddingVertical: 15, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: COLORS.primaryYellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5
  },
  buttonText: { fontWeight: 'bold', fontSize: 16 },

  // --- CONFIRMATION STYLES (Redesigned) ---
  confirmContainer: { 
    alignItems: 'center', 
    padding: 30, 
    justifyContent: 'center', 
    minHeight: 300 // Fix height jumping issue
  },
  confirmIconBg: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  confirmTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 10, textAlign: 'center' },
  confirmText: { fontSize: 16, color: COLORS.textNormal, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  confirmButtonRow: { flexDirection: 'row', width: '100%', gap: 15 },
  
  cancelBtn: { 
    flex: 1, 
    paddingVertical: 15, 
    backgroundColor: '#F5F5F5', 
    borderRadius: 12, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  cancelBtnText: { color: COLORS.textDark, fontWeight: 'bold', fontSize: 16 },
  
  confirmBtn: { 
    flex: 1.5, 
    paddingVertical: 15, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  confirmBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});

export default NewOrderAlert;
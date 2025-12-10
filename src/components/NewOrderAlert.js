// src/components/NewOrderAlert.js

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const NewOrderAlert = ({ isVisible, order, onAccept, onReject }) => {
  const [selectedTime, setSelectedTime] = useState(15); // Default 15 mins

  if (!order) return null;

  const timeOptions = [10, 15, 20, 30, 45, 60];

  return (
    <Modal transparent={true} visible={isVisible} animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          
          <View style={styles.header}>
            <Ionicons name="notifications-circle" size={50} color={COLORS.primaryYellow} />
            <Text style={styles.title}>New Order Received!</Text>
            <Text style={styles.orderId}>#{order._id ? order._id.slice(-6).toUpperCase() : '---'}</Text>
          </View>

          <ScrollView style={styles.content}>
            {/* Customer Details */}
            <View style={styles.section}>
              <Text style={styles.label}>Customer:</Text>
              <Text style={styles.value}>{order.receiverName || 'Guest'}</Text>
              <Text style={styles.subValue}>{order.deliveryAddress || 'Pick-up'}</Text>
            </View>

            {/* Items */}
            <View style={styles.section}>
              <Text style={styles.label}>Items:</Text>
              {order.orderedItems?.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemText}>{item.quantity} x {item.name}</Text>
                  <Text style={styles.itemPrice}>LKR {item.price * item.quantity}</Text>
                </View>
              ))}
            </View>

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>LKR {order.foodTotal}</Text>
            </View>

            {/* Time Selection */}
            <Text style={styles.label}>Prep Time (Mins):</Text>
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

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.rejectButton} onPress={() => onReject(order)}>
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.acceptButton} 
              onPress={() => onAccept(order, selectedTime)} // Select karapu time eka yawanawa
            >
              <Text style={styles.buttonText}>Accept ({selectedTime}m)</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '85%', elevation: 10 },
  header: { alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  orderId: { fontSize: 14, color: COLORS.textLight },
  content: { marginBottom: 15 },
  section: { marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  label: { fontSize: 12, color: COLORS.textLight, marginBottom: 2 },
  value: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  subValue: { fontSize: 12, color: COLORS.textNormal },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  itemText: { fontSize: 14, color: COLORS.textDark },
  itemPrice: { fontSize: 14, color: COLORS.textNormal },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#eee' },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.primaryYellow },
  
  timeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5, marginBottom: 10 },
  timeButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.lightBackground },
  activeTimeButton: { backgroundColor: COLORS.primaryYellow, borderColor: COLORS.primaryYellow },
  timeText: { fontSize: 12, color: COLORS.textNormal },
  activeTimeText: { color: 'white', fontWeight: 'bold' },

  buttonContainer: { flexDirection: 'row', gap: 10 },
  rejectButton: { flex: 1, backgroundColor: '#FF4444', padding: 12, borderRadius: 10, alignItems: 'center' },
  acceptButton: { flex: 1, backgroundColor: COLORS.primaryYellow, padding: 12, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});

export default NewOrderAlert;
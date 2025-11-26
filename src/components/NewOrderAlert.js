// src/components/NewOrderAlert.js
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, 
  TouchableOpacity, Modal, Dimensions, 
  ActivityIndicator, TextInput 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const { height, width } = Dimensions.get('window');

const NewOrderAlert = ({ isVisible, order, onAccept, onReject }) => {
  const [estimatedTime, setEstimatedTime] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal eka close karala, Accept logic eka run karanawa
  const handleAccept = async () => {
    if (!estimatedTime || estimatedTime <= 0) {
      alert('Please enter a valid estimated preparation time (in minutes).');
      return;
    }
    setIsProcessing(true);
    await onAccept(order, estimatedTime);
    setIsProcessing(false);
    setEstimatedTime(''); // Clear for next time
  };

  const handleReject = async () => {
    setIsProcessing(true);
    await onReject(order);
    setIsProcessing(false);
  };

  if (!order) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={() => {}} // User ta back button eken close karanna denne na
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Ionicons name="notifications-circle" size={80} color={COLORS.primaryYellow} />
          <Text style={styles.modalTitle}>NEW ORDER #{order.orderId}</Text>

          <View style={styles.detailsContainer}>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Customer:</Text> {order.customerName || 'Unknown'}
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Total Items:</Text> {order.items?.length || 0}
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Total Amount:</Text> Rs. {order.foodTotal.toFixed(2)}
            </Text>
          </View>
          
          <Text style={styles.promptText}>Estimated Preparation Time (mins):</Text>
          <TextInput
            style={styles.timeInput}
            onChangeText={setEstimatedTime}
            value={estimatedTime}
            placeholder="e.g., 25"
            keyboardType="numeric"
            maxLength={3}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonAccept]}
              onPress={handleAccept}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={COLORS.yellowButtonText} />
              ) : (
                <Text style={styles.buttonTextAccept}>ACCEPT</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.buttonReject]}
              onPress={handleReject}
              disabled={isProcessing}
            >
              <Text style={styles.buttonTextReject}>REJECT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Dark overlay
  },
  modalView: {
    margin: 20,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: width * 0.9,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: COLORS.textDark,
  },
  detailsContainer: {
    width: '100%',
    padding: 10,
    backgroundColor: COLORS.lightBackground,
    borderRadius: 8,
    marginBottom: 15,
  },
  detailText: {
    fontSize: 16,
    color: COLORS.textNormal,
    marginBottom: 5,
  },
  detailLabel: {
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  promptText: {
    fontSize: 16,
    color: COLORS.textDark,
    marginTop: 10,
    marginBottom: 5,
    fontWeight: '600',
  },
  timeInput: {
    height: 45,
    width: '100%',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonAccept: {
    backgroundColor: COLORS.primaryYellow,
  },
  buttonReject: {
    backgroundColor: COLORS.danger,
  },
  buttonTextAccept: {
    color: COLORS.yellowButtonText,
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonTextReject: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default NewOrderAlert;
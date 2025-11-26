// src/components/OrderCard.js
// --- FINAL PREMIUM DESIGN (FIXED 'status' is undefined BUG) ---

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

// --- (Functions - No Change) ---
const getStatusProps = (status) => {
  if (status === 'completed') return { name: 'Completed', color: COLORS.success, icon: 'checkmark-circle' };
  if (status === 'cancelled') return { name: 'Cancelled', color: COLORS.danger, icon: 'close-circle' };
  if (status === 'pending') return { name: 'Pending', color: '#E67E22', icon: 'alert-circle' };
  if (status === 'preparing') return { name: 'Preparing', color: '#3498DB', icon: 'restaurant' };
  if (status === 'readyForPickup') return { name: 'Ready for Pickup', color: '#9B59B6', icon: 'bag-check' };
  if (status === 'assigned') return { name: 'Assigned', color: '#2C3E50', icon: 'bicycle' };
  if (status === 'onTheWay') return { name: 'On The Way', color: '#2C3E50', icon: 'bicycle' };
  return { name: status, color: COLORS.textNormal, icon: 'help-circle' };
};

const OrderCard = ({ item, onPress }) => {
  const orderId = item._id.slice(-6).toUpperCase();
  const statusProps = getStatusProps(item.orderStatus);
  const customerName = item.receiverName || 'Customer';
  const items = item.orderedItems || [];
  const total = item.foodTotal || 0;
  const firstItemName = items[0]?.name || '...';
  const prepTime = item.preparationTime;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* --- Header: Customer Name & Price --- */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="person-circle-outline" size={24} color={COLORS.textDark} />
          <Text style={styles.customerName}>{customerName}</Text>
        </View>
        <Text style={styles.priceValue}>LKR {total}</Text>
      </View>

      {/* --- Content: Items --- */}
      <View style={styles.content}>
        <Text style={styles.orderId}>Order #{orderId}</Text>
        <Text style={styles.itemSummary}>
          {items.length} items: {items.map(i => i.name).join(', ').slice(0, 50)}...
        </Text>
      </View>

      {/* --- Footer: Status & Time --- */}
      <View style={[styles.footer, { backgroundColor: statusProps.color + '1A' }]}>
        <Ionicons name={statusProps.icon} size={18} color={statusProps.color} />
        <Text style={[styles.statusText, { color: statusProps.color }]}>{statusProps.name}</Text>
        
        {/* --- (!!!) THIS IS THE FIX (!!!) --- */}
        {/* 'status' wenuwata 'item.orderStatus' use karanawa */}
        {item.orderStatus === 'preparing' && prepTime > 0 && (
          <Text style={styles.timeText}>(Est. {prepTime} mins)</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// --- Styles (No Change) ---
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginLeft: 8,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  content: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  orderId: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  itemSummary: {
    fontSize: 14,
    color: COLORS.textNormal,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  timeText: {
    fontSize: 14,
    color: COLORS.textNormal,
    marginLeft: 5,
    fontStyle: 'italic',
  }
});

export default OrderCard;
// src/screens/OrderDetailsScreen.js
// --- FINAL FIXED VERSION (Syntax Error Fixed) ---

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert, TextInput, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { client } from '../sanity/sanityClient';
import CustomButton from '../components/CustomButton';

const OrderDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  
  const { orderId } = route.params || {}; 

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState('');

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
        setIsLoading(false);
        return;
    }
    
    setIsLoading(true);
    const query = `*[_type == "foodOrder" && _id == $orderId][0]{
      _id, 
      orderId, 
      foodTotal, 
      orderStatus, 
      receiverName, 
      deliveryAddress, 
      deliveryFee, 
      _createdAt, 
      "orderedItems": orderedItems[]{
        "name": item->name,
        "price": item->price,
        "quantity": quantity
      }, 
      statusUpdates, 
      estimatedPrepTime
    }`;

    try {
      const fetchedOrder = await client.fetch(query, { orderId });
      setOrder(fetchedOrder);
      
      if (fetchedOrder && fetchedOrder.orderStatus === 'pending' && !fetchedOrder.estimatedPrepTime) {
         setEstimatedTime('25'); 
      }
    } catch (error) {
      console.error("Failed to fetch order details:", error);
      Alert.alert('Error', 'Failed to load order details.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
        fetchOrder();
        const subscription = client.listen(`*[_type == "foodOrder" && _id == $orderId]`, { orderId })
        .subscribe(update => {
            fetchOrder();
        });
        return () => subscription.unsubscribe();
    } else {
        setIsLoading(false);
    }
  }, [fetchOrder, orderId]);

  const updateOrderStatus = async (newStatus, customMessage = null) => {
    if (!order) return;
    setIsUpdating(true);
    const timestamp = new Date().toISOString();
    
    let message = customMessage;
    if (newStatus === 'preparing' && estimatedTime) {
      message = `Accepted, preparing in approx ${estimatedTime} mins.`;
    } else if (newStatus === 'readyForPickup') {
      message = 'Order is ready for pickup by the rider.';
    } else if (newStatus === 'cancelled') {
      message = 'Order cancelled by the restaurant.';
    }

    try {
      await client.patch(order._id).set({
        orderStatus: newStatus,
        estimatedPrepTime: newStatus === 'preparing' ? parseInt(estimatedTime) : order.estimatedPrepTime,
        statusUpdates: [
          ...(order.statusUpdates || []),
          { status: newStatus, timestamp: timestamp, message: message }
        ]
      }).commit();
      
      setIsUpdating(false);
      if (newStatus === 'readyForPickup' || newStatus === 'cancelled' || newStatus === 'rejected') {
         navigation.goBack();
      } else {
         fetchOrder();
      }
    } catch (error) {
      setIsUpdating(false);
      Alert.alert('Error', `Failed to update order status to ${newStatus}.`);
    }
  };

  const handleAction = () => {
    if (!order) return;

    if (order.orderStatus === 'pending') {
      if (!estimatedTime || estimatedTime <= 0) {
        Alert.alert('Missing Time', 'Please enter a valid estimated preparation time in minutes.');
        return;
      }
      updateOrderStatus('preparing');

    } else if (order.orderStatus === 'preparing') {
      updateOrderStatus('readyForPickup');
    }
  };

  const handleCancel = () => {
    if (!order) return;
    const currentStatus = order.orderStatus;
    if (currentStatus === 'completed' || currentStatus === 'cancelled') {
       Alert.alert('Cannot Cancel', `This order is already marked as ${currentStatus}.`);
       return;
    }

    Alert.alert(
      "Confirm Cancellation",
      "Are you sure you want to cancel this order?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive", 
          onPress: () => updateOrderStatus('cancelled')
        }
      ]
    );
  };

  const getNextActionButton = () => {
    switch (order?.orderStatus) {
      case 'pending': return 'Accept Order & Start Preparation';
      case 'preparing': return 'Mark Ready for Pickup';
      case 'readyForPickup': return 'Waiting for Rider...'; 
      default: return null;
    }
  };

  const isCancellable = order && ['pending', 'preparing', 'onTheWay'].includes(order.orderStatus);
  const nextActionButtonText = getNextActionButton();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryYellow} />
      </SafeAreaView>
    );
  }

  if (!orderId || !order) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={50} color={COLORS.textLight} />
        <Text style={styles.errorText}>Order not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonSimple}>
            <Text style={{color: COLORS.primaryYellow, fontWeight: 'bold', fontSize: 16}}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const formattedDate = order._createdAt ? new Date(order._createdAt).toLocaleString() : 'Recently';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={28} color={COLORS.textDark} />
        </TouchableOpacity>
        
        {/* --- (FIXED LINE) Syntax error removed --- */}
        <Text style={styles.headerTitle}>
           Order #{order.orderId || (order._id ? order._id.slice(-6).toUpperCase() : '...')}
        </Text>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.orderStatus) }]}>
          <Text style={styles.statusText}>{order.orderStatus ? order.orderStatus.toUpperCase() : 'UNKNOWN'}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          <Text style={styles.detailText}>Name: {order.receiverName || 'N/A'}</Text>
          <Text style={styles.detailText}>Address: {order.deliveryAddress || 'N/A'}</Text>
          <Text style={styles.detailText}>Created: {formattedDate}</Text>
          {order.estimatedPrepTime && (
            <Text style={styles.detailText}>Prep Time: {order.estimatedPrepTime} mins</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items ({order.orderedItems?.length || 0})</Text>
          
          {order.orderedItems && order.orderedItems.length > 0 ? (
             order.orderedItems.map((item, index) => {
                if (!item) return null; 
                const price = item.price || 0;
                const qty = item.quantity || 0;
                const total = (price * qty).toFixed(2);

                return (
                    <View key={index} style={styles.itemRow}>
                      <Text style={styles.itemQuantity}>{qty}x</Text>
                      <Text style={styles.itemName}>{item.name || 'Unknown Item'}</Text>
                      <Text style={styles.itemPrice}>Rs. {total}</Text>
                    </View>
                );
             })
          ) : (
             <Text style={{color: COLORS.textLight, fontStyle: 'italic'}}>No items listed.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <SummaryRow label="Food Total" value={order.foodTotal} />
          <SummaryRow label="Delivery Fee" value={order.deliveryFee} />
          <View style={styles.separator} />
          <SummaryRow label="Grand Total" value={(order.foodTotal || 0) + (order.deliveryFee || 0)} isTotal={true} />
        </View>
        
        {order.statusUpdates?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Timeline</Text>
            {order.statusUpdates.map((update, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>{update.status ? update.status.toUpperCase() : 'UPDATE'}</Text>
                  <Text style={styles.timelineMessage}>{update.message}</Text>
                  <Text style={styles.timelineTime}>{update.timestamp ? new Date(update.timestamp).toLocaleString() : ''}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        
        <View style={{height: 100}} />
      </ScrollView>

      <View style={styles.footer}>
        {order.orderStatus === 'pending' && (
          <View style={styles.timeInputContainer}>
             <Text style={styles.timeLabel}>Prep Time (mins):</Text>
            <TextInput
              style={styles.timeInput}
              onChangeText={setEstimatedTime}
              value={estimatedTime}
              placeholder="25"
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
        )}

        {nextActionButtonText && order.orderStatus !== 'readyForPickup' && (
          <CustomButton 
            title={isUpdating ? 'Updating...' : nextActionButtonText}
            onPress={handleAction}
            disabled={isUpdating}
            style={styles.actionButton}
          />
        )}
        
        {isCancellable && (
          <CustomButton
            title={isUpdating ? 'Cancelling...' : 'Cancel Order'}
            onPress={handleCancel}
            disabled={isUpdating}
            style={styles.cancelButton}
            textStyle={{ color: COLORS.danger }}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const SummaryRow = ({ label, value, isTotal = false }) => (
  <View style={styles.summaryRow}>
    <Text style={[styles.summaryLabel, isTotal && styles.summaryTotalLabel]}>{label}</Text>
    <Text style={[styles.summaryValue, isTotal && styles.summaryTotalValue]}>
        Rs. {value ? value.toFixed(2) : '0.00'}
    </Text>
  </View>
);

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return COLORS.danger;
    case 'preparing': return COLORS.primaryYellow;
    case 'readyForPickup': return COLORS.success;
    case 'onTheWay': return COLORS.info;
    case 'completed': return COLORS.textLight;
    default: return COLORS.textLight;
  }
};

// src/screens/OrderDetailsScreen.js හි පහළම කොටස

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.lightBackground },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { padding: 5 },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginLeft: 15,
  },
  backButtonSimple: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2
  },
  errorText: {
      fontSize: 18,
      color: COLORS.textLight,
      marginTop: 10,
  },

  container: { flex: 1 },

  // --- (!!!) MEKA THAMAI WENAS KARANNA ONE LINE EKA (!!!) ---
  scrollContent: { 
      padding: 15, 
      paddingBottom: 250 // 20 wenuwata 250 damma. Dan buttons walata yata wenne na.
  }, 
  
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  statusText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 10 },
  detailText: { fontSize: 16, color: COLORS.textNormal, marginBottom: 5 },
  
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemQuantity: { fontSize: 15, color: COLORS.textDark, fontWeight: 'bold', marginRight: 10 },
  itemName: { flex: 1, fontSize: 15, color: COLORS.textNormal },
  itemPrice: { fontSize: 15, color: COLORS.textDark, fontWeight: 'bold' },
  
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  summaryLabel: { fontSize: 16, color: COLORS.textNormal },
  summaryValue: { fontSize: 16, color: COLORS.textDark, fontWeight: '600' },
  separator: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginVertical: 5 },
  summaryTotalLabel: { fontWeight: 'bold', fontSize: 18, color: COLORS.textDark },
  summaryTotalValue: { fontWeight: 'bold', fontSize: 18, color: COLORS.textDark },
  
  timelineItem: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primaryYellow, marginRight: 10, marginTop: 5 },
  timelineContent: { flex: 1 },
  timelineStatus: { fontWeight: 'bold', color: COLORS.textDark, fontSize: 15 },
  timelineMessage: { color: COLORS.textNormal, fontSize: 14 },
  timelineTime: { color: COLORS.textLight, fontSize: 12 },
  
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 15,
    paddingBottom: 30, // Bottom padding eka wadi kala device safe area ekata
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 20, // Shadow eka wadi kala
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'center',
  },
  timeLabel: {
    fontSize: 16,
    color: COLORS.textDark,
    marginRight: 10,
    fontWeight: '600',
  },
  timeInput: {
    width: 80,
    height: 40,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: COLORS.primaryYellow,
    marginBottom: 10, // Button deka athara ida wadi kala
  },
  cancelButton: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.danger,
    borderWidth: 1,
  },
});

export default OrderDetailsScreen;
// src/screens/OrdersScreen.js
// --- FINAL FIX: Added 'useNavigation' and 'TouchableOpacity' imports ---

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, 
  ScrollView, // ScrollView import eka thiyenawa
  ActivityIndicator, RefreshControl, Platform, Alert,
  TouchableOpacity, // --- (!!!) 1. TouchableOpacity IMPORT EKA (!!!) ---
  FlatList // --- (!!!) 1. FlatList IMPORT EKA (!!!) ---
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';
import { client } from '../sanity/sanityClient';
import OrderCard from '../components/OrderCard';
import NewOrderAlert from '../components/NewOrderAlert'; 
// --- (!!!) 2. useNavigation IMPORT EKA (!!!) ---
import { useNavigation, useFocusEffect } from '@react-navigation/native'; 

const getOrderQuery = (status, restaurantId) => {
  return `*[_type == "foodOrder" && restaurant._ref == "${restaurantId}" && orderStatus == "${status}"] | order(_createdAt desc){
    _id, 
    foodTotal, 
    orderStatus, 
    receiverName, 
    deliveryAddress, 
    _createdAt, 
    "orderedItems": orderedItems[]{
        "name": @.item->name,
        "price": @.item->price,
        "quantity": @.quantity
    },
    preparationTime,
    statusUpdates
  }`;
};

const OrdersScreen = () => {
  const { user } = useAuth();
  const restaurantId = user?.restaurant?._ref;
  const [activeTab, setActiveTab] = useState('pending');
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newIncomingOrder, setNewIncomingOrder] = useState(null);

  // --- (!!!) 3. NAVIGATION HOOK EKA CALL KARANAWA (!!!) ---
  const navigation = useNavigation(); 

  const fetchOrders = useCallback(async (tab = activeTab) => {
    if (!restaurantId) return;
    try {
      const query = getOrderQuery(tab, restaurantId);
      const fetchedOrders = await client.fetch(query);
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  }, [restaurantId, activeTab]);

  useEffect(() => {
    if (!restaurantId) return;
    const subscription = client.listen(
      `*[_type == "foodOrder" && restaurant._ref == $restaurantId && orderStatus == "pending"]`, 
      { restaurantId }
    ).subscribe(update => {
      if (update.transition === 'appear') { 
        const newOrder = update.result;
        if (newOrder.orderStatus === 'pending') {
          setNewIncomingOrder(newOrder); 
        }
      }
      fetchOrders(); 
    });
    return () => subscription.unsubscribe();
  }, [restaurantId, fetchOrders]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchOrders().finally(() => setIsLoading(false));
    }, [activeTab, fetchOrders])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, [fetchOrders]);

  const handleOrderAction = async (order, newStatus, estimatedTime = null) => {
    const patch = client.patch(order._id).set({ orderStatus: newStatus });
    if (newStatus === 'preparing') {
      const timestamp = new Date().toISOString();
      patch.set({
        preparationTime: parseInt(estimatedTime),
        statusUpdates: [{ 
          status: 'preparing', 
          timestamp: timestamp 
        }]
      });
    } else if (newStatus === 'cancelled') {
       patch.set({
        statusUpdates: [{ 
          status: 'cancelled', 
          timestamp: new Date().toISOString() 
        }]
      });
    }
    try {
      await patch.commit();
      setNewIncomingOrder(null);
      fetchOrders();
    } catch (error) {
      console.error(`Failed to update order:`, error);
      Alert.alert('Error', `Failed to perform action. Please try again.`);
    }
  };

  const handleAccept = (order, time) => handleOrderAction(order, 'preparing', time);
  const handleReject = (order) => handleOrderAction(order, 'cancelled');

  const tabs = [
    { key: 'pending', title: 'Pending' },
    { key: 'preparing', title: 'Preparing' },
    { key: 'readyForPickup', title: 'Ready' },
    { key: 'assigned', title: 'Assigned' },
    { key: 'onTheWay', title: 'On Way' },
    { key: 'completed', title: 'Completed' },
    { key: 'cancelled', title: 'Cancelled' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.header}>Order Management</Text>
      
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollView}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, activeTab === tab.key && styles.activeTabButton]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* --- (!!!) 4. ScrollView WENUATA FlatList (!!!) --- */}
      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.primaryYellow} style={styles.loading} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          style={styles.listContainer}
          contentContainerStyle={{ paddingBottom: 50 }}
          renderItem={({ item }) => (
            <OrderCard 
              key={item._id} 
              item={item} 
              onPress={() => navigation.navigate('OrderDetailsScreen', { orderId: item._id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={50} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No {activeTab} orders found.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryYellow]} />
          }
        />
      )}

      <NewOrderAlert 
        isVisible={!!newIncomingOrder}
        order={newIncomingOrder}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  header: { fontSize: 24, fontWeight: 'bold', color: COLORS.textDark, padding: 20 },
  tabContainer: { 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border, 
    paddingBottom: 5,
    backgroundColor: COLORS.white,
  },
  tabScrollView: {
    paddingHorizontal: 10,
  },
  tabButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: COLORS.lightBackground,
  },
  activeTabButton: {
    backgroundColor: COLORS.primaryYellow,
  },
  tabText: {
    color: COLORS.textNormal,
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: COLORS.yellowButtonText,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  loading: {
    marginTop: 50,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 18,
    color: COLORS.textLight,
  },
});

export default OrdersScreen;
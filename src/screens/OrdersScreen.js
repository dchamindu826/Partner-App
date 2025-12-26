import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, 
  ActivityIndicator, RefreshControl, 
  TouchableOpacity, FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';
import { client } from '../sanity/sanityClient';
import OrderCard from '../components/OrderCard';
import NewOrderAlert from '../components/NewOrderAlert'; 
import { useNavigation, useFocusEffect } from '@react-navigation/native'; 
import { Audio } from 'expo-av'; // සරලව Audio import කරන්න
import Toast from 'react-native-toast-message';

const getOrderQuery = (status, restaurantId) => {
  return `*[_type == "foodOrder" && restaurant._ref == "${restaurantId}" && orderStatus == "${status}"] | order(_createdAt desc){
    _id, foodTotal, orderStatus, receiverName, receiverPhone, deliveryAddress, _createdAt, 
    "orderedItems": orderedItems[]{ "name": @.item->name, "price": @.item->price, "quantity": @.quantity, "image": @.item->image },
    preparationTime, statusUpdates
  }`;
};

const OrdersScreen = () => {
  const { user } = useAuth();
  const restaurantId = user?.restaurant?._id;
  const [activeTab, setActiveTab] = useState('pending');
  const [orders, setOrders] = useState([]);
  const [tabCounts, setTabCounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // ALERT STATE
  const [newIncomingOrder, setNewIncomingOrder] = useState(null);
  
  const soundRef = useRef(null);
  const isSoundLoading = useRef(false); // Sound එක ඩබල් වෙන එක නවත්තන්න අලුත් Lock එකක්
  const isMounted = useRef(true); 
  const navigation = useNavigation(); 

  // --- SOUND LOGIC (FIXED) ---
  const playAlertSound = async () => {
    // දැනටමත් Sound එකක් Play වෙනවා නම් හෝ Load වෙමින් පවතී නම් ආයේ Play කරන්න එපා
    if (soundRef.current || isSoundLoading.current) return;
    
    isSoundLoading.current = true; // Lock දානවා

    try {
      console.log("🔊 Loading Sound...");

      // Audio Settings (Silent Mode එකෙත් Play වෙන්න)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Sound එක Load කරන්න
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/new_order_alert.mp3'), 
        { isLooping: true, shouldPlay: true }
      );
      
      soundRef.current = sound;
      await sound.playAsync();
      console.log("✅ Sound Started Playing");
      
    } catch (error) {
      console.log("❌ Audio Play Error:", error);
    } finally {
      isSoundLoading.current = false; // Lock එක අයින් කරනවා
    }
  };

  const stopAlertSound = async () => {
    try {
      // Sound එකක් තියෙනවා නම් විතරක් නවත්තන්න
      if (soundRef.current) {
        console.log("🛑 Stopping Sound...");
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (error) {
        console.log("Error stopping sound:", error);
    }
  };

  // --- DATA FETCHING ---
  const fetchOrders = useCallback(async (tab = activeTab) => {
    if (!restaurantId) return;
    try {
      const query = getOrderQuery(tab, restaurantId);
      const fetchedOrders = await client.fetch(query);
      
      const countQuery = `
      {
        "pending": count(*[_type == "foodOrder" && restaurant._ref == "${restaurantId}" && orderStatus == "pending"]),
        "preparing": count(*[_type == "foodOrder" && restaurant._ref == "${restaurantId}" && orderStatus == "preparing"]),
        "readyForPickup": count(*[_type == "foodOrder" && restaurant._ref == "${restaurantId}" && orderStatus == "readyForPickup"]),
        "assigned": count(*[_type == "foodOrder" && restaurant._ref == "${restaurantId}" && orderStatus == "assigned"]),
        "onTheWay": count(*[_type == "foodOrder" && restaurant._ref == "${restaurantId}" && orderStatus == "onTheWay"])
      }
      `;
      const counts = await client.fetch(countQuery);

      if (isMounted.current) {
         setOrders(fetchedOrders);
         setTabCounts(counts);
         
         // Pending Order එකක් තිබේ නම් සහ Popup එක නැත්නම් විතරක් පෙන්නන්න
         if (tab === 'pending' && fetchedOrders.length > 0) {
             const latestOrder = fetchedOrders[0];
             
             // දැනටමත් Popup එක නැත්නම් විතරක් අලුතින් දාන්න
             if (!newIncomingOrder) {
                 setNewIncomingOrder(latestOrder);
                 playAlertSound(); 
             }
         }
      }
    } catch (error) {
      console.error("Fetch error handled");
    }
  }, [restaurantId, activeTab, newIncomingOrder]); // newIncomingOrder dependency එක වැදගත්

  useEffect(() => {
    return () => {
      isMounted.current = false;
      stopAlertSound();
    };
  }, []);
  
  // --- REAL-TIME LISTENER ---
  useEffect(() => {
    if (!restaurantId) return;
    const subscription = client.listen(
      `*[_type == "foodOrder" && restaurant._ref == $restaurantId && !(_id in path("drafts.**"))]`, 
      { restaurantId }
    ).subscribe(async (update) => {
      if (update.transition === 'appear' || update.transition === 'update') { 
        const newOrder = update.result;
        
        if (newOrder && newOrder.orderStatus === 'pending') {
            if (isMounted.current) {
                // දැනට පෙන්වන Order ID එක වෙනස් නම් හෝ Popup එක නැත්නම් විතරක්
                if (!newIncomingOrder || newIncomingOrder._id !== newOrder._id) {
                    const fullOrderQuery = `*[_type == "foodOrder" && _id == $id][0]{
                        _id, foodTotal, orderStatus, receiverName, receiverPhone, deliveryAddress, _createdAt,
                        "orderedItems": orderedItems[]{ "name": @.item->name, "price": @.item->price, "quantity": @.quantity }
                    }`;
                    const fullOrder = await client.fetch(fullOrderQuery, { id: newOrder._id });
                    
                    setNewIncomingOrder(fullOrder); 
                    playAlertSound();
                }
            }
        } else {
            // Status එක Pending නොවී ගියොත් Popup එක සහ Sound එක අයින් කරන්න
            if (newIncomingOrder && newIncomingOrder._id === newOrder._id) {
                setNewIncomingOrder(null);
                stopAlertSound();
            }
        }
      }
      fetchOrders(); 
    });
    return () => subscription.unsubscribe();
  }, [restaurantId, newIncomingOrder]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchOrders().finally(() => {
          if (isMounted.current) setIsLoading(false);
      });
    }, [fetchOrders])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => {
        if(isMounted.current) setRefreshing(false)
    });
  }, [fetchOrders]);
  
  // --- HANDLE ACTION (UPDATED) ---
  const handleOrderAction = async (order, newStatus, estimatedTime = null) => {
    
    // 1. මුලින්ම Sound එක සහ Popup එක අයින් කරන්න
    await stopAlertSound();
    setNewIncomingOrder(null); 

    if (typeof newStatus !== 'string') return;

    const docId = order._id.replace('drafts.', '');
    const generateKey = () => Math.random().toString(36).substring(2, 15);

    const updateItem = {
        _key: generateKey(),
        status: newStatus, 
        timestamp: new Date().toISOString() 
    };

    let patch = client.patch(docId)
        .set({ orderStatus: newStatus }) 
        .setIfMissing({ statusUpdates: [] })
        .append('statusUpdates', [updateItem]);

    if (newStatus === 'preparing' && estimatedTime) {
      patch = patch.set({ preparationTime: parseInt(estimatedTime) });
    }

    try {
      await patch.commit();
      
      // 2. Refresh Data
      fetchOrders(); 

      // 3. Show Styled Toast Message
      setTimeout(() => {
        if (newStatus === 'preparing') {
            Toast.show({
              type: 'success',
              text1: 'Order Accepted! 🍳',
              text2: `Prep time set to ${estimatedTime} mins.`,
              visibilityTime: 4000,
            });
            setActiveTab('preparing'); 
        } else if (newStatus === 'cancelled') {
            Toast.show({
              type: 'error', 
              text1: 'Order Rejected ❌',
              text2: 'Customer has been notified.',
              visibilityTime: 4000,
            });
        }
      }, 300);

    } catch (error) {
      console.error(`Update failed:`, error);
      setTimeout(() => {
        Toast.show({
          type: 'error',
          text1: 'Update Failed',
          text2: 'Please check your internet connection.'
        });
      }, 300);
    }
  };

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
        <FlatList
          horizontal
          data={tabs}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.tabScrollView}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tabButton, activeTab === item.key && styles.activeTabButton]}
              onPress={() => setActiveTab(item.key)}
            >
              <Text style={[styles.tabText, activeTab === item.key && styles.activeTabText]}>
                {item.title}
              </Text>
              {tabCounts[item.key] > 0 && (
                  <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{tabCounts[item.key]}</Text>
                  </View>
              )}
            </TouchableOpacity>
          )}
        />
      </View>

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

      {newIncomingOrder && (
          <NewOrderAlert 
            isVisible={!!newIncomingOrder}
            order={newIncomingOrder}
            onAccept={handleOrderAction}
            onReject={(order) => handleOrderAction(order, 'cancelled')}
          />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  header: { fontSize: 24, fontWeight: 'bold', color: COLORS.textDark, padding: 20 },
  tabContainer: { borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 5, backgroundColor: COLORS.white, height: 60 },
  tabScrollView: { paddingHorizontal: 10, alignItems: 'center' },
  tabButton: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginHorizontal: 5, backgroundColor: COLORS.lightBackground, flexDirection: 'row', alignItems: 'center' },
  activeTabButton: { backgroundColor: COLORS.primaryYellow },
  tabText: { color: COLORS.textNormal, fontWeight: '600', fontSize: 14 },
  activeTabText: { color: COLORS.yellowButtonText },
  tabBadge: { backgroundColor: 'red', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 5 },
  tabBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  listContainer: { flex: 1, paddingHorizontal: 15, paddingTop: 10 },
  loading: { marginTop: 50 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, fontSize: 18, color: COLORS.textLight },
});

export default OrdersScreen;
// src/screens/HomeScreen.js
// --- FINAL FIX: Added Missing Key Logic & Append for Sanity ---

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, ActivityIndicator, 
  TouchableOpacity, Image, StatusBar, RefreshControl, Switch, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { client, urlFor } from '../sanity/sanityClient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnnouncementsModal from '../components/AnnouncementsModal'; 
import NewOrderAlert from '../components/NewOrderAlert';

const placeholderImage = 'https://placehold.co/100x100/FFD700/333?text=Logo';

const HomeScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [restaurantName, setRestaurantName] = useState('Partner');
  const [restaurantLogo, setRestaurantLogo] = useState(null);
  const [restaurantId, setRestaurantId] = useState(null); 
  const [isOpen, setIsOpen] = useState(true); 
  const [isStatusLoading, setIsStatusLoading] = useState(false); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [stats, setStats] = useState({ todayOrders: 0, todayRevenue: 0, pendingOrders: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  
  const [newIncomingOrder, setNewIncomingOrder] = useState(null);
  const isMounted = useRef(true); 
  
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []); 

  // --- LISTENER FOR HOME POPUP ---
  useEffect(() => {
    if (!user?.restaurant?._id) return;
    const rId = user.restaurant._id;

    const subscription = client.listen(
      `*[_type == "foodOrder" && restaurant._ref == $rId && orderStatus == "pending" && !(_id in path("drafts.**"))]`, 
      { rId }
    ).subscribe(async (update) => {
      if (update.transition === 'appear' || update.transition === 'update') {
          const newOrder = update.result;
          if (newOrder && newOrder.orderStatus === 'pending' && !newOrder._id.startsWith('drafts.')) {
              if (isMounted.current) {
                  const fullOrderQuery = `*[_type == "foodOrder" && _id == $id][0]{
                      _id, foodTotal, orderStatus, receiverName, deliveryAddress, _createdAt,
                      "orderedItems": orderedItems[]{ "name": @.item->name, "price": @.item->price, "quantity": @.quantity }
                  }`;
                  const fullOrder = await client.fetch(fullOrderQuery, { id: newOrder._id });
                  setNewIncomingOrder(fullOrder);
              }
          }
      }
    });
    return () => subscription.unsubscribe();
  }, [user]);
  
  // --- ORDER ACTIONS (FIXED LOGIC) ---
  const handleOrderAction = async (order, newStatus, estimatedTime = null) => {
    const docId = order._id.replace('drafts.', '');
    
    // 1. Generate Unique Key (CRITICAL FIX)
    const generateKey = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const updateItem = {
        _key: generateKey(),
        status: newStatus, 
        timestamp: new Date().toISOString() 
    };

    // 2. Use Append instead of Replace (CRITICAL FIX)
    let patch = client.patch(docId).set({ orderStatus: newStatus })
                      .setIfMissing({ statusUpdates: [] })
                      .append('statusUpdates', [updateItem]);
    
    if (newStatus === 'preparing') {
      patch = patch.set({ preparationTime: parseInt(estimatedTime) });
    }

    try {
      await patch.commit();
      setNewIncomingOrder(null); 
      fetchDashboardData();
      Alert.alert("Success", newStatus === 'cancelled' ? "Order Rejected" : "Order Accepted");
    } catch (error) {
      console.error(`Failed to update order:`, error);
      Alert.alert('Error', `Failed to perform action.`);
    }
  };

  const checkAnnouncements = async () => {
    try {
      const idQuery = `*[_type == "announcement"]._id`;
      const serverIds = await client.fetch(idQuery);
      const readIdsString = await AsyncStorage.getItem('readAnnouncements');
      const readIds = readIdsString ? JSON.parse(readIdsString) : [];
      const hasNew = serverIds.some(id => !readIds.includes(id));
      if (isMounted.current) setHasUnread(hasNew);
    } catch (error) {
      console.log("Announcement check error", error);
    }
  };

  const fetchDashboardData = async () => {
    if (!user || !user.restaurant) {
      if (isMounted.current) setIsLoading(false);
      return;
    }
    if (isMounted.current) setIsLoading(true);
    
    const restId = user.restaurant._id;
    if (isMounted.current) setRestaurantId(restId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const query = `
      {
        "restaurantInfo": *[_type == "restaurant" && _id == $restId][0]{ name, logo, isOpen },
        "todayStats": *[_type == "foodOrder" && restaurant._ref == $restId && _createdAt >= $todayISO && orderStatus != "cancelled"],
        "pendingCount": count(*[_type == "foodOrder" && restaurant._ref == $restId && orderStatus == "pending"]),
        "recentOrders": *[_type == "foodOrder" && restaurant._ref == $restId] | order(_createdAt desc) [0...3] { _id, receiverName, foodTotal }
      }
    `;

    try {
      const data = await client.fetch(query, { restId, todayISO });
      
      if (isMounted.current && data.restaurantInfo) { 
        setRestaurantName(data.restaurantInfo.name || 'Partner');
        setRestaurantLogo(data.restaurantInfo.logo || null);
        setIsOpen(data.restaurantInfo.isOpen !== false); 
      }

      let revenue = 0;
      data.todayStats.forEach(order => { 
          if(order.orderStatus === 'completed') revenue += order.foodTotal || 0; 
      });

      if (isMounted.current) { 
        setStats({
          todayOrders: data.todayStats.length,
          todayRevenue: revenue,
          pendingOrders: data.pendingCount,
        });
        setRecentOrders(data.recentOrders || []);
        checkAnnouncements();
      }

    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [user])
  );

  const toggleRestaurantStatus = async (value) => {
    if (!restaurantId) return;
    setIsStatusLoading(true);
    try {
        setIsOpen(value);
        await client.patch(restaurantId).set({ isOpen: value }).commit();
    } catch (error) {
        console.error("Failed to update status:", error);
        Alert.alert("Error", "Failed to update status.");
        setIsOpen(!value); 
    } finally {
        setIsStatusLoading(false);
    }
  };

  const logoUrl = restaurantLogo 
    ? urlFor(restaurantLogo).width(100).height(100).fit('crop').url() 
    : placeholderImage;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryYellow} />
      
      <LinearGradient
        colors={[COLORS.primaryYellow, '#FFC300']}
        style={styles.headerContainer}
      >
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Image source={{ uri: logoUrl }} style={styles.profileImage} />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.welcomeTitle}>Welcome,</Text>
          <Text style={styles.restaurantName} numberOfLines={1}>{restaurantName}</Text>
        </View>

        <TouchableOpacity style={styles.bellButton} onPress={() => setShowAnnouncements(true)}>
          <Ionicons name="notifications" size={28} color={COLORS.white} />
          {hasUnread && <View style={styles.redDot} />}
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.contentContainer}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchDashboardData} />}
        >
          
          <View style={styles.statusCard}>
             <View>
                <Text style={styles.statusTitle}>Restaurant Status</Text>
                <Text style={[styles.statusText, { color: isOpen ? '#28a745' : '#dc3545' }]}>
                    {isOpen ? 'OPEN - Accepting Orders' : 'CLOSED - Not Accepting Orders'}
                </Text>
             </View>
             <Switch
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={isOpen ? "#f5dd4b" : "#f4f3f4"}
                onValueChange={toggleRestaurantStatus}
                value={isOpen}
                disabled={isStatusLoading}
             />
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
              <QuickActionButton title="New Orders" icon="notifications-outline" onPress={() => navigation.navigate('Orders')} badgeCount={stats.pendingOrders}/>
              <QuickActionButton title="Manage Menu" icon="restaurant-outline" onPress={() => navigation.navigate('Menu')} />
              <QuickActionButton title="Add Item" icon="add-circle-outline" onPress={() => navigation.navigate('AddMenuItemScreen', { item: null })} />
              <QuickActionButton title="Profile" icon="person-outline" onPress={() => navigation.navigate('Profile')} />
            </ScrollView>
          </View>
          
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Today's Stats</Text>
            <StatCard title="Revenue (Completed)" value={`LKR ${stats.todayRevenue.toFixed(2)}`} icon="cash-outline" color="#28a745" />
            <StatCard title="Total Orders" value={stats.todayOrders} icon="receipt-outline" color="#007bff" />
            <StatCard title="Pending Orders" value={stats.pendingOrders} icon="hourglass-outline" color="#E67E22" />
          </View>

          <View style={[styles.sectionContainer, { marginBottom: 40 }]}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {recentOrders.length > 0 ? (
              recentOrders.map(order => (
                <RecentOrderItem 
                  key={order._id}
                  id={order._id.slice(-6).toUpperCase()} 
                  name={order.receiverName || 'Customer'} 
                  price={`LKR ${order.foodTotal.toFixed(2)}`} 
                />
              ))
            ) : (
              <Text style={styles.noRecentOrders}>No recent orders found.</Text>
            )}
          </View>
        </ScrollView>
      </View>

      <AnnouncementsModal 
        isVisible={showAnnouncements} 
        onClose={() => setShowAnnouncements(false)}
        onMarkAsRead={() => setHasUnread(false)}
      />

      {/* POPUP */}
      {newIncomingOrder && (
          <NewOrderAlert 
            isVisible={!!newIncomingOrder}
            order={newIncomingOrder}
            onAccept={handleOrderAction} // Passes params automatically
            onReject={(order) => handleOrderAction(order, 'cancelled')}
          />
      )}
    </SafeAreaView>
  );
};

// UI Components
const QuickActionButton = ({ title, icon, onPress, badgeCount }) => (
  <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
    <Ionicons name={icon} size={30} color={COLORS.primaryYellow} />
    <Text style={styles.quickActionTitle}>{title}</Text>
    {badgeCount > 0 && (
         <View style={{ position: 'absolute', top: 5, right: 5, backgroundColor: 'red', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
             <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{badgeCount}</Text>
         </View>
    )}
  </TouchableOpacity>
);

const StatCard = ({ title, value, icon, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Ionicons name={icon} size={30} color={color} style={styles.statIcon} />
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  </View>
);

const RecentOrderItem = ({ id, name, price }) => (
  <View style={styles.recentItem}>
    <View style={styles.recentIcon}>
      <Ionicons name="document-text-outline" size={24} color={COLORS.textNormal} />
    </View>
    <View style={styles.recentDetails}>
      <Text style={styles.recentId}>Order #{id}</Text>
      <Text style={styles.recentName}>{name}</Text>
    </View>
    <Text style={styles.recentPrice}>{price}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.primaryYellow },
  headerContainer: { paddingTop: 10, paddingBottom: 40, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  profileImage: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.white, marginRight: 15 },
  headerText: { flex: 1 },
  welcomeTitle: { fontSize: 16, color: COLORS.yellowButtonText, opacity: 0.8 },
  restaurantName: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  bellButton: { padding: 5, position: 'relative' },
  redDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: 'red', borderWidth: 1, borderColor: COLORS.white },
  contentContainer: { flex: 1, backgroundColor: COLORS.lightBackground, borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -30, paddingTop: 20 },
  statusCard: { backgroundColor: COLORS.white, marginHorizontal: 20, marginTop: 20, marginBottom: 10, borderRadius: 15, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  statusTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 5 },
  statusText: { fontSize: 14, fontWeight: '600' },
  sectionContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 15, paddingHorizontal: 20 },
  horizontalScroll: { paddingBottom: 10 },
  horizontalScrollContent: { paddingLeft: 20, paddingRight: 5 },
  quickActionCard: { width: 100, height: 100, backgroundColor: COLORS.white, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, marginRight: 15 },
  quickActionTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textNormal, marginTop: 8 },
  statCard: { backgroundColor: COLORS.white, borderRadius: 10, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderLeftWidth: 5, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, marginHorizontal: 20 },
  statIcon: { marginRight: 15 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark },
  statTitle: { fontSize: 14, color: COLORS.textLight },
  recentItem: { backgroundColor: COLORS.white, borderRadius: 10, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, marginHorizontal: 20 },
  recentIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lightBackground, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  recentDetails: { flex: 1 },
  recentId: { fontSize: 14, fontWeight: 'bold', color: COLORS.textDark },
  recentName: { fontSize: 14, color: COLORS.textLight },
  recentPrice: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  noRecentOrders: { textAlign: 'center', color: COLORS.textLight, paddingHorizontal: 20 }
});

export default HomeScreen;
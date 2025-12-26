import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, ActivityIndicator, 
    TouchableOpacity, Image, StatusBar, RefreshControl, Switch, Alert,
    AppState
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { client, urlFor } from '../sanity/sanityClient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AnnouncementsModal from '../components/AnnouncementsModal'; 
import NewOrderAlert from '../components/NewOrderAlert';
import Toast from 'react-native-toast-message';

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
  const subscriptionRef = useRef(null); 
  const pollerRef = useRef(null); // RIDER APP PATTERN: Polling ref එක

  useEffect(() => {
    isMounted.current = true;
    return () => { 
        isMounted.current = false; 
        stopAllSync();
    };
  }, []); 

  const checkForPendingOrder = async () => {
      if (!user?.restaurant?._id || !isMounted.current) return;
      try {
          const query = `*[_type == "foodOrder" && restaurant._ref == $id && orderStatus == 'pending'] | order(_createdAt asc)[0] {
              _id, foodTotal, orderStatus, receiverName, deliveryAddress, _createdAt,
              "orderedItems": orderedItems[]{ "name": @.item->name, "price": @.item->price, "quantity": @.quantity }
          }`;
          const pendingOrder = await client.fetch(query, { id: user.restaurant._id });
          if (pendingOrder && isMounted.current) { setNewIncomingOrder(pendingOrder); }
      } catch(e) { console.log("Pending Check Error:", e); }
  };

  // --- (STABILITY FIX) STOP ALL SYNC ---
  const stopAllSync = () => {
    if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
    }
    if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
    }
  };

  // --- (STABILITY FIX) START ALL SYNC (RIDER APP PATTERN) ---
  const startAllSync = useCallback(() => {
    stopAllSync();
    if (!user?.restaurant?._id || !isMounted.current) return;

    // 1. Fetch data immediately
    fetchDashboardData();
    checkForPendingOrder();

    // 2. Set Interval Polling (Every 10 seconds) - Like Rider App
    pollerRef.current = setInterval(() => {
        if (isMounted.current) {
            fetchDashboardData();
            checkForPendingOrder();
        }
    }, 10000);

    // 3. Simple Listener for Real-time triggers
    const rId = user.restaurant._id;
    subscriptionRef.current = client.listen(
        `*[_type == "foodOrder" && restaurant._ref == $rId && orderStatus == "pending"]`, 
        { rId }
    ).subscribe({
        next: () => {
            fetchDashboardData();
            checkForPendingOrder();
        },
        error: (err) => stopAllSync()
    });
  }, [user]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
        if (nextAppState === 'active') {
            // පට්ට වැදගත්: ඇප් එක ඉස්සරහට ආව ගමන්ම fetch කරන්නේ නැතුව 
            // තප්පර 1ක පමාවක් (Delay) දෙනවා Network එක ස්ථාවර වෙන්න
            setTimeout(() => {
                if (isMounted.current) {
                    startAllSync();
                }
            }, 1000); 
        } else {
            stopAllSync(); // Background එකේදී ඔක්කොම නවත්වනවා
        }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);
    startAllSync();
    return () => {
      stopAllSync();
      appStateSub.remove();
    };
  }, [user, startAllSync]);

  
  const handleOrderAction = async (order, newStatus, estimatedTime = null) => {
    const docId = order._id.replace('drafts.', '');
    const generateKey = () => Math.random().toString(36).substring(2, 15);
    const updateItem = { _key: generateKey(), status: newStatus, timestamp: new Date().toISOString() };
    let patch = client.patch(docId).set({ orderStatus: newStatus }).setIfMissing({ statusUpdates: [] }).append('statusUpdates', [updateItem]);
    if (newStatus === 'preparing') patch = patch.set({ preparationTime: parseInt(estimatedTime) });
    try {
      await patch.commit();
      if (isMounted.current) {
        setNewIncomingOrder(null); 
        fetchDashboardData();
        Toast.show({ type: newStatus === 'preparing' ? 'success' : 'error', text1: newStatus === 'preparing' ? 'Order Accepted!' : 'Order Rejected' });
      }
    } catch (error) { console.error(`Failed:`, error); }
  };

  const fetchDashboardData = async () => {
    if (!user || !user.restaurant || !isMounted.current) { if(isMounted.current) setIsLoading(false); return; }
    const restId = user.restaurant._id;
    const today = new Date(); today.setHours(0, 0, 0, 0);
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
        setRestaurantId(restId);
      }
      let revenue = 0;
      data.todayStats.forEach(order => { 
          if(order.orderStatus === 'completed') {
              // 5% Commission Deduction
              revenue += (order.foodTotal || 0) * 0.95; 
          }
      });
      if (isMounted.current) { 
        setStats({ todayOrders: data.todayStats.length, todayRevenue: revenue, pendingOrders: data.pendingCount });
        setRecentOrders(data.recentOrders || []);
      }
    } catch (err) { console.error("Error:", err); } 
    finally { if (isMounted.current) setIsLoading(false); }
  };

  const toggleRestaurantStatus = async (value) => {
    if (!restaurantId || !isMounted.current) return;
    setIsStatusLoading(true);
    try {
        setIsOpen(value);
        await client.patch(restaurantId).set({ isOpen: value }).commit();
    } catch (error) { setIsOpen(!value); } 
    finally { if(isMounted.current) setIsStatusLoading(false); }
  };

  const logoUrl = restaurantLogo ? urlFor(restaurantLogo).width(100).height(100).url() : placeholderImage;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryYellow} />
      <LinearGradient colors={[COLORS.primaryYellow, '#FFC300']} style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}><Image source={{ uri: logoUrl }} style={styles.profileImage} /></TouchableOpacity>
        <View style={styles.headerText}><Text style={styles.welcomeTitle}>Welcome,</Text><Text style={styles.restaurantName} numberOfLines={1}>{restaurantName}</Text></View>
        <TouchableOpacity style={styles.bellButton} onPress={() => setShowAnnouncements(true)}>
          <Ionicons name="notifications" size={28} color={COLORS.white} />
          {hasUnread && <View style={styles.redDot} />}
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.contentContainer}>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchDashboardData} />}>
          <View style={styles.statusCard}>
              <View>
                <Text style={styles.statusTitle}>Restaurant Status</Text>
                <Text style={[styles.statusText, { color: isOpen ? '#28a745' : '#dc3545' }]}>{isOpen ? 'OPEN - Accepting Orders' : 'CLOSED'}</Text>
              </View>
              <Switch trackColor={{ false: "#767577", true: "#81b0ff" }} thumbColor={isOpen ? "#f5dd4b" : "#f4f3f4"} onValueChange={toggleRestaurantStatus} value={isOpen} disabled={isStatusLoading}/>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
              <QuickActionButton title="New Orders" icon="notifications-outline" onPress={() => navigation.navigate('Orders')} badgeCount={stats.pendingOrders}/>
              <QuickActionButton title="Manage Menu" icon="restaurant-outline" onPress={() => navigation.navigate('Menu')} />
              <QuickActionButton title="Add Item" icon="add-circle-outline" onPress={() => navigation.navigate('AddMenuItemScreen', { item: null, categories: [] })} />
              <QuickActionButton title="Profile" icon="person-outline" onPress={() => navigation.navigate('Profile')} />
            </ScrollView>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Today's Stats</Text>
            <StatCard title="Revenue (Net)" value={`LKR ${stats.todayRevenue.toFixed(2)}`} icon="cash-outline" color="#28a745" />
            <StatCard title="Total Orders" value={stats.todayOrders} icon="receipt-outline" color="#007bff" />
            <StatCard title="Pending Orders" value={stats.pendingOrders} icon="hourglass-outline" color="#E67E22" />
          </View>

          <View style={[styles.sectionContainer, { marginBottom: 40 }]}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {recentOrders.length > 0 ? (
              recentOrders.map(order => (
                <RecentOrderItem key={order._id} id={order._id.slice(-6).toUpperCase()} name={order.receiverName || 'Customer'} price={`LKR ${order.foodTotal.toFixed(2)}`} />
              ))
            ) : (
              <Text style={styles.noRecentOrders}>No recent orders found.</Text>
            )}
          </View>
        </ScrollView>
      </View>
      <AnnouncementsModal isVisible={showAnnouncements} onClose={() => setShowAnnouncements(false)} onMarkAsRead={() => setHasUnread(false)}/>
      {newIncomingOrder && (
          <NewOrderAlert isVisible={!!newIncomingOrder} order={newIncomingOrder} onAccept={handleOrderAction} onReject={(order) => handleOrderAction(order, 'cancelled')}/>
      )}
    </SafeAreaView>
  );
};

const QuickActionButton = ({ title, icon, onPress, badgeCount }) => (
  <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
    <View style={styles.quickActionIconContainer}>
        <Ionicons name={icon} size={30} color={COLORS.primaryYellow} />
        {badgeCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{badgeCount}</Text></View>}
    </View>
    <Text style={styles.quickActionTitle} numberOfLines={1}>{title}</Text>
  </TouchableOpacity>
);

const StatCard = ({ title, value, icon, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Ionicons name={icon} size={30} color={color} style={styles.statIcon} />
    <View><Text style={styles.statValue}>{value}</Text><Text style={styles.statTitle}>{title}</Text></View>
  </View>
);

const RecentOrderItem = ({ id, name, price }) => (
  <View style={styles.recentItem}>
    <View style={styles.recentIcon}><Ionicons name="document-text-outline" size={24} color={COLORS.textNormal} /></View>
    <View style={styles.recentDetails}><Text style={styles.recentId}>Order #{id}</Text><Text style={styles.recentName}>{name}</Text></View>
    <Text style={styles.recentPrice}>{price}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.primaryYellow },
  headerContainer: { paddingTop: 10, paddingBottom: 40, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  profileImage: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.white, marginRight: 15 },
  headerText: { flex: 1 },
  welcomeTitle: { fontSize: 16, color: COLORS.yellowButtonText, opacity: 0.8 },
  restaurantName: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  bellButton: { padding: 5, position: 'relative' },
  redDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: 'red', borderWidth: 1, borderColor: COLORS.white },
  contentContainer: { flex: 1, backgroundColor: COLORS.lightBackground, borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -30, paddingTop: 20 },
  statusCard: { backgroundColor: COLORS.white, marginHorizontal: 20, marginTop: 20, marginBottom: 10, borderRadius: 15, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 3 },
  statusTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 5 },
  statusText: { fontSize: 14, fontWeight: '600' },
  sectionContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 15, paddingHorizontal: 20 },
  horizontalScrollContent: { paddingLeft: 20, paddingRight: 5, paddingVertical: 12 },
  quickActionCard: { width: 95, height: 95, backgroundColor: COLORS.white, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 4, marginRight: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, padding: 10 },
  quickActionIconContainer: { marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
  quickActionTitle: { fontSize: 11, fontWeight: 'bold', color: COLORS.textNormal, textAlign: 'center' },
  statCard: { backgroundColor: COLORS.white, borderRadius: 10, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderLeftWidth: 5, elevation: 2, marginHorizontal: 20 },
  statIcon: { marginRight: 15 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark },
  statTitle: { fontSize: 14, color: COLORS.textLight },
  recentItem: { backgroundColor: COLORS.white, borderRadius: 10, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 10, elevation: 1, marginHorizontal: 20 },
  recentIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lightBackground, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  recentDetails: { flex: 1 },
  recentId: { fontSize: 14, fontWeight: 'bold', color: COLORS.textDark },
  recentName: { fontSize: 14, color: COLORS.textLight },
  recentPrice: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  badge: { position: 'absolute', top: -5, right: -10, backgroundColor: 'red', minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  noRecentOrders: { textAlign: 'center', color: COLORS.textLight, paddingHorizontal: 20 }
});

export default HomeScreen;
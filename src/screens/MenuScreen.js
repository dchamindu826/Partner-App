import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  TouchableOpacity, ScrollView, Alert, Platform, StatusBar, TextInput 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { client } from '../sanity/sanityClient';
import MenuItemCard from '../components/MenuItemCard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message'; // <--- FIX: මෙන්න මේ import එක දැම්මා

const MenuScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const canEdit = user?.role === 'Owner' || user?.role === 'Manager';

  const fetchData = async (showLoading = true) => {
    if (!user || !user.restaurant) return;
    if (showLoading) setIsLoading(true);
    const restaurantId = user.restaurant._id;
    // FIX: isDeleted != true කොටස ඇතුළත් කළා
    const query = `
      {
        "categories": *[_type == "foodCategory" && restaurant._ref == $restaurantId] | order(title asc) {
          _id, "name": title
        },
        "items": *[_type == "menuItem" && restaurant._ref == $restaurantId && isDeleted != true] {
          _id, name, description, price, image,
          category->{ _id, "name": title },
          variations[]{ _key, size, price }
        }
      }
    `;
    try {
      const result = await client.fetch(query, { restaurantId });
      setCategories(result.categories || []);
      setMenuItems(result.items || []);
    } catch (err) { console.error("Failed to fetch menu:", err); } 
    finally { if (showLoading) setIsLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [user]));

  const handleEdit = (item) => { navigation.navigate('AddMenuItemScreen', { item: item, categories: categories }); };

  const handleDelete = (item) => {
    Alert.alert(
      "Remove Item", `Are you sure you want to remove "${item.name}" from menu?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", style: "destructive", 
          onPress: async () => {
            try {
              // FIX: Soft delete logic (patching instead of deleting)
              await client.patch(item._id).set({ isDeleted: true }).commit();
              
              setMenuItems(prevItems => prevItems.filter(i => i._id !== item._id));

              Toast.show({
                type: 'success',
                text1: 'Item Removed',
                text2: `${item.name} has been removed from the menu.`
              });
            } catch (err) { 
               console.error(err);
               Toast.show({ type: 'error', text1: 'Remove failed' });
            }
          }
        }
      ]
    );
  };

  const filteredItems = menuItems
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(item => !selectedCategory ? true : item.category?._id === selectedCategory);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryYellow} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.lightBackground} />
      <LinearGradient colors={[COLORS.lightBackground, '#F0F0F0']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.headerContainer}>
        <View>
            <Text style={styles.headerSubtitle}>Manage Your</Text>
            <Text style={styles.headerTitle}>Restaurant Menu</Text>
        </View>
        <TouchableOpacity onPress={() => fetchData(true)} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={COLORS.textLight} style={{marginRight: 10}} />
            <TextInput
                placeholder="Search items (e.g. Fried Rice)"
                placeholderTextColor={COLORS.textLight}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
                </TouchableOpacity>
            )}
        </View>
      </View>

      <View style={{ height: 60 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollContent}>
          <TouchableOpacity 
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}>
            <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat._id}
              style={[styles.categoryChip, selectedCategory === cat._id && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat._id)}>
              <Text style={[styles.categoryText, selectedCategory === cat._id && styles.categoryTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.listOuterContainer}>
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MenuItemCard 
              item={item} 
              onEdit={canEdit ? () => handleEdit(item) : null}
              onDelete={canEdit ? () => handleDelete(item) : null}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="fast-food-outline" size={60} color={COLORS.border} />
              <Text style={styles.emptyText}>No items found</Text>
              <Text style={styles.emptySubText}>{searchQuery ? "Try a different name" : "Add items to your menu"}</Text> 
            </View>
          }
          refreshing={isLoading}
          onRefresh={() => fetchData(false)}
        />
      </View>

      {canEdit && (
        <TouchableOpacity 
          style={styles.fab} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('AddMenuItemScreen', { item: null, categories: categories })}>
          <Ionicons name="add" size={32} color={COLORS.yellowButtonText} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.lightBackground },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightBackground },
  headerContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerSubtitle: { fontSize: 14, color: COLORS.textLight, fontWeight: '600' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.textDark },
  refreshBtn: { padding: 8, backgroundColor: COLORS.white, borderRadius: 12, elevation: 1 },
  searchWrapper: { paddingHorizontal: 20, marginBottom: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 15, paddingHorizontal: 15, height: 50, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.textDark },
  categoryScrollContent: { paddingHorizontal: 20, alignItems: 'center' },
  categoryChip: { paddingHorizontal: 20, paddingVertical: 8, marginRight: 10, borderRadius: 25, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  categoryChipActive: { backgroundColor: COLORS.primaryYellow, borderColor: COLORS.primaryYellow, elevation: 2 },
  categoryText: { color: COLORS.textNormal, fontWeight: '600', fontSize: 14 },
  categoryTextActive: { color: COLORS.yellowButtonText, fontWeight: 'bold' },
  listOuterContainer: { flex: 1 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: COLORS.textLight, marginTop: 10 },
  emptySubText: { fontSize: 14, color: COLORS.textLight, marginTop: 5 },
  fab: { position: 'absolute', bottom: 25, right: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primaryYellow, justifyContent: 'center', alignItems: 'center', elevation: 5 },
});

export default MenuScreen;
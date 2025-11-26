// src/screens/ManageCategoriesScreen.js
// --- FIXED: Keyboard Bug ---

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, Alert, TextInput,
  Platform, StatusBar,
  KeyboardAvoidingView, // <-- (FIX 2) KEYBOARDAVOIDINGVIEW
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { client } from '../sanity/sanityClient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const ManageCategoriesScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  // --- All functions (fetchCategories, handleAdd, handleEdit, handleDelete) are UNCHANGED ---
  // ... (No need to copy them again, they are the same as the last message) ...
  const fetchCategories = async () => {
    if (!user || !user.restaurant) return;
    setIsLoading(true);
    const restaurantId = user.restaurant._ref;
    const query = `*[_type == "foodCategory" && restaurant._ref == $restaurantId] | order(title asc) { _id, "name": title }`;

    try {
      const data = await client.fetch(query, { restaurantId });
      setCategories(data || []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      Toast.show({ type: 'error', text1: 'Error fetching categories' });
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [user])
  );

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    const restaurantId = user.restaurant._ref;
    const doc = {
      _type: 'foodCategory',
      title: newCategoryName.trim(),
      restaurant: { _type: 'reference', _ref: restaurantId },
      slug: { _type: 'slug', current: newCategoryName.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 96) }
    };

    try {
      const newCategory = await client.create(doc);
      setCategories([...categories, { _id: newCategory._id, name: newCategory.title }]);
      setNewCategoryName('');
      Toast.show({ type: 'success', text1: 'Category Added!' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to add category' });
    }
  };

  const handleEdit = (category) => {
    Alert.prompt(
      "Edit Category Name",
      `Enter new name for "${category.name}":`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async (newName) => {
            if (!newName || newName.trim() === category.name) return;
            
            try {
              await client
                .patch(category._id)
                ({ 
                  title: newName.trim(),
                  slug: { _type: 'slug', current: newName.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 96) }
                })
                .commit();
              
              Toast.show({ type: 'success', text1: 'Category Renamed!' });
              fetchCategories();
            } catch (err) {
              Toast.show({ type: 'error', text1: 'Failed to rename' });
            }
          }
        }
      ],
      'plain-text',
      category.name
    );
  };

  const handleDelete = async (category) => {
    try {
      const query = `count(*[_type == "menuItem" && category._ref == $categoryId])`;
      const count = await client.fetch(query, { categoryId: category._id });

      if (count > 0) {
        Alert.alert(
          "Cannot Delete",
          `This category has ${count} item(s) linked to it. Please move or delete those items first.`
        );
        return;
      }

      Alert.alert(
        "Delete Category",
        `Are you sure you want to delete "${category.name}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive", 
            onPress: async () => {
              try {
                await client.delete(category._id);
                Toast.show({ type: 'success', text1: 'Category Deleted' });
                fetchCategories();
              } catch (err) {
                Toast.show({ type: 'error', text1: 'Delete Failed' });
              }
            }
          }
        ]
      );

    } catch (err) {
      Toast.show({ type: 'error', text1: 'Could not perform check' });
    }
  };
  // --- End of unchanged functions ---

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      {/* --- (FIX 2) KEYBOARDAVOIDINGVIEW ADDED --- */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="close-outline" size={30} color={COLORS.textDark} />
            </TouchableOpacity>
            <Text style={styles.title}>Manage Categories</Text>
          </View>

          {/* Add New Category Form */}
          <View style={styles.addContainer}>
            <TextInput
              placeholder="New Category Name"
              style={styles.input}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddCategory}>
              <Ionicons name="add" size={24} color={COLORS.yellowButtonText} />
            </TouchableOpacity>
          </View>

          {/* Category List */}
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primaryYellow} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={categories}
              keyExtractor={(item) => item._id}
              ListEmptyComponent={<Text style={styles.emptyText}>No categories found.</Text>}
              renderItem={({ item }) => (
                <View style={styles.categoryRow}>
                  <Text style={styles.categoryName}>{item.name}</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                      <Ionicons name="pencil-outline" size={22} color={COLORS.textNormal} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
                      <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- Styles (No Change) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  headerContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { padding: 5 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark, marginLeft: 15 },
  addContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.lightBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: COLORS.primaryYellow,
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryName: {
    fontSize: 16,
    color: COLORS.textDark,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: COLORS.textLight,
  },
});

export default ManageCategoriesScreen;
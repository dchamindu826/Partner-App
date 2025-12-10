// src/screens/AddMenuItemScreen.js
// --- FIXED: Hides "Manage Categories" for 'Staff' ---

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, StatusBar, Image, TouchableOpacity, ActivityIndicator, Switch, TextInput as RNTextInput, Alert, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext'; // --- (1) useAuth Import ---
import { client, urlFor } from '../sanity/sanityClient';
import CustomButton from '../components/CustomButton';
import CustomTextInput from '../components/CustomTextInput';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import CustomModalPicker from '../components/CustomModalPicker';
import { Ionicons } from '@expo/vector-icons';

const AddMenuItemScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth(); // --- (2) User data gannawa ---
  const itemToEdit = route.params?.item;
  const isEditMode = !!itemToEdit;

  // --- (3) User-ta 'Edit' karanna puluwanda kiyala balamu ---
  const canEdit = user?.role === 'Owner' || user?.role === 'Manager';

  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  const [image, setImage] = useState(itemToEdit?.image || null);
  const [imageAsset, setImageAsset] = useState(null);
  const [name, setName] = useState(itemToEdit?.name || '');
  const [description, setDescription] = useState(itemToEdit?.description || '');
  const [category, setCategory] = useState(itemToEdit?.category?._id || null);
  
  const [hasVariations, setHasVariations] = useState(itemToEdit?.variations?.length > 0 || false);
  const [price, setPrice] = useState(itemToEdit?.price?.toString() || '');
  const [variations, setVariations] = useState(itemToEdit?.variations || []);
  
  const [newVarSize, setNewVarSize] = useState('');
  const [newVarPrice, setNewVarPrice] = useState('');

  // --- (Functions - No Change) ---
  const fetchCategories = async () => {
    if (user && user.restaurant) {
      const restaurantId = user.restaurant._id;
      const query = `*[_type == "foodCategory" && restaurant._ref == $restaurantId]{"value": _id, "label": title}`;
      client.fetch(query, { restaurantId }).then(setCategories);
    }
  };
  useFocusEffect(React.useCallback(() => { fetchCategories(); }, [user]));
  const pickImage = async () => {
    if (!canEdit) return; // Staff ta image change karanna ba
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setImageAsset(null);
      Toast.show({ type: 'info', text1: 'Uploading Image...' });
      try {
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const uploadedAsset = await client.assets.upload('image', blob);
        setImageAsset(uploadedAsset);
        Toast.show({ type: 'success', text1: 'Image Uploaded!' });
      } catch (err) {
        Toast.show({ type: 'error', text1: 'Image Upload Failed' });
      }
    }
  };
  const addVariation = () => {
    if (!newVarSize || !newVarPrice) {
      Toast.show({ type: 'error', text1: 'Please enter size and price' });
      return;
    }
    setVariations([
      ...variations, 
      { _key: Math.random().toString(36).substr(2, 9), size: newVarSize, price: parseFloat(newVarPrice) }
    ]);
    setNewVarSize('');
    setNewVarPrice('');
  };
  const removeVariation = (_key) => {
    setVariations(variations.filter(v => v._key !== _key));
  };
  const handleSave = async () => {
    if (!name || !category || (!price && !hasVariations) || (hasVariations && variations.length === 0)) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please fill name, category, and price/variations.' });
      return;
    }
    setIsLoading(true);
    try {
      const restaurantId = user.restaurant._id;
      let doc = {
        _type: 'menuItem',
        name,
        description,
        restaurant: { _type: 'reference', _ref: restaurantId },
        category: { _type: 'reference', _ref: category },
        price: hasVariations ? undefined : parseFloat(price),
        variations: hasVariations ? variations.map(v => ({_key: v._key, size: v.size, price: v.price})) : undefined,
      };
      if (isEditMode) {
        const patch = client.patch(itemToEdit._id).set(doc);
        if (imageAsset) {
          patch.set({ image: { _type: 'image', asset: { _type: 'reference', _ref: imageAsset._id } } });
        }
        await patch.commit();
      } else {
        if (imageAsset) {
          doc.image = { _type: 'image', asset: { _type: 'reference', _ref: imageAsset._id } };
        }
        await client.create(doc);
      }
      setIsLoading(false);
      Toast.show({ type: 'success', text1: isEditMode ? 'Item Updated!' : 'Item Added!' });
      navigation.goBack();
    } catch (err) {
      setIsLoading(false);
      console.error('Save item error:', err);
      Toast.show({ type: 'error', text1: 'Save Failed', text2: err.message });
    }
  };
  // --- (End of functions) ---

  let imageUri = 'https://placehold.co/400x400/e0e0e0/b0b0b0?text=No+Image';
  if (typeof image === 'string') {
    imageUri = image;
  } else if (image && image.asset) {
    imageUri = urlFor(image).width(400).url();
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView 
          style={styles.container}
          keyboardShouldPersistTaps="handled">
          
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="close-outline" size={30} color={COLORS.textDark} />
            </TouchableOpacity>
            <Text style={styles.title}>{isEditMode ? 'Edit Item' : 'Add New Item'}</Text>
          </View>

          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={!canEdit}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            {canEdit && (
              <View style={styles.imageOverlay}>
                <Ionicons name="camera-outline" size={24} color={COLORS.white} />
                <Text style={styles.imageOverlayText}>Change Image</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* --- (4) 'Staff' kenek nam, inputs disable karanawa --- */}
          <CustomTextInput iconName="fast-food-outline" placeholder="Item Name" value={name} onChangeText={setName} editable={canEdit} />
          
          <RNTextInput 
            style={[styles.descriptionInput, !canEdit && styles.disabledInput]} 
            placeholder="Description (Optional)" 
            placeholderTextColor={COLORS.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            editable={canEdit}
          />

          <Text style={styles.label}>Category</Text>
          <View style={!canEdit && styles.disabledInput}>
            <CustomModalPicker
              placeholder="Select a category..."
              items={categories}
              selectedValue={category}
              onValueChange={setCategory}
              disabled={!canEdit} // Picker eka disable karanawa
            />
          </View>
          
          {/* --- (5) 'Staff' kenek nam, 'Manage' button eka pennanne na --- */}
          {canEdit && (
            <TouchableOpacity onPress={() => navigation.navigate('ManageCategoriesScreen')}>
              <Text style={styles.manageCategoryText}>+ Manage Categories</Text>
            </TouchableOpacity>
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Item has variations (Small, Large)?</Text>
            <Switch
              trackColor={{ false: COLORS.border, true: COLORS.primaryYellow }}
              thumbColor={COLORS.white}
              onValueChange={setHasVariations}
              value={hasVariations}
              disabled={!canEdit} // Switch eka disable karanawa
            />
          </View>

          {hasVariations ? (
            <View style={styles.variationSection}>
              <Text style={styles.sectionTitle}>Variations</Text>
              {variations.map((v, index) => (
                <View key={v._key || `var-${index}`} style={styles.variationRow}>
                  <Text style={styles.varText}>{v.size}</Text>
                  <Text style={styles.varText}>LKR {v.price}</Text>
                  {canEdit && (
                    <TouchableOpacity onPress={() => removeVariation(v._key || `var-${index}`)}>
                      <Ionicons name="trash-bin-outline" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              
              {canEdit && (
                <View style={styles.addVariationContainer}>
                  <RNTextInput placeholder="Size (e.g. Small)" style={styles.varInput} value={newVarSize} onChangeText={setNewVarSize} />
                  <RNTextInput placeholder="Price (LKR)" style={styles.varInput} value={newVarPrice} onChangeText={setNewVarPrice} keyboardType="numeric" />
                  <TouchableOpacity style={styles.addVarButton} onPress={addVariation}>
                    <Ionicons name="add" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View>
              <Text style={styles.label}>Price</Text>
              <CustomTextInput iconName="cash-outline" placeholder="Price (LKR)" value={price} onChangeText={setPrice} keyboardType="numeric" editable={canEdit} />
            </View>
          )}
          
          {/* --- (6) 'Staff' kenek nam, 'Save' button eka pennanne na --- */}
          {canEdit && (
            <View style={styles.buttonSection}>
              <CustomButton 
                title={isLoading ? 'Saving...' : (isEditMode ? 'Update Item' : 'Add Item')} 
                onPress={handleSave} 
                disabled={isLoading} 
              />
              {isLoading && <ActivityIndicator size="large" color={COLORS.primaryYellow} />}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Styles...
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { padding: 5 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark, marginLeft: 15 },
  imagePicker: { width: '100%', height: 200, borderRadius: 10, backgroundColor: COLORS.border, marginBottom: 20, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 200, borderRadius: 10 },
  imageOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10 },
  imageOverlayText: { color: COLORS.white, fontWeight: 'bold', marginTop: 5 },
  label: { fontSize: 14, color: COLORS.textLight, marginBottom: 5, marginLeft: 5, marginTop: 10 },
  descriptionInput: {
    backgroundColor: COLORS.lightBackground, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 15,
    fontSize: 16, color: COLORS.textDark, height: 100, textAlignVertical: 'top', marginVertical: 10,
  },
  manageCategoryText: {
    color: COLORS.primaryYellow,
    textAlign: 'right',
    marginTop: 8,
    marginRight: 5,
    fontWeight: '600',
    marginBottom: 10,
  },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 15, paddingHorizontal: 5 },
  switchLabel: { fontSize: 16, color: COLORS.textNormal, flex: 1 },
  variationSection: { marginVertical: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 10 },
  variationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, padding: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  varText: { fontSize: 16, color: COLORS.textNormal },
  addVariationContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  varInput: { backgroundColor: COLORS.lightBackground, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, flex: 1, marginRight: 10, fontSize: 16 },
  addVarButton: { backgroundColor: COLORS.primaryYellow, padding: 10, borderRadius: 8 },
  buttonSection: { marginTop: 20, marginBottom: 40 },
  disabledInput: { // 'Staff' ta disable pennanna style eka
    opacity: 0.6, 
    backgroundColor: COLORS.border
  }
});

export default AddMenuItemScreen;
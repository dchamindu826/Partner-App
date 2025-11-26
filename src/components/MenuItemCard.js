// src/components/MenuItemCard.js
// --- FIXED: Hides Edit/Delete icons if 'onEdit' is null ---

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import { urlFor } from '../sanity/sanityClient';
import { Ionicons } from '@expo/vector-icons';

const placeholderImage = 'https://placehold.co/200x200/e0e0e0/b0b0b0?text=No+Image';

const MenuItemCard = ({ item, onEdit, onDelete }) => {
  
  const imageUrl = item.image 
    ? urlFor(item.image).width(200).url() 
    : placeholderImage;
  
  let priceDisplay;
  if (item.variations && item.variations.length > 0) {
    const minPrice = Math.min(...item.variations.map(v => v.price));
    priceDisplay = `Starts at LKR ${minPrice}`;
  } else {
    priceDisplay = `LKR ${item.price}`;
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
      />
      <View style={styles.detailsContainer}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.price}>{priceDisplay}</Text>
      </View>
      
      {/* --- (1) FIX: 'onEdit' null nam, me view eka pennanne na --- */}
      {onEdit && onDelete && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
            <Ionicons name="pencil-outline" size={20} color={COLORS.textNormal} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// --- Styles (No Change) ---
const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    flexDirection: 'row',
    padding: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  description: {
    fontSize: 12,
    color: COLORS.textLight,
    marginVertical: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  actionsContainer: {
    justifyContent: 'space-between',
    paddingLeft: 10,
  },
  actionButton: {
    padding: 5,
  },
});

export default MenuItemCard;
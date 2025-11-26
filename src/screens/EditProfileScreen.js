import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Platform, 
  StatusBar, Image, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { client, urlFor } from '../sanity/sanityClient';
import CustomButton from '../components/CustomButton';
import CustomTextInput from '../components/CustomTextInput';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState(null);
  const [imageAsset, setImageAsset] = useState(null);

  // Fetch Data
  useEffect(() => {
    if (user && user.restaurant) {
      const restId = user.restaurant._ref;
      setRestaurantId(restId);
      const query = `*[_type == "restaurant" && _id == $restId][0]{ name, phone, logo }`;
      
      client.fetch(query, { restId }).then(data => {
        if (data) {
          setName(data.name || '');
          setPhone(data.phone || '');
          setImage(data.logo || null);
        }
        setIsLoading(false);
      }).catch(err => {
        console.error("Fetch profile error:", err);
        setIsLoading(false);
        Toast.show({ type: 'error', text1: 'Error fetching profile' });
      });
    }
  }, [user]);

  // Image Picker
  const pickImage = async () => {
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

  // Save Data
  const handleSave = async () => {
    if (!name || !phone) {
      Toast.show({ type: 'error', text1: 'Missing Fields' });
      return;
    }
    setIsLoading(true);

    try {
      const patch = client.patch(restaurantId).set({
        name: name,
        phone: phone,
      });

      if (imageAsset) {
        patch.set({
          logo: {
            _type: 'image',
            asset: { _type: 'reference', _ref: imageAsset._id }
          }
        });
      }

      await patch.commit();

      setIsLoading(false);
      Toast.show({ type: 'success', text1: 'Profile Updated!' });
      navigation.goBack();

    } catch (err) {
      setIsLoading(false);
      console.error('Save profile error:', err);
      Toast.show({ type: 'error', text1: 'Update Failed', text2: err.message });
    }
  };

  let imageUri = 'https://placehold.co/400x400/e0e0e0/b0b0b0?text=No+Image';
  if (typeof image === 'string') {
    imageUri = image;
  } else if (image && image.asset) {
    imageUri = urlFor(image).width(400).url();
  }

  if (isLoading && !restaurantId) {
    return (
      <SafeAreaView style={[styles.safeArea, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={COLORS.primaryYellow} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="close-outline" size={30} color={COLORS.textTitle} />
            </TouchableOpacity>
            <Text style={styles.title}>Edit Profile</Text>
          </View>

          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            <View style={styles.imageOverlay}>
              <Ionicons name="camera-outline" size={24} color={COLORS.white} />
              <Text style={styles.imageOverlayText}>Change Logo</Text>
            </View>
          </TouchableOpacity>

          <CustomTextInput 
            iconName="restaurant-outline" 
            placeholder="Restaurant Name" 
            value={name} 
            onChangeText={setName} 
          />
          <CustomTextInput 
            iconName="call-outline" 
            placeholder="Phone Number" 
            value={phone} 
            onChangeText={setPhone} 
            keyboardType="phone-pad"
          />
          <CustomTextInput 
            iconName="mail-outline" 
            placeholder="Email (Cannot be changed)" 
            value={user.email}
            editable={false} 
          />
          
          <View style={styles.buttonSection}>
            <CustomButton 
              title={isLoading ? 'Saving...' : 'Save Changes'} 
              onPress={handleSave} 
              disabled={isLoading} 
            />
            {isLoading && <ActivityIndicator size="large" color={COLORS.primaryYellow} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { padding: 5 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.textTitle, marginLeft: 15 },
  imagePicker: { width: 150, height: 150, borderRadius: 75, backgroundColor: COLORS.border, marginBottom: 30, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  image: { width: 150, height: 150, borderRadius: 75 },
  imageOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 75 },
  imageOverlayText: { color: COLORS.white, fontWeight: 'bold', marginTop: 5 },
  buttonSection: { marginTop: 30, marginBottom: 40 },
});

export default EditProfileScreen;
// src/screens/ImageGenerationScreen.js
import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Keyboard,
  Image,
  Modal,
  Dimensions, // Import Dimensions to get screen width
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { SettingsContext } from '../contexts/SettingsContext';
import { generateImage, improvePrompt } from '../agents/aiImageAgent';

// --- NEW: Get screen width for the gallery pages ---
const { width: screenWidth } = Dimensions.get('window');

const PROMPT_MAX_LENGTH = 500;
const DEFAULT_NUM_IMAGES = 4;
const NUM_IMAGE_OPTIONS = [1, 2, 3, 4];

// --- UPDATED: Default model set as requested ---
const DEFAULT_MODEL_NAME = 'gemma-3-4b-it'; 

const ASPECT_RATIOS = [{ label: '1:1', value: '1:1', disabled: false }];
const STYLES = [{ name: 'None', value: '' }, { name: 'Oil Painting', value: 'oil_painting' }];

// ManagedImage component for individual image loading
const ManagedImage = (props) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  return (
    <View style={styles.imageContainer}>
      <Image {...props} style={styles.fillImage} onLoadEnd={() => setIsImageLoading(false)} />
      {isImageLoading && (
        <View style={styles.imageOverlay}><ActivityIndicator size="large" color="#FFFFFF" /></View>
      )}
    </View>
  );
};

// Helper function to determine dynamic image styles in the grid
const getImageStyle = (index, total) => {
  const style = { marginBottom: 12 };
  if (total === 1) return { ...style, width: '100%', aspectRatio: 16 / 9 };
  if (total === 3 && index === 0) return { ...style, width: '100%', aspectRatio: 16 / 9 };
  return { ...style, width: '48.5%', aspectRatio: 1 };
};


// --- Swipeable Image Gallery Modal Component ---
const ImageGalleryModal = ({ visible, images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (visible && scrollViewRef.current) {
        setCurrentIndex(initialIndex);
        scrollViewRef.current.scrollTo({ x: screenWidth * initialIndex, animated: false });
    }
  }, [visible, initialIndex]);

  const handleDownloadImage = async () => {
    const imageUrlToDownload = images[currentIndex];
    if (!imageUrlToDownload) return;

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission Required', text2: 'Please grant access to save photos.' }); return;
    }
    try {
      Toast.show({ type: 'info', text1: 'Downloading...' });
      const fileUri = FileSystem.documentDirectory + `${Date.now()}.jpg`;
      const { uri } = await FileSystem.downloadAsync(imageUrlToDownload, fileUri);
      await MediaLibrary.createAssetAsync(uri);
      Toast.show({ type: 'success', text1: 'Saved!', text2: 'Image saved to your photo library.' });
    } catch (error) {
      console.error("Download Error:", error);
      Toast.show({ type: 'error', text1: 'Download Failed' });
    }
  };

  const handleMomentumScrollEnd = (event) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setCurrentIndex(newIndex);
  };
  
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          contentContainerStyle={{ alignItems: 'center' }}
        >
          {images.map((uri, index) => (
            <View key={index} style={styles.modalPage}>
              <Image source={{ uri }} style={styles.modalImage} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity style={[styles.modalButton, styles.closeButton]} onPress={onClose}>
            <Ionicons name="close" size={32} color="#FFFFFF" />
        </TouchableOpacity>
        {images.length > 1 && (
            <View style={styles.pageIndicator}>
                <Text style={styles.pageIndicatorText}>{currentIndex + 1} / {images.length}</Text>
            </View>
        )}
        <TouchableOpacity style={[styles.modalButton, styles.downloadButton]} onPress={handleDownloadImage}>
            <Ionicons name="download-outline" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default function ImageGenerationScreen({ navigation }) {
  const { apiKey, modelName: settingsModelName } = useContext(SettingsContext);
  const [prompt, setPrompt] = useState('');
  const [numImages, setNumImages] = useState(DEFAULT_NUM_IMAGES);
  const [loading, setLoading] = useState(false);
  const [improvingPrompt, setImprovingPrompt] = useState(false);
  const [generatedImageUrls, setGeneratedImageUrls] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [initialImageIndex, setInitialImageIndex] = useState(0);

  const promptRef = useRef(null);
  const currentModelName = settingsModelName || DEFAULT_MODEL_NAME;
  const anyLoading = loading || improvingPrompt;

  const handleGenerate = async () => {
    Keyboard.dismiss();
    if (!apiKey) { return Toast.show({ type: 'error', text1: 'API Key Missing', text2: 'Please set your API key in Settings.' }); }
    if (!currentModelName) { return Toast.show({ type: 'error', text1: 'Model Name Missing', text2: `Please configure a model in Settings.` }); }
    if (!prompt.trim()) { return Toast.show({ type: 'error', text1: 'Empty Prompt', text2: 'Please describe the image to generate.' }); }

    setLoading(true);
    setGeneratedImageUrls([]);

    try {
      const response = await generateImage(apiKey, currentModelName, prompt.trim(), numImages);
      if (response.success && response.imageUrls?.length > 0) {
        setGeneratedImageUrls(response.imageUrls);
        Toast.show({ type: 'success', text1: 'Success!', text2: `Generated ${response.imageUrls.length} new images.` });
      } else {
        Toast.show({ type: 'error', text1: 'Generation Failed', text2: response.reason || 'An unknown error occurred.' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleImprovePrompt = async () => {
    Keyboard.dismiss();
    if (!apiKey || !currentModelName || !prompt.trim()) {
      Toast.show({ type: 'error', text1: 'Missing Information', text2: 'Please provide a prompt and ensure API key/model are set.' });
      return;
    }
    setImprovingPrompt(true);
    setGeneratedImageUrls([]);
    try {
      const response = await improvePrompt(apiKey, currentModelName, prompt.trim());
      if (response.success && response.prompt) {
        setPrompt(response.prompt);
        Toast.show({ type: 'success', text1: 'Prompt Improved', text2: 'Your prompt has been enhanced.' });
      } else {
        Toast.show({ type: 'error', text1: 'Improvement Failed', text2: response.reason || 'Failed to improve prompt.' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: `Error improving prompt: ${err.message}` });
    } finally {
      setImprovingPrompt(false);
    }
  };

  const openGallery = (index) => {
    setInitialImageIndex(index);
    setIsModalVisible(true);
  };
  
  const renderOptionButtons = (options, activeValue, setActive) =>
    options.map((opt) => (
      <TouchableOpacity key={opt.value ?? opt} disabled={anyLoading || opt.disabled} onPress={() => setActive(opt.value ?? opt)} style={[styles.optionBtn, activeValue === (opt.value ?? opt) && styles.optionBtnActive, opt.disabled && styles.optionBtnDisabled]}>
        <Text style={[styles.optionText, activeValue === (opt.value ?? opt) && styles.optionTextActive]}>{opt.label || opt.name || opt}</Text>
      </TouchableOpacity>
    ));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={styles.container.backgroundColor} />
      
      <ImageGalleryModal
        visible={isModalVisible}
        images={generatedImageUrls}
        initialIndex={initialImageIndex}
        onClose={() => setIsModalVisible(false)}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={navigation.openDrawer}><Ionicons name="menu-outline" size={28} color="#475569" /></TouchableOpacity>
        <Text style={styles.title}>Generate Image</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}><Ionicons name="settings-outline" size={24} color="#475569" /></TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>Describe your image</Text>
            <View style={styles.inputWrapper}>
              <TextInput ref={promptRef} style={styles.input} placeholder="A futuristic city skyline at sunset, cinematic..." placeholderTextColor="#9CA3AF" multiline value={prompt} onChangeText={setPrompt} editable={!anyLoading} />
              {prompt.trim().length > 0 && <TouchableOpacity style={styles.improveBtn} onPress={handleImprovePrompt} disabled={anyLoading || !prompt.trim()}>{improvingPrompt ? <ActivityIndicator size="small" color="#4F46E5" /> : <Ionicons name="sparkles-outline" size={20} color="#4F46E5" />}</TouchableOpacity>}
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Number of Images</Text>
            <View style={styles.optionRow}>{renderOptionButtons(NUM_IMAGE_OPTIONS, numImages, setNumImages)}</View>
          </View>

          {loading || generatedImageUrls.length > 0 ? (
            <View style={styles.previewCard}>
              <Text style={styles.label}>{loading ? `Generating ${numImages} Images...` : 'Generated Images'}</Text>
              <View style={styles.imageGrid}>
                {loading ? (
                  Array(numImages).fill(0).map((_, index) => <View key={index} style={[styles.imageWrapper, getImageStyle(index, numImages)]} />)
                ) : (
                  generatedImageUrls.map((url, index) => (
                    <TouchableOpacity key={index} activeOpacity={0.8} style={[styles.imageWrapper, getImageStyle(index, generatedImageUrls.length)]} onPress={() => openGallery(index)}>
                      <ManagedImage source={{ uri: url }} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.generateBtn, (!prompt.trim() || anyLoading) && styles.generateBtnDisabled]} onPress={handleGenerate} disabled={!prompt.trim() || anyLoading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.generateText}>Generate</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between', backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  title: { fontSize: 20, fontWeight: '600', color: '#1E293B' },
  scroll: { padding: 16, paddingBottom: 120 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  label: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  inputWrapper: { position: 'relative' },
  input: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 12, minHeight: 120, textAlignVertical: 'top', color: '#1E293B', fontSize: 15, paddingRight: 40, paddingBottom: 30 },
  improveBtn: { position: 'absolute', bottom: 8, right: 8, backgroundColor: '#E0E7FF', borderRadius: 20, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap' },
  optionBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', marginRight: 8, marginBottom: 8 },
  optionBtnActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  optionBtnDisabled: { opacity: 0.5 },
  optionText: { fontSize: 14, color: '#334155' },
  optionTextActive: { color: '#FFFFFF', fontWeight: '600' },
  previewCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  imageWrapper: { backgroundColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' },
  imageContainer: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  fillImage: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)'},
  modalPage: { width: screenWidth, height: '100%', justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: '100%', height: '80%' },
  modalButton: { position: 'absolute', backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 30, padding: 8, zIndex: 10 },
  closeButton: { top: Platform.OS === 'android' ? 40 : 60, right: 20 },
  downloadButton: { bottom: Platform.OS === 'android' ? 40 : 60, alignSelf: 'center' },
  pageIndicator: { position: 'absolute', top: Platform.OS === 'android' ? 45 : 65, alignSelf: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 12, },
  pageIndicatorText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#E2E8F0' },
  generateBtn: { backgroundColor: '#4F46E5', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  generateBtnDisabled: { backgroundColor: '#A5B4FC', elevation: 0 },
  generateText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
});
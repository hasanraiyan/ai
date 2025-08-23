// src/screens/ImageGenerationScreen.js

import React, { useState, useContext, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
    StatusBar,
    Keyboard,
    KeyboardAvoidingView, // Added
    UIManager,
    Image as RNImage,
    Modal,
    Dimensions,
    Alert,
    useColorScheme,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { SettingsContext } from '../contexts/SettingsContext';
import { generateImage } from '../agents/aiImageAgent';
import { imageCategories } from '../constants/imageCategories';
import { models } from '../constants/models';
import { useTheme, spacing, typography } from '../utils/theme';
import ScreenHeader from '../components/ScreenHeader';
import ToggleSwitch from '../components/ToggleSwitch';
import Composer from '../components/Composer';

const { width: screenWidth } = Dimensions.get('window');
const MAX_IMAGES = 6;
const DEFAULT_NUM_IMAGES = 2;
const DEFAULT_MODEL_NAME = 'gemma-3-27b-it';

// --- FIX: Use a reliable height for the iOS keyboard offset. ---
const HEADER_HEIGHT = Platform.OS === 'ios' ? 60 : 0;

const aspectRatioOptions = [ { key: '1:1', label: 'Square', icon: 'square-outline' }, { key: '16:9', label: 'Landscape', icon: 'tablet-landscape-outline' }, { key: '9:16', label: 'Portrait', icon: 'tablet-portrait-outline' } ];
const imageModelOptions = [ { key: 'flux', label: 'Flux Pro', icon: 'flash-outline' }, { key: 'turbo', label: 'Turbo', icon: 'rocket-outline' } ];
const numImagesOptions = Array.from({ length: MAX_IMAGES }, (_, i) => i + 1).map(num => ({ key: num, label: `${num}` }));

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Reusable Components (Unchanged) ---

const DashboardSection = React.memo(({ title, children, icon }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          {icon && (
            <View style={[styles.sectionIconContainer, { backgroundColor: colors.accent + '1A' }]}>
              <Ionicons name={icon} size={20} color={colors.accent} />
            </View>
          )}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>
      </View>
      {children}
    </View>
  );
});

const StyleCategoryCard = ({ category, isSelected, onPress, disabled }) => {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            style={[ styles.categoryCard, { borderColor: isSelected ? colors.accent : 'transparent' }, disabled && styles.categoryCardDisabled ]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.8}
        >
            <RNImage source={{ uri: category.imageUrl }} style={styles.categoryImage} />
            <View style={styles.categoryOverlay}>
                <Text style={styles.categoryText}>{category.name}</Text>
                {isSelected && (
                    <View style={styles.categorySelectedBadge}>
                        <Ionicons name="checkmark" size={12} color={colors.accent} />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const ImageGalleryModal = ({ visible, images, initialIndex, onClose }) => {
    const [current, setCurrent] = useState(initialIndex);
    const [downloading, setDownloading] = useState(false);
    const scrollRef = useRef(null);
    const { colors } = useTheme();

    useEffect(() => {
        if (visible) {
            setCurrent(initialIndex);
            setTimeout(() => scrollRef.current?.scrollTo({ x: screenWidth * initialIndex, animated: false }), 50);
        }
    }, [visible, initialIndex]);

    const handleDownload = async () => {
        const url = images[current];
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Required', 'Please grant media library permissions to save images.'); return; }
        setDownloading(true);
        try {
            const fileUri = `${FileSystem.documentDirectory}ai_image_${Date.now()}.jpg`;
            const { uri } = await FileSystem.downloadAsync(url, fileUri);
            await MediaLibrary.createAssetAsync(uri);
            Alert.alert('Success!', 'Image saved to your gallery.');
        } catch (err) {
            brainLogger.error(LogCategory.BRAIN, 'Image download failed', {
                error: err.message
            }); 
            Alert.alert('Error', 'Failed to save image.');
        } finally {
            setDownloading(false);
        }
    };

    const handleShare = async () => {
        try { await Sharing.shareAsync(images[current]); } catch (error) { Alert.alert('Error', 'Could not share the image.'); }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <TouchableOpacity style={[styles.modalButton, styles.closeButton]} onPress={onClose}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
                <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={e => setCurrent(Math.round(e.nativeEvent.contentOffset.x / screenWidth))}>
                    {images.map((uri, idx) => <View key={idx} style={styles.modalPage}><RNImage source={{ uri }} style={styles.modalImage} resizeMode="contain" /></View>)}
                </ScrollView>
                <View style={styles.toolbar}>
                    {images.length > 1 && <View style={styles.pageIndicator}><Text style={styles.pageIndicatorText}>{current + 1} / {images.length}</Text></View>}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity style={styles.actionButton} onPress={handleShare}><Ionicons name="share-social-outline" size={24} color="#fff" /><Text style={styles.actionText}>Share</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, downloading && styles.disabled]} onPress={handleDownload} disabled={downloading}>
                            {downloading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="download-outline" size={24} color="#fff" />}
                            <Text style={styles.actionText}>{downloading ? 'Saving...' : 'Save'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default function ImageGenerationScreen({ navigation }) {
    const { colors } = useTheme();
    const scheme = useColorScheme();

    const { apiKey, agentModelName: settingsModel } = useContext(SettingsContext);
    const [prompt, setPrompt] = useState('');
    const [numImages, setNumImages] = useState(DEFAULT_NUM_IMAGES);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [selectedCategory, setSelectedCategory] = useState(imageCategories[0]);
    const [imageModel, setImageModel] = useState('flux');
    const [loading, setLoading] = useState(false);
    const [urls, setUrls] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [startIndex, setStartIndex] = useState(0);

    const anyLoading = loading;
    const modelToUse = settingsModel || DEFAULT_MODEL_NAME;

    const openModal = (idx = 0) => {
        setStartIndex(idx);
        setModalVisible(true);
    };

    const handleGenerate = async () => {
        Keyboard.dismiss();
        if (!prompt.trim()) { Alert.alert('Empty Prompt', 'Please describe the image you want to generate.'); return; }
        if (!apiKey) { Alert.alert('API Key Required', 'Please set your API Key in Settings.', [{ text: 'Go to Settings', onPress: () => navigation.navigate('Settings') }, { text: 'Cancel' }]); return; }
        const selectedModelData = models.find(m => m.id === modelToUse);
        if (!selectedModelData?.supported_tools.includes('image_generator')) { Alert.alert("Incompatible Model", `The selected Agent Model (${selectedModelData?.name || modelToUse}) does not support image generation.`, [{ text: "OK" }]); return; }

        setLoading(true);

        const finalPrompt = selectedCategory.id !== 'none' ? `Image Description: ${prompt.trim()}. Style Description: ${selectedCategory.description}` : prompt.trim();
        const getDimensions = ratio => ({ '16:9': { width: 768, height: 432 }, '9:16': { width: 432, height: 768 } }[ratio] || { width: 512, height: 512 });
        const { width, height } = getDimensions(aspectRatio);
        const metadataPayload = { prompt: prompt.trim(), styleId: selectedCategory.id, styleName: selectedCategory.name, modelUsed: modelToUse, imageGenModel: imageModel, batchSize: numImages, aspectRatio, width, height };

        try {
            const res = await generateImage(apiKey, modelToUse, finalPrompt, numImages, metadataPayload);
            if (res.success && res.imageUrls?.length) {
                setUrls(res.imageUrls);
                openModal(0);
            } else {
                Alert.alert('Generation Failed', res.reason || 'An unknown error occurred.');
            }
        } catch (err) { Alert.alert('Error', err.message || 'An error occurred.'); }
        finally { setLoading(false); }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
            <ImageGalleryModal visible={modalVisible} images={urls} initialIndex={startIndex} onClose={() => setModalVisible(false)} />
            <ScreenHeader title="Image Studio" navigation={navigation} subtitle="Craft your vision with Axion" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={HEADER_HEIGHT} // Use defined HEADER_HEIGHT
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <DashboardSection title="Choose a Style" icon="color-palette-outline">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalListContainer}>
                            {imageCategories.map(category =>
                                <StyleCategoryCard
                                    key={category.id}
                                    category={category}
                                    isSelected={selectedCategory.id === category.id}
                                    onPress={() => setSelectedCategory(category)}
                                    disabled={anyLoading}
                                />
                            )}
                        </ScrollView>
                    </DashboardSection>

                    <DashboardSection title="Generation Settings" icon="options-outline">
                        <View style={styles.verticalListContainer}>
                            <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.settingsLabel, { color: colors.text }]}>Image Generation Model</Text>
                                <ToggleSwitch options={imageModelOptions} selected={imageModel} onSelect={setImageModel} disabled={anyLoading} containerStyle={{ marginTop: spacing.sm }} />
                            </View>
                            <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.settingsLabel, { color: colors.text }]}>Aspect Ratio</Text>
                                <ToggleSwitch options={aspectRatioOptions} selected={aspectRatio} onSelect={setAspectRatio} disabled={anyLoading} containerStyle={{ marginTop: spacing.sm }} />
                            </View>
                            <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 0 }]}>
                                <Text style={[styles.settingsLabel, { color: colors.text }]}>Number of Images</Text>
                                <ToggleSwitch options={numImagesOptions} selected={numImages} onSelect={setNumImages} disabled={anyLoading} containerStyle={{ marginTop: spacing.sm }} size="small" />
                            </View>
                        </View>
                    </DashboardSection>
                </ScrollView>
                <Composer
                    value={prompt}
                    onValueChange={setPrompt}
                    onSend={handleGenerate}
                    loading={anyLoading}
                    placeholder="A majestic dragon soaring through clouds..."
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: { paddingTop: spacing.md, paddingBottom: spacing.lg },
    sectionContainer: { marginBottom: spacing.xl, },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.md },
    sectionTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    sectionIconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { ...typography.h2, fontWeight: '700' },
    horizontalListContainer: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.sm },
    verticalListContainer: { marginHorizontal: spacing.md, gap: spacing.md },
    categoryCard: { width: 120, height: 150, borderRadius: 12, borderWidth: 2, overflow: 'hidden' },
    categoryCardDisabled: { opacity: 0.5 },
    categoryImage: { width: '100%', height: '100%' },
    categoryOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: spacing.sm, backgroundColor: 'rgba(0,0,0,0.3)' },
    categoryText: { color: '#fff', fontSize: typography.small, fontWeight: '700' },
    categorySelectedBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
    settingsCard: { borderRadius: 16, padding: spacing.md, borderWidth: 1, },
    settingsLabel: { ...typography.body, fontWeight: '600' },
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' },
    modalPage: { width: screenWidth, height: '100%', justifyContent: 'center', alignItems: 'center' },
    modalImage: { width: '100%', height: '80%' },
    modalButton: { position: 'absolute', padding: spacing.sm, zIndex: 10 },
    closeButton: { top: Platform.OS === 'android' ? spacing.xl : 60, right: spacing.md, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
    toolbar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: Platform.OS === 'android' ? spacing.lg : 40, paddingTop: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: 'rgba(0,0,0,0.3)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
    pageIndicator: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, },
    pageIndicatorText: { color: '#fff', fontSize: typography.small, fontWeight: 'bold' },
    actionsContainer: { flexDirection: 'row', alignItems: 'center' },
    actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12, marginLeft: spacing.sm, },
    actionText: { color: '#fff', marginLeft: spacing.xs, fontWeight: '600' },
    disabled: { opacity: 0.5 },
});
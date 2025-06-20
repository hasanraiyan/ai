// src/screens/ImageGenerationScreen.js
// FINAL VERSION: Implements the direct-to-modal UX for generated images.

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
    Animated,
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

const { width: screenWidth } = Dimensions.get('window');
const MAX_IMAGES = 6;
const DEFAULT_NUM_IMAGES = 2;
const DEFAULT_MODEL_NAME = 'gemma-3-27b-it';

const aspectRatioOptions = [ { key: '1:1', label: 'Square', icon: 'square-outline' }, { key: '16:9', label: 'Landscape', icon: 'tablet-landscape-outline' }, { key: '9:16', label: 'Portrait', icon: 'tablet-portrait-outline' } ];
const imageModelOptions = [ { key: 'flux', label: 'Flux Pro', icon: 'flash-outline' }, { key: 'turbo', label: 'Turbo', icon: 'rocket-outline' } ];
const numImagesOptions = Array.from({ length: MAX_IMAGES }, (_, i) => i + 1).map(num => ({ key: num, label: `${num}` }));

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const StyleCategoryCard = ({ category, isSelected, onPress, disabled }) => {
    const theme = useTheme(); const styles = getStyles(theme);
    return <TouchableOpacity style={[styles.categoryCard, isSelected && styles.categoryCardSelected, disabled && styles.categoryCardDisabled]} onPress={onPress} disabled={disabled} activeOpacity={0.8}><RNImage source={{ uri: category.imageUrl }} style={styles.categoryImage} /><View style={styles.categoryOverlay}><Text style={styles.categoryText}>{category.name}</Text>{isSelected && <View style={styles.categorySelectedBadge}><Ionicons name="checkmark" size={12} color={theme.colors.accent} /></View>}</View></TouchableOpacity>;
};

const ImageGalleryModal = ({ visible, images, initialIndex, onClose }) => {
    const [current, setCurrent] = useState(initialIndex);
    const [downloading, setDownloading] = useState(false);
    const scrollRef = useRef(null);
    const theme = useTheme();
    const styles = getStyles(theme);

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
            console.error('Download failed:', err); Alert.alert('Error', 'Failed to save image.');
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
    const theme = useTheme();
    const styles = getStyles(theme);
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
        
        const finalPrompt = selectedCategory.id !== 'none' ? `${prompt.trim()}. Style: ${selectedCategory.description}` : prompt.trim();
        const getDimensions = ratio => ({ '16:9': { width: 768, height: 432 }, '9:16': { width: 432, height: 768 } }[ratio] || { width: 512, height: 512 });
        const { width, height } = getDimensions(aspectRatio);
        const metadataPayload = { prompt: prompt.trim(), styleId: selectedCategory.id, styleName: selectedCategory.name, modelUsed: modelToUse, imageGenModel: imageModel, batchSize: numImages, aspectRatio, width, height };
        
        try {
            const res = await generateImage(apiKey, modelToUse, finalPrompt, numImages, metadataPayload);
            // *** THE KEY CHANGE IS HERE ***
            if (res.success && res.imageUrls?.length) {
                setUrls(res.imageUrls); // Store the URLs
                openModal(0); // Immediately open the modal to show the results
            } else {
                Alert.alert('Generation Failed', res.reason || 'An unknown error occurred.');
            }
        } catch (err) { Alert.alert('Error', err.message || 'An error occurred.'); }
        finally { setLoading(false); }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
            <ImageGalleryModal visible={modalVisible} images={urls} initialIndex={startIndex} onClose={() => setModalVisible(false)} />
            <ScreenHeader title="Image Studio" navigation={navigation} subtitle="Craft your vision with AI" />
            
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flexContainer}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}><Ionicons name="color-palette-outline" size={20} color={theme.colors.accent} /><Text style={styles.sectionTitle}>Choose a Style</Text></View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                            {imageCategories.map(category => <StyleCategoryCard key={category.id} category={category} isSelected={selectedCategory.id === category.id} onPress={() => setSelectedCategory(category)} disabled={anyLoading} />)}
                        </ScrollView>
                    </View>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}><Ionicons name="options-outline" size={20} color={theme.colors.accent} /><Text style={styles.sectionTitle}>Generation Settings</Text></View>
                        <View style={styles.card}><Text style={styles.label}>Image Generation Model</Text><ToggleSwitch options={imageModelOptions} selected={imageModel} onSelect={setImageModel} disabled={anyLoading} containerStyle={{ marginTop: spacing.sm }} /></View>
                        <View style={styles.card}><Text style={styles.label}>Aspect Ratio</Text><ToggleSwitch options={aspectRatioOptions} selected={aspectRatio} onSelect={setAspectRatio} disabled={anyLoading} containerStyle={{ marginTop: spacing.sm }} /></View>
                        <View style={styles.card}><Text style={styles.label}>Number of Images</Text><ToggleSwitch options={numImagesOptions} selected={numImages} onSelect={setNumImages} disabled={anyLoading} containerStyle={{ marginTop: spacing.sm }} size="small" /></View>
                    </View>
                    
                    {/* *** THE PREVIEW CARD IS NO LONGER RENDERED HERE *** */}
                    
                </ScrollView>
                <View style={styles.composerContainer}>
                     <View style={styles.inputContainer}>
                        <TextInput style={styles.promptInput} placeholder="A majestic dragon soaring through clouds..." placeholderTextColor={theme.colors.subtext} multiline value={prompt} onChangeText={setPrompt} editable={!anyLoading} />
                        <TouchableOpacity style={[styles.generateBtn, (!prompt.trim() || anyLoading) && styles.generateBtnDisabled]} onPress={handleGenerate} disabled={!prompt.trim() || anyLoading}>
                            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="arrow-up" size={20} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    flexContainer: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg, flexGrow: 1 },
    section: { marginBottom: spacing.lg },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    sectionTitle: { fontSize: typography.h2, fontWeight: '700', color: theme.colors.text, marginLeft: spacing.sm },
    card: { backgroundColor: theme.colors.card, borderRadius: 12, padding: spacing.md, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
    label: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: spacing.sm },
    categoryScroll: { paddingBottom: spacing.sm },
    categoryCard: { width: 120, height: 150, borderRadius: 12, marginRight: spacing.sm, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
    categoryCardSelected: { borderColor: theme.colors.accent },
    categoryCardDisabled: { opacity: 0.5 },
    categoryImage: { width: '100%', height: '100%' },
    categoryOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: spacing.sm, backgroundColor: 'rgba(0,0,0,0.3)' },
    categoryText: { color: '#fff', fontSize: typography.small, fontWeight: '700' },
    categorySelectedBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
    composerContainer: { padding: spacing.md, backgroundColor: theme.colors.background, borderTopWidth: 1, borderColor: theme.colors.border },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: theme.colors.card, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border, paddingLeft: spacing.md, paddingRight: spacing.xs, paddingVertical: spacing.xs },
    promptInput: { flex: 1, fontSize: typography.body, color: theme.colors.text, minHeight: 40, maxHeight: 120, paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0 },
    generateBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.sm },
    generateBtnDisabled: { backgroundColor: theme.colors.subtext, opacity: 0.6 },
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
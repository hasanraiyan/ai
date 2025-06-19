// src/screens/ImageGenerationScreen.js
import React, { useState, useContext, useRef, useEffect } from 'react'
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
    LayoutAnimation,
    UIManager,
    Image as RNImage,
    Modal,
    Dimensions,
    Alert, // Import Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system'
import * as MediaLibrary from 'expo-media-library'
import { SettingsContext } from '../contexts/SettingsContext'
import { generateImage, improvePrompt } from '../agents/aiImageAgent'
import { imageCategories } from '../constants/imageCategories'
import { models } from '../constants/models'; // Import models for validation

const { width: screenWidth } = Dimensions.get('window')
const DEFAULT_NUM_IMAGES = 4
const NUM_IMAGE_OPTIONS = [1, 2, 3, 4, 5, 6]
const DEFAULT_MODEL_NAME = 'gemma-3-27b-it'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

const Shimmer = ({ style }) => {
    const shimmer = useRef(new Animated.Value(0.3)).current
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: false }),
                Animated.timing(shimmer, { toValue: 0.3, duration: 800, useNativeDriver: false }),
            ])
        ).start()
    }, [shimmer])
    const backgroundColor = shimmer.interpolate({
        inputRange: [0.3, 1],
        outputRange: ['#E0E0E0', '#F0F0F0'],
    })
    return <Animated.View style={[style, { backgroundColor }]} />
}

const FadeInImage = ({ source, style, onLoadEnd }) => {
    const opacity = useRef(new Animated.Value(0)).current
    const handleLoad = () =>
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start()
    return (
        <Animated.Image
            source={source}
            style={[style, { opacity }]}
            onLoadEnd={() => {
                handleLoad()
                onLoadEnd && onLoadEnd()
            }}
            resizeMode="cover"
        />
    )
}

const ManagedImage = ({ source }) => {
    const [loading, setLoading] = useState(true)
    return (
        <View style={styles.imageContainer}>
            <FadeInImage source={source} style={styles.fillImage} onLoadEnd={() => setLoading(false)} />
            {loading && (
                <View style={styles.imageOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                </View>
            )}
        </View>
    )
}

const getImageStyle = (i, total) => {
    const base = { marginBottom: 12 }
    if (total === 1) return { ...base, width: '100%', aspectRatio: 16 / 9 }
    if (total === 2 || total === 4) return { ...base, width: '48.5%', aspectRatio: 1 }
    return { ...base, width: '32%', aspectRatio: 1 }
}

const ImageGalleryModal = ({ visible, images, initialIndex, onClose }) => {
    const [current, setCurrent] = useState(initialIndex)
    const scrollRef = useRef(null)

    useEffect(() => {
        if (visible && scrollRef.current) {
            setCurrent(initialIndex)
            scrollRef.current.scrollTo({ x: screenWidth * initialIndex, animated: false })
        }
    }, [visible, initialIndex])

    const handleDownload = async () => {
        const url = images[current]
        const { status } = await MediaLibrary.requestPermissionsAsync()
        if (status !== 'granted') {
            console.warn('Media library permission not granted.')
            return
        }
        try {
            const fp = `${FileSystem.documentDirectory}${Date.now()}.jpg`
            const { uri } = await FileSystem.downloadAsync(url, fp)
            await MediaLibrary.createAssetAsync(uri)
        } catch (err) {
            console.error('Download failed:', err)
        }
    }

    if (!visible) return null
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={e =>
                        setCurrent(Math.round(e.nativeEvent.contentOffset.x / screenWidth))
                    }
                >
                    {images.map((uri, idx) => (
                        <View key={idx} style={styles.modalPage}>
                            <RNImage source={{ uri }} style={styles.modalImage} resizeMode="contain" />
                        </View>
                    ))}
                </ScrollView>
                <TouchableOpacity style={[styles.modalButton, styles.closeButton]} onPress={onClose}>
                    <Ionicons name="close" size={30} color="#fff" />
                </TouchableOpacity>
                {images.length > 1 && (
                    <View style={styles.pageIndicator}>
                        <Text style={styles.pageIndicatorText}>
                            {current + 1} / {images.length}
                        </Text>
                    </View>
                )}
                <TouchableOpacity
                    style={[styles.modalButton, styles.downloadButton]}
                    onPress={handleDownload}
                >
                    <Ionicons name="download-outline" size={30} color="#fff" />
                </TouchableOpacity>
            </View>
        </Modal>
    )
}

export default function ImageGenerationScreen({ navigation }) {
    const { apiKey, agentModelName: settingsModel } = useContext(SettingsContext)
    const [prompt, setPrompt] = useState('')
    const [numImages, setNumImages] = useState(DEFAULT_NUM_IMAGES)
    const [selectedCategory, setSelectedCategory] = useState(imageCategories.find(c => c.id === 'none'))
    const [loading, setLoading] = useState(false)
    const [improving, setImproving] = useState(false)
    const [urls, setUrls] = useState([])
    const [modalVisible, setModalVisible] = useState(false)
    const [startIndex, setStartIndex] = useState(0)

    const anyLoading = loading || improving
    const modelToUse = settingsModel || DEFAULT_MODEL_NAME

    const doLayoutAnim = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)

    const handleGenerate = async () => {
        Keyboard.dismiss()
        if (!apiKey || !modelToUse || !prompt.trim()) {
            console.warn('API Key, Model, or Prompt is missing.')
            return
        }

        // --- START: CRITICAL VALIDATION LOGIC ---
        const selectedModelData = models.find(m => m.id === modelToUse);
        if (!selectedModelData?.supported_tools.includes('image_generator')) {
            Alert.alert(
                "Model Not Capable",
                `The selected Agent Model (${selectedModelData?.name || modelToUse}) does not support image generation. Please select a different model in Settings.`,
                [{ text: "OK" }]
            );
            return;
        }
        // --- END: CRITICAL VALIDATION LOGIC ---

        setLoading(true)
        setUrls([])
        doLayoutAnim()

        const finalPrompt = selectedCategory.description
            ? `${selectedCategory.description}, ${prompt.trim()}`
            : prompt.trim()

        console.log('Final prompt being sent:', finalPrompt)

        try {
            const res = await generateImage(apiKey, modelToUse, finalPrompt, numImages)
            if (res.success && res.imageUrls?.length) {
                setUrls(res.imageUrls)
                console.log(`Generated ${res.imageUrls.length} images`)
            } else {
                console.error('Generation failed:', res.reason)
            }
        } catch (err) {
            console.error('Error generating image:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleImprove = async () => {
        Keyboard.dismiss()
        if (!apiKey || !modelToUse || !prompt.trim()) {
            console.warn('Missing Info for prompt improvement')
            return
        }
        setImproving(true)
        setUrls([])
        doLayoutAnim()
        try {
            const res = await improvePrompt(apiKey, modelToUse, prompt.trim())
            if (res.success && res.prompt) {
                setPrompt(res.prompt)
            } else {
                console.error('Prompt improvement failed:', res.reason)
            }
        } catch (err) {
            console.error('Error improving prompt:', err)
        } finally {
            setImproving(false)
        }
    }

    const openModal = idx => {
        setStartIndex(idx)
        setModalVisible(true)
    }

    const renderOptions = (opts, active, setter) =>
        opts.map(opt => {
            const val = opt.value ?? opt
            const label = opt.label ?? opt.name ?? opt
            const disabled = anyLoading || opt.disabled
            return (
                <TouchableOpacity
                    key={val}
                    disabled={disabled}
                    style={[
                        styles.optionBtn,
                        active === val && styles.optionBtnActive,
                        disabled && styles.optionBtnDisabled,
                    ]}
                    onPress={() => setter(val)}
                >
                    <Text style={[styles.optionText, active === val && styles.optionTextActive]}>
                        {label}
                    </Text>
                </TouchableOpacity>
            )
        })

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={styles.container.backgroundColor} />
            <ImageGalleryModal
                visible={modalVisible}
                images={urls}
                initialIndex={startIndex}
                onClose={() => setModalVisible(false)}
            />
            <View style={styles.header}>
                <TouchableOpacity onPress={navigation.openDrawer}>
                    <Ionicons name="menu-outline" size={28} color="#475569" />
                </TouchableOpacity>
                <Text style={styles.title}>Generate Image</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                    <Ionicons name="settings-outline" size={24} color="#475569" />
                </TouchableOpacity>
            </View>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        <Text style={styles.label}>Describe your image</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="A futuristic city skyline at sunset…"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                value={prompt}
                                onChangeText={setPrompt}
                                editable={!anyLoading}
                            />
                            {prompt.trim().length > 0 && (
                                <TouchableOpacity
                                    style={styles.improveBtn}
                                    onPress={handleImprove}
                                    disabled={anyLoading}
                                >
                                    {improving ? (
                                        <ActivityIndicator size="small" color="#4F46E5" />
                                    ) : (
                                        <Ionicons name="sparkles-outline" size={20} color="#4F46E5" />
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.label}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                            {imageCategories.map(category => {
                                const isSelected = selectedCategory.id === category.id;
                                return (
                                    <TouchableOpacity
                                        key={category.id}
                                        style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                                        onPress={() => setSelectedCategory(category)}
                                        disabled={anyLoading}
                                    >
                                        <RNImage source={{ uri: category.imageUrl }} style={styles.categoryImage} />
                                        <View style={styles.categoryTextContainer}>
                                            <Text
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                                style={[styles.categoryText, isSelected && styles.categoryTextSelected]}
                                            >
                                                {category.name}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.label}>Number of Images</Text>
                        <View style={styles.optionRow}>
                            {renderOptions(NUM_IMAGE_OPTIONS, numImages, setNumImages)}
                        </View>
                    </View>

                    {(loading || urls.length > 0) && (
                        <View style={styles.previewCard}>
                            <Text style={styles.label}>
                                {loading ? `Generating ${numImages} images…` : 'Generated Images'}
                            </Text>
                            <View style={styles.imageGrid}>
                                {loading
                                    ? Array(numImages)
                                        .fill(null)
                                        .map((_, i) => (
                                            <Shimmer
                                                key={i}
                                                style={[styles.imageWrapper, getImageStyle(i, numImages)]}
                                            />
                                        ))
                                    : urls.map((u, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={[styles.imageWrapper, getImageStyle(i, urls.length)]}
                                            onPress={() => openModal(i)}
                                            activeOpacity={0.8}
                                        >
                                            <ManagedImage source={{ uri: u }} />
                                        </TouchableOpacity>
                                    ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.generateBtn,
                            (!prompt.trim() || anyLoading) && styles.generateBtnDisabled,
                        ]}
                        onPress={handleGenerate}
                        disabled={!prompt.trim() || anyLoading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.generateText}>Generate</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#E2E8F0',
    },
    title: { fontSize: 20, fontWeight: '600', color: '#1E293B' },
    scroll: { padding: 16, paddingBottom: 120 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    label: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
    inputWrapper: { position: 'relative' },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        padding: 12,
        minHeight: 120,
        textAlignVertical: 'top',
        color: '#1E293B',
        fontSize: 15,
        paddingRight: 40,
    },
    improveBtn: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: '#E0E7FF',
        borderRadius: 20,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryScroll: { paddingBottom: 4 },
    categoryCard: {
        width: 100,
        height: 100,
        borderRadius: 8,
        marginRight: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    categoryCardSelected: {
        borderColor: '#4F46E5',
    },
    categoryImage: {
        width: '100%',
        height: '100%',
        borderRadius: 6
    },
    categoryTextContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 6,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    categoryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    categoryTextSelected: {
        fontWeight: '700',
    },
    optionRow: { flexDirection: 'row', flexWrap: 'wrap' },
    optionBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#F8FAFC',
        marginRight: 8,
        marginBottom: 8,
    },
    optionBtnActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    optionBtnDisabled: { opacity: 0.5 },
    optionText: { fontSize: 14, color: '#334155' },
    optionTextActive: { color: '#fff', fontWeight: '600' },
    previewCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    imageWrapper: { borderRadius: 8, overflow: 'hidden' },
    imageContainer: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    fillImage: { width: '100%', height: '100%' },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' },
    modalPage: { width: screenWidth, height: '100%', justifyContent: 'center', alignItems: 'center' },
    modalImage: { width: '100%', height: '80%' },
    modalButton: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 30,
        padding: 8,
        zIndex: 10,
    },
    closeButton: { top: Platform.OS === 'android' ? 40 : 60, right: 20 },
    downloadButton: { bottom: Platform.OS === 'android' ? 40 : 60, alignSelf: 'center' },
    pageIndicator: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 45 : 65,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 12,
    },
    pageIndicatorText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    footer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        padding: 16,
    },
    generateBtn: {
        backgroundColor: '#4F46E5',
        borderRadius: 12,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
    },
    generateBtnDisabled: { backgroundColor: '#A5B4FC', elevation: 0 },
    generateText: { color: '#fff', fontSize: 18, fontWeight: '600' },
})
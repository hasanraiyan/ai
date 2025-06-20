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
    Alert,
    useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system'
import * as MediaLibrary from 'expo-media-library'
import { SettingsContext } from '../contexts/SettingsContext'
import { generateImage, improvePrompt } from '../agents/aiImageAgent'
import { imageCategories } from '../constants/imageCategories'
import { models } from '../constants/models'
import { useTheme, spacing, typography } from '../utils/theme'
import ScreenHeader from '../components/ScreenHeader'
const { width: screenWidth } = Dimensions.get('window')
const MIN_IMAGES = 1
const MAX_IMAGES = 4
const DEFAULT_NUM_IMAGES = 2
const DEFAULT_MODEL_NAME = 'gemma-3-27b-it'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

const Shimmer = ({ style }) => {
    const theme = useTheme()
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
        outputRange: [theme.colors.emptyBg, theme.colors.card],
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
    const styles = getStyles(useTheme())
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
    const base = { marginBottom: spacing.sm }
    if (total === 1) return { ...base, width: '100%', aspectRatio: 16 / 9 }
    if (total === 2 || total === 4) return { ...base, width: '48.5%', aspectRatio: 1 }
    return { ...base, width: '32%', aspectRatio: 1 }
}

const ImageGalleryModal = ({ visible, images, initialIndex, onClose }) => {
    const [current, setCurrent] = useState(initialIndex)
    const scrollRef = useRef(null)
    const styles = getStyles(useTheme())

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
            Alert.alert(
                'Permission Denied',
                'Please grant media library permissions in your device settings to save images.'
            )
            return
        }
        try {
            const fileUri = `${FileSystem.documentDirectory}${Date.now()}.jpg`
            const { uri } = await FileSystem.downloadAsync(url, fileUri)
            await MediaLibrary.createAssetAsync(uri)
            Alert.alert('Success', 'Image saved to your gallery!')
        } catch (err) {
            console.error('Download failed:', err)
            Alert.alert('Error', 'Failed to save the image. Please try again.')
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
    const theme = useTheme();
    const styles = getStyles(theme);
    const scheme = useColorScheme();

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
        if (!prompt.trim()) {
            Alert.alert('Prompt is Empty', 'Please describe the image you want to generate.');
            return;
        }
        if (!apiKey) {
             Alert.alert(
                'API Key Missing',
                'Please set your API Key in the Settings screen to generate images.',
                [{ text: 'Go to Settings', onPress: () => navigation.navigate('Settings') }, { text: 'OK' }]
            );
            return;
        }

        const selectedModelData = models.find(m => m.id === modelToUse);
        if (!selectedModelData?.supported_tools.includes('image_generator')) {
            Alert.alert(
                "Model Not Capable",
                `The selected Agent Model (${selectedModelData?.name || modelToUse}) does not support image generation. Please select a compatible model in Settings.`,
                [{ text: "OK" }]
            );
            return;
        }

        setLoading(true)
        setUrls([])
        doLayoutAnim()

        const finalPrompt = selectedCategory.id !== 'none'
            ? `${selectedCategory.description}, ${prompt.trim()}`
            : prompt.trim()

        // Create a detailed metadata payload to be saved with the image.
        const metadataPayload = {
            prompt: prompt.trim(),
            styleId: selectedCategory.id,
            styleName: selectedCategory.name,
            modelUsed: modelToUse,
            batchSize: numImages,
        };

        try {
            // Pass the full prompt AND the metadata payload to the agent.
            const res = await generateImage(apiKey, modelToUse, finalPrompt, numImages, metadataPayload);
            
            if (res.success && res.imageUrls?.length) {
                setUrls(res.imageUrls)
            } else {
                Alert.alert('Generation Failed', res.reason || 'An unknown error occurred.');
            }
        } catch (err) {
            Alert.alert('Error', err.message || 'An error occurred while generating the image.');
        } finally {
            setLoading(false)
        }
    }

    const handleImprove = async () => {
        Keyboard.dismiss()
        if (!prompt.trim()) {
            Alert.alert('Prompt is Empty', 'Please enter a prompt to improve.');
            return;
        }
        if (!apiKey) {
            Alert.alert('API Key Missing', 'An API Key is required to improve prompts.');
            return;
        }

        setImproving(true)
        setUrls([])
        doLayoutAnim()
        try {
            const res = await improvePrompt(apiKey, modelToUse, prompt.trim())
            if (res.success && res.prompt) {
                setPrompt(res.prompt)
                Alert.alert('Prompt Improved!', 'Your prompt has been enhanced.');
            } else {
                Alert.alert('Improvement Failed', res.reason || 'An unknown error occurred.');
            }
        } catch (err) {
            Alert.alert('Error', err.message || 'An error occurred while improving the prompt.');
        } finally {
            setImproving(false)
        }
    }

    const openModal = idx => {
        setStartIndex(idx)
        setModalVisible(true)
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
            <ImageGalleryModal
                visible={modalVisible}
                images={urls}
                initialIndex={startIndex}
                onClose={() => setModalVisible(false)}
            />
           <ScreenHeader
                title="Image Generation"
                navigation={navigation}
                subtitle={"Create AI art with a prompt and style"}
                />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        <Text style={styles.label}>1. Describe Your Image</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="A futuristic city skyline at sunset…"
                                placeholderTextColor={theme.colors.subtext}
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
                                        <ActivityIndicator size="small" color={theme.colors.accent} />
                                    ) : (
                                        <Ionicons name="sparkles-outline" size={20} color={theme.colors.accent} />
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.label}>2. Choose a Style</Text>
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
                                            <Text style={styles.categoryText}>
                                                {category.name}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.label}>3. Number of Images</Text>
                        <View style={styles.stepperContainer}>
                            <TouchableOpacity
                                onPress={() => setNumImages(n => Math.max(MIN_IMAGES, n - 1))}
                                disabled={anyLoading || numImages <= MIN_IMAGES}
                                style={[styles.stepperButton, (anyLoading || numImages <= MIN_IMAGES) && styles.stepperButtonDisabled]}
                            >
                                <Ionicons name="remove-outline" size={24} color={theme.colors.accent} />
                            </TouchableOpacity>

                            <View style={styles.stepperValueContainer}>
                                <Text style={styles.stepperValue}>{numImages}</Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => setNumImages(n => Math.min(MAX_IMAGES, n + 1))}
                                disabled={anyLoading || numImages >= MAX_IMAGES}
                                style={[styles.stepperButton, (anyLoading || numImages >= MAX_IMAGES) && styles.stepperButtonDisabled]}
                            >
                                <Ionicons name="add-outline" size={24} color={theme.colors.accent} />
                            </TouchableOpacity>
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

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        justifyContent: 'space-between',
        backgroundColor: theme.colors.headerBg,
        borderBottomWidth: 1,
        borderColor: theme.colors.headerBorder,
    },
    title: { fontSize: typography.h1, fontWeight: '600', color: theme.colors.text },
    scroll: { padding: spacing.md, paddingBottom: 120 },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    label: { fontSize: typography.h2, fontWeight: '600', color: theme.colors.text, marginBottom: spacing.sm },
    inputWrapper: { position: 'relative' },
    input: {
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        padding: spacing.sm + spacing.xs,
        minHeight: 120,
        textAlignVertical: 'top',
        color: theme.colors.text,
        fontSize: typography.body,
        paddingRight: 40,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    improveBtn: {
        position: 'absolute',
        bottom: spacing.sm,
        right: spacing.sm,
        backgroundColor: theme.colors.accent20,
        borderRadius: 20,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryScroll: { paddingBottom: spacing.xs },
    categoryCard: {
        width: 100,
        height: 100,
        borderRadius: 8,
        marginRight: spacing.sm,
        borderWidth: 2,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    categoryCardSelected: { borderColor: theme.colors.accent },
    categoryImage: { width: '100%', height: '100%', borderRadius: 6 },
    categoryTextContainer: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: spacing.xs,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    categoryText: { color: '#fff', fontSize: typography.small, fontWeight: '500', textAlign: 'center' },
    previewCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    imageWrapper: { borderRadius: 8, overflow: 'hidden' },
    imageContainer: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    fillImage: { width: '100%', height: '100%' },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
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
        padding: spacing.sm,
        zIndex: 10,
    },
    closeButton: { top: Platform.OS === 'android' ? spacing.xl : 60, right: spacing.md },
    downloadButton: { bottom: Platform.OS === 'android' ? spacing.xl : 60, alignSelf: 'center' },
    pageIndicator: {
        position: 'absolute',
        top: Platform.OS === 'android' ? spacing.xl + 5 : 65,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
    },
    pageIndicatorText: { color: '#fff', fontSize: typography.body, fontWeight: 'bold' },
    footer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        padding: spacing.md,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderColor: theme.colors.border,
    },
    generateBtn: {
        backgroundColor: theme.colors.accent,
        borderRadius: 12,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
    },
    generateBtnDisabled: { backgroundColor: theme.colors.accent, opacity: 0.5, elevation: 0 },
    generateText: { color: '#fff', fontSize: typography.h2, fontWeight: '600' },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
    },
    stepperButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.accent20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperButtonDisabled: {
        opacity: 0.4,
    },
    stepperValueContainer: {
        marginHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        minWidth: 80,
        borderRadius: 8,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
    },
    stepperValue: {
        fontSize: typography.h1,
        fontWeight: '700',
        color: theme.colors.text,
    },
});
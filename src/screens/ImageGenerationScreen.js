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
import ToggleSwitch from '../components/ToggleSwitch'

const { width: screenWidth } = Dimensions.get('window')
const MIN_IMAGES = 1
const MAX_IMAGES = 6 // Requirement updated to 6
const DEFAULT_NUM_IMAGES = 2
const DEFAULT_MODEL_NAME = 'gemma-3-27b-it'

const aspectRatioOptions = [
    { key: '1:1', label: 'Square', icon: 'square-outline' },
    { key: '16:9', label: 'Landscape', icon: 'tablet-landscape-outline' },
    { key: '9:16', label: 'Portrait', icon: 'tablet-portrait-outline' },
];

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

/**
 * BUG FIX & CODE QUALITY: Added comments to explain the complex but robust logic.
 * This function calculates the style for each image in the preview grid.
 * It gracefully handles all combinations of aspect ratio and image count (1-6).
 */
const getImageStyle = (total, ratio) => {
    const base = { marginBottom: spacing.sm };

    // Landscape images are always full-width for impact.
    if (ratio === '16:9') {
        return { ...base, width: '100%', aspectRatio: 16 / 9 };
    }

    // Portrait images use a 3-column grid, which works well for counts 1-6.
    if (ratio === '9:16') {
        return { ...base, width: '32%', aspectRatio: 9 / 16 };
    }

    // Square images have special logic for a balanced, visually pleasing grid.
    if (ratio === '1:1') {
        // A single square image is full-width.
        if (total === 1) {
            return { ...base, width: '100%', aspectRatio: 1 };
        }
        // A 2-column grid is perfect for 2 or 4 images.
        if (total === 2 || total === 4) {
            return { ...base, width: '48.5%', aspectRatio: 1 };
        }
        // A 3-column grid prevents a "dangling" single image on the last row for 3, 5, or 6 images.
        return { ...base, width: '32%', aspectRatio: 1 };
    }

    // Fallback to a default style if the ratio is somehow unknown.
    return { ...base, width: '48.5%', aspectRatio: 1 };
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
    const theme = useTheme()
    const styles = getStyles(theme)
    const scheme = useColorScheme()

    const { apiKey, agentModelName: settingsModel } = useContext(SettingsContext)
    const [prompt, setPrompt] = useState('')
    const [numImages, setNumImages] = useState(DEFAULT_NUM_IMAGES)
    const [aspectRatio, setAspectRatio] = useState('1:1')
    const [selectedCategory, setSelectedCategory] = useState(imageCategories.find(c => c.id === 'none'))
    const [loading, setLoading] = useState(false)
    const [improving, setImproving] = useState(false)
    const [urls, setUrls] = useState([])
    const [modalVisible, setModalVisible] = useState(false)
    const [startIndex, setStartIndex] = useState(0)

    const anyLoading = loading || improving
    const modelToUse = settingsModel || DEFAULT_MODEL_NAME

    // BUG FIX: The `imageCountOptions` variable was removed as it is redundant.
    // The options are now generated inline in the ToggleSwitch component props.

    const doLayoutAnim = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)

    const handleGenerate = async () => {
        Keyboard.dismiss()
        if (!prompt.trim()) {
            Alert.alert('Prompt is Empty', 'Please describe the image you want to generate.')
            return
        }
        if (!apiKey) {
            Alert.alert(
                'API Key Missing',
                'Please set your API Key in the Settings screen to generate images.',
                [{ text: 'Go to Settings', onPress: () => navigation.navigate('Settings') }, { text: 'OK' }]
            )
            return
        }

        const selectedModelData = models.find(m => m.id === modelToUse)
        if (!selectedModelData?.supported_tools.includes('image_generator')) {
            Alert.alert(
                "Model Not Capable",
                `The selected Agent Model (${selectedModelData?.name || modelToUse}) does not support image generation. Please select a compatible model in Settings.`,
                [{ text: "OK" }]
            )
            return
        }

        setLoading(true)
        setUrls([])
        doLayoutAnim()

        const finalPrompt = selectedCategory.id !== 'none'
            ? `${selectedCategory.description}, ${prompt.trim()}`
            : prompt.trim()

        const getDimensions = (ratio) => {
            switch (ratio) {
                case '16:9': return { width: 768, height: 432 }
                case '9:16': return { width: 432, height: 768 }
                case '1:1':
                default: return { width: 512, height: 512 }
            }
        }

        const { width, height } = getDimensions(aspectRatio)

        const metadataPayload = {
            prompt: prompt.trim(),
            styleId: selectedCategory.id,
            styleName: selectedCategory.name,
            modelUsed: modelToUse,
            batchSize: numImages,
            aspectRatio: aspectRatio,
            width: width,
            height: height,
        }

        try {
            const res = await generateImage(apiKey, modelToUse, finalPrompt, numImages, metadataPayload)

            if (res.success && res.imageUrls?.length) {
                setUrls(res.imageUrls)
            } else {
                Alert.alert('Generation Failed', res.reason || 'An unknown error occurred.')
            }
        } catch (err) {
            Alert.alert('Error', err.message || 'An error occurred while generating the image.')
        } finally {
            setLoading(false)
        }
    }

    const handleImprove = async () => {
        Keyboard.dismiss()
        if (!prompt.trim()) {
            Alert.alert('Prompt is Empty', 'Please enter a prompt to improve.')
            return
        }
        if (!apiKey) {
            Alert.alert('API Key Missing', 'An API Key is required to improve prompts.')
            return
        }

        setImproving(true)
        setUrls([])
        doLayoutAnim()
        try {
            const res = await improvePrompt(apiKey, modelToUse, prompt.trim())
            if (res.success && res.prompt) {
                setPrompt(res.prompt)
                Alert.alert('Prompt Improved!', 'Your prompt has been enhanced.')
            } else {
                Alert.alert('Improvement Failed', res.reason || 'An unknown error occurred.')
            }
        } catch (err) {
            Alert.alert('Error', err.message || 'An error occurred while improving the prompt.')
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
                subtitle="Create AI art with a prompt and style"
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        <Text style={styles.label}>Describe Your Image</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                // BUG FIX: Replaced non-standard character with standard ellipsis
                                placeholder="A futuristic city skyline at sunset..."
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
                        <Text style={styles.label}>Choose a Style</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                            {imageCategories.map(category => {
                                const isSelected = selectedCategory.id === category.id
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
                                )
                            })}
                        </ScrollView>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.label}>Aspect Ratio</Text>
                        <ToggleSwitch
                            options={aspectRatioOptions}
                            selected={aspectRatio}
                            onSelect={setAspectRatio}
                            disabled={anyLoading}
                            containerStyle={{ marginTop: spacing.sm }}
                            size="medium"
                            variant="solid"
                        />
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.label}>Number of Images</Text>
                        <ToggleSwitch
                            // BUG FIX: `imageCountOptions` removed, options generated inline.
                            options={Array.from({ length: MAX_IMAGES - MIN_IMAGES + 1 }, (_, i) => {
                                const count = MIN_IMAGES + i;
                                return { key: count, label: `${count}` };
                            })}
                            selected={numImages}
                            onSelect={setNumImages}
                            disabled={anyLoading}
                            containerStyle={{ marginTop: spacing.sm }}
                            size="medium"
                            variant="solid"
                        />
                    </View>

                    {(loading || urls.length > 0) && (
                        <View style={styles.previewCard}>
                            <Text style={styles.label}>
                                {loading ? `Generating ${numImages} images...` : 'Generated Images'}
                            </Text>
                            <View style={styles.imageGrid}>
                                {loading
                                    ? Array(numImages)
                                        .fill(null)
                                        .map((_, i) => (
                                            <Shimmer
                                                key={i}
                                                style={[styles.imageWrapper, getImageStyle(numImages, aspectRatio)]}
                                            />
                                        ))
                                    : urls.map((u, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={[styles.imageWrapper, getImageStyle(urls.length, aspectRatio)]}
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
    scroll: { padding: spacing.md, paddingBottom: 120 },
    card: {
        borderRadius: 12,
        padding: spacing.md,
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
        borderRadius: 6,
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
});
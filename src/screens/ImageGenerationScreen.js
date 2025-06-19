// src/screens/ImageGenerationScreen.js
import React, { useState, useContext, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { SettingsContext } from '../contexts/SettingsContext';
// Remove the direct import of callImageTool from aiService
// import { callImageTool } from '../services/aiService'; // <-- REMOVE THIS
import { generateImage } from '../agents/aiImageAgent'; // <-- Keep this one

const PROMPT_MAX_LENGTH = 500;
const NUM_IMAGES_TO_GENERATE = 4; // Specify how many images to generate
const DEFAULT_MODEL_NAME = 'your-chosen-model'; // <-- Replace with your desired model name (e.g., 'gemini-1.5-pro-latest', 'claude-3-sonnet-20240229', etc.)

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1', disabled: false },
  { label: '9:16', value: '9:16', disabled: true }, // Assuming these are still disabled for now
  { label: '16:9', value: '16:9', disabled: true }, // Assuming these are still disabled for now
];

const STYLES = [
  { name: 'None', value: '' },
  { name: 'Oil Painting', value: 'oil_painting' },
  { name: 'Watercolor', value: 'watercolor' },
  { name: 'Cartoon', value: 'cartoon' },
  { name: 'Retro', value: 'retro' },
];

// Simple Skeleton Loader Component
const SkeletonImagePlaceholder = () => (
  <View style={styles.skeletonPlaceholder}>
    <View style={styles.skeletonShimmer} />
  </View>
);

export default function ImageGenerationScreen({ navigation }) {
  const { apiKey, modelName: settingsModelName } = useContext(SettingsContext);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1'); // Note: Aspect Ratio and Style are currently not passed to generateImage/callImageTool based on the provided aiImageAgent code. You might need to modify aiImageAgent or the tool dispatcher to support these if required.
  const [styleOpt, setStyleOpt] = useState(''); // Same as above
  const [loading, setLoading] = useState(false);
  const [generatedImageUrls, setGeneratedImageUrls] = useState([]); // State for multiple image URLs
  const [resultMessage, setResultMessage] = useState('');
  const promptRef = useRef(null);

  // Use modelName from settings if available, otherwise use default
  const currentModelName = settingsModelName || DEFAULT_MODEL_NAME;

  const handleGenerate = async () => {
    Keyboard.dismiss();
    if (!apiKey) {
      return Toast.show({
        type: 'error',
        text1: 'API Key Missing',
        text2: 'Please set your API key in Settings.',
      });
    }
    if (!currentModelName || currentModelName === DEFAULT_MODEL_NAME) { // Add check for model name
       return Toast.show({
         type: 'error',
         text1: 'Model Name Missing',
         text2: `Please configure the model name in Settings or update DEFAULT_MODEL_NAME.`,
       });
    }
    if (!prompt.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Empty Prompt',
        text2: 'Please describe the image.',
      });
    }

    setLoading(true);
    setResultMessage('');
    setGeneratedImageUrls([]); // Clear previous images

    try {
      // Use the generateImage agent function
      const response = await generateImage(
        apiKey,
        currentModelName,
        prompt.trim(),
        NUM_IMAGES_TO_GENERATE // Pass the number of images to generate
      );

      if (response.success && Array.isArray(response.imageUrls) && response.imageUrls.length > 0) {
        setGeneratedImageUrls(response.imageUrls);
        setResultMessage(`Generated ${response.imageUrls.length} images.`);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Generated ${response.imageUrls.length} images.`,
        });
      } else {
        // Handle cases where success is false or no images were generated
        const reason = response.reason || 'Generation failed to produce images.';
        setResultMessage(`Generation failed: ${reason}`);
         Toast.show({
          type: 'error',
          text1: 'Generation Failed',
          text2: reason,
        });
      }
    } catch (err) {
      setResultMessage(`Error during generation: ${err.message}`);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Error during generation: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderAspectButtons = () =>
    ASPECT_RATIOS.map((r) => {
      const active = r.value === aspectRatio;
      return (
        <TouchableOpacity
          key={r.value}
          activeOpacity={r.disabled ? 1 : 0.7}
          style={[
            styles.aspectBtn,
            active && styles.aspectBtnActive,
            r.disabled && styles.aspectBtnDisabled,
          ]}
          disabled={r.disabled}
          onPress={() => setAspectRatio(r.value)}
        >
          <Text
            style={[
              styles.aspectText,
              active && styles.aspectTextActive,
              r.disabled && styles.aspectTextDisabled,
            ]}
          >
            {r.label}
          </Text>
        </TouchableOpacity>
      );
    });

  const renderStyleOptions = () =>
    STYLES.map((s) => {
      const selected = s.value === styleOpt;
      return (
        <TouchableOpacity
          key={s.value}
          style={[styles.styleBtn, selected && styles.styleBtnActive]}
          onPress={() => setStyleOpt(s.value)}
        >
          <Text
            style={[
              styles.styleText,
              selected && styles.styleTextActive,
            ]}
          >
            {s.name}
          </Text>
        </TouchableOpacity>
      );
    });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={styles.container.backgroundColor}
      />

      {/* Header */}
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
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Prompt */}
          <View style={styles.card}>
            <Text style={styles.label}>Describe your image</Text>
            <TextInput
              ref={promptRef}
              style={styles.input}
              placeholder="e.g. A cozy cabin in the snowy mountains at sunset"
              placeholderTextColor="#9CA3AF"
              multiline
              value={prompt}
              onChangeText={setPrompt}
              maxLength={PROMPT_MAX_LENGTH}
              editable={!loading}
            />
            <Text style={styles.charCount}>
              {prompt.length}/{PROMPT_MAX_LENGTH}
            </Text>
          </View>

          {/* Aspect Ratio */}
          <View style={styles.card}>
            <Text style={styles.label}>Aspect Ratio</Text>
            <View style={styles.aspectRow}>{renderAspectButtons()}</View>
             {/* Add conditional hint */}
            {ASPECT_RATIOS.find((r) => r.value === aspectRatio)?.disabled && (
              <Text style={styles.hint}>
                 * Note: Aspect ratio & style options are not currently sent to the AI agent or image tool.
              </Text>
            )}
          </View>

          {/* Style */}
          <View style={styles.card}>
            <Text style={styles.label}>
              Style <Text style={styles.optional}>(optional)</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.styleRow}
            >
              {renderStyleOptions()}
            </ScrollView>
             {/* Add conditional hint */}
            {styleOpt !== '' && (
               <Text style={styles.hint}>
                 * Note: Aspect ratio & style options are not currently sent to the AI agent or image tool.
               </Text>
            )}
          </View>

          {/* Image Generation Output / Skeleton */}
          {loading || generatedImageUrls.length > 0 || !!resultMessage ? ( // Show this section if loading, images exist, or message exists
            <View style={styles.previewCard}>
               {loading ? (
                 <>
                   <Text style={styles.label}>Generating Images...</Text>
                   <View style={styles.imageGrid}>
                      {/* Render 4 skeleton placeholders */}
                      {Array(NUM_IMAGES_TO_GENERATE).fill(0).map((_, index) => (
                        <SkeletonImagePlaceholder key={index} />
                      ))}
                   </View>
                 </>
               ) : generatedImageUrls.length > 0 ? (
                 <>
                   <Text style={styles.label}>Generated Images</Text>
                   <View style={styles.imageGrid}>
                     {/* Render generated images */}
                     {generatedImageUrls.map((url, index) => (
                       <Image
                         key={index}
                         source={{ uri: url }}
                         style={styles.gridImage}
                         resizeMode="cover"
                       />
                     ))}
                   </View>
                 </>
               ) : null /* No images, not loading, won't show image grid */}

               {/* Result Message Card (separate within the same section) */}
               {!!resultMessage && !loading && ( // Show message only after loading stops
                 <View style={styles.resultCard}>
                   <Ionicons
                     name={generatedImageUrls.length > 0 ? 'checkmark-circle' : 'alert-circle'}
                     size={48}
                     color={generatedImageUrls.length > 0 ? '#22C55E' : '#EF4444'}
                   />
                   <Text style={styles.resultText}>{resultMessage}</Text>
                 </View>
               )}
            </View>
          ) : null /* Hide the whole section if nothing to show */}

        </ScrollView>

        {/* Generate Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.generateBtn,
              (!prompt.trim() || loading) && styles.generateBtnDisabled,
            ]}
            onPress={handleGenerate}
            disabled={!prompt.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.generateText}>Generate {NUM_IMAGES_TO_GENERATE}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: { fontSize: 20, fontWeight: '600', color: '#1E293B' },
  scroll: { padding: 16, paddingBottom: 120 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  label: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  optional: { fontSize: 13, fontWeight: '400', color: '#64748B' },
  input: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    color: '#1E293B',
    fontSize: 15,
  },
  charCount: {
    textAlign: 'right',
    color: '#94A3B8',
    marginTop: 4,
    fontSize: 13,
  },
  aspectRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  aspectBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    marginRight: 8,
    marginBottom: 8,
  },
  aspectBtnActive: {
    backgroundColor: '#E0E7FF',
    borderColor: '#6366F1',
  },
  aspectBtnDisabled: { opacity: 0.4 },
  aspectText: { fontSize: 14, color: '#334155' },
  aspectTextActive: { color: '#4F46E5', fontWeight: '600' },
  aspectTextDisabled: { color: '#94A3B8' },
  hint: { marginTop: 6, fontStyle: 'italic', color: '#94A3B8', fontSize: 12, color: '#64748B' },
  styleRow: { marginTop: 8 },
  styleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
    marginRight: 10,
  },
  styleBtnActive: {
    backgroundColor: '#E0E7FF',
    borderColor: '#6366F1',
  },
  styleText: { fontSize: 14, color: '#475569' },
  styleTextActive: { color: '#4F46E5', fontWeight: '600' },

  // --- New/Modified Styles for Grid and Skeleton ---
  previewCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    // alignItems: 'center', // Removed as grid handles alignment
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', // Distribute images evenly
    marginTop: 12,
  },
  gridImage: {
    width: '48%', // Roughly half, with space for margin
    aspectRatio: 1, // Keep square (for 1:1)
    borderRadius: 8,
    marginBottom: 10, // Space between rows
    backgroundColor: '#E2E8F0', // Placeholder color while loading/before image loads
  },
  skeletonPlaceholder: {
    width: '48%', // Match gridImage width
    aspectRatio: 1, // Match gridImage aspect ratio
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#E2E8F0', // Gray background for skeleton
    overflow: 'hidden', // Hide shimmer outside
  },
  skeletonShimmer: { // Simple shimmer effect (optional, requires animation logic not included here)
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255,255,255,0.2)', // Light overlay
      // You would typically animate the position of a gradient layer for a true shimmer
  },
  // --- End New/Modified Styles ---

  resultCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16, // Add margin if it's below images
  },
  resultText: {
    marginTop: 12,
    fontSize: 16,
    color: '#1E293B',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 16,
    backgroundColor: '#F1F5F9',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  generateBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  generateBtnDisabled: { backgroundColor: '#A5B4FC' },
  generateText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
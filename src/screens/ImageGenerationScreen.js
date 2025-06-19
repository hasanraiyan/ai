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
import { callImageTool } from '../services/aiService';

const PROMPT_MAX_LENGTH = 500;

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1', disabled: false },
  { label: '9:16', value: '9:16', disabled: true },
  { label: '16:9', value: '16:9', disabled: true },
  // add more if you want
];

const STYLES = [
  { name: 'None', value: '' },
  { name: 'Oil Painting', value: 'oil_painting' },
  { name: 'Watercolor', value: 'watercolor' },
  { name: 'Cartoon', value: 'cartoon' },
  { name: 'Retro', value: 'retro' },
];

export default function ImageGenerationScreen({ navigation }) {
  const { apiKey } = useContext(SettingsContext);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [styleOpt, setStyleOpt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedUri, setGeneratedUri] = useState(null);
  const [resultMessage, setResultMessage] = useState('');
  const promptRef = useRef(null);

  const handleGenerate = async () => {
    Keyboard.dismiss();
    if (!apiKey) {
      return Toast.show({
        type: 'error',
        text1: 'API Key Missing',
        text2: 'Please set your API key in Settings.',
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
    setGeneratedUri(null);

    try {
      const response = await callImageTool(
        apiKey,
        prompt.trim(),
        url=true,
      );

      if (response.imageUrl) {
        setGeneratedUri(response.imageUrl);
        setResultMessage('Image generated successfully!');
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Your image is ready.',
        });
      } else {
        throw new Error(response.error || 'Generation failed.');
      }
    } catch (err) {
      setResultMessage(err.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.message,
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
            {ASPECT_RATIOS.find((r) => r.value === aspectRatio).disabled && (
              <Text style={styles.hint}>
                * This ratio isn't supported yet.
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
          </View>

          {/* Preview */}
          {generatedUri && (
            <View style={styles.previewCard}>
              <Text style={styles.label}>Preview</Text>
              <Image
                source={{ uri: generatedUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Result Message */}
          {!!resultMessage && (
            <View style={styles.resultCard}>
              <Ionicons
                name={generatedUri ? 'checkmark-circle' : 'alert-circle'}
                size={48}
                color={generatedUri ? '#22C55E' : '#EF4444'}
              />
              <Text style={styles.resultText}>{resultMessage}</Text>
            </View>
          )}
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
              <Text style={styles.generateText}>Generate</Text>
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
  hint: { marginTop: 6, fontStyle: 'italic', color: '#94A3B8' },
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
  previewCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 12,
  },
  resultCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
// src/screens/LanguageTutorScreen.js

import React, {
  useState,
  useContext,
  useEffect,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  LayoutAnimation,
  UIManager,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Markdown from 'react-native-markdown-display';

import { SettingsContext } from '../contexts/SettingsContext';
import { processLanguageRequest } from '../agents/languageAgent';
import LanguageSelector from '../components/LanguageSelector'; // if still used elsewhere
import ToggleSwitch from '../components/ToggleSwitch';
import LanguageSettings from '../components/LanguageSettings'; // new component
import { supportedLanguages } from '../constants/languages'; // array of { code, name, isRTL }

const { width: windowWidth } = Dimensions.get('window');

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ListenButton = ({ text, langCode }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handlePress = async () => {
    if (isSpeaking) {
      Speech.stop();
      return;
    }
    const available = await Speech.isLanguageAvailableAsync(langCode);
    if (!available) {
      Alert.alert(
        'Audio Unavailable',
        'This language engine is not available on your device.'
      );
      return;
    }
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Speech.speak(text, {
      language: langCode,
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.listenButton}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={isSpeaking ? 'Stop speaking' : 'Listen'}
    >
      <View
        style={[
          styles.listenButtonInner,
          isSpeaking && styles.listenButtonActive,
        ]}
      >
        <Ionicons
          name={isSpeaking ? 'stop' : 'volume-high'}
          size={16}
          color={isSpeaking ? '#FFFFFF' : '#3B82F6'}
        />
      </View>
    </TouchableOpacity>
  );
};

const ResultCard = ({
  title,
  icon,
  children,
  color = '#3B82F6',
  isRTL = false,
  listenText,
  listenLang,
  highlight = false,
}) => (
  <View style={[styles.resultCard, highlight && styles.resultCardHighlight]}>
    <View
      style={[
        styles.resultCardHeader,
        isRTL && { flexDirection: 'row-reverse' },
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          justifyContent: isRTL ? 'flex-end' : 'flex-start',
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.resultCardTitle, { color }]}>{title}</Text>
      </View>
      {listenText && listenLang && (
        <ListenButton text={listenText} langCode={listenLang} />
      )}
    </View>
    <View style={styles.resultCardContent}>{children}</View>
  </View>
);

export default function LanguageTutorScreen({ navigation }) {
  const { apiKey, agentModelName } = useContext(SettingsContext);
  const [mode, setMode] = useState('Translate'); // 'Translate' or 'Tutor'
  const [inputText, setInputText] = useState('');
  const [sourceLangCode, setSourceLangCode] = useState('en');
  const [targetLangCode, setTargetLangCode] = useState('fr');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Animate layout changes when result/error/loading changes
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [result, error, loading]);

  // Clear previous result/error when mode changes
  useEffect(() => {
    setResult(null);
    setError('');
  }, [mode]);

  const handleProcess = async () => {
    Keyboard.dismiss();
    if (!inputText.trim() || loading) return;
    if (!apiKey) {
      Alert.alert('API Key Missing', 'Please set it in Settings.');
      return;
    }
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const response = await processLanguageRequest(apiKey, agentModelName, {
        text: inputText,
        sourceLang: sourceLangCode,
        targetLang: targetLangCode,
        mode,
      });
      if (!response) throw new Error('Empty response from AI.');
      setResult(response);
      setInputText('');
    } catch (e) {
      setError(e.message || 'Unknown error.');
    } finally {
      setLoading(false);
    }
  };

  const swapLanguages = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const old = sourceLangCode;
    setSourceLangCode(targetLangCode);
    setTargetLangCode(old);
  };

  const renderResult = () => {
    // Determine RTL flags from supportedLanguages array
    const sourceLangObj = supportedLanguages.find(l => l.code === sourceLangCode) || {};
    const targetLangObj = supportedLanguages.find(l => l.code === targetLangCode) || {};
    const sourceIsRTL = !!sourceLangObj.isRTL;
    const targetIsRTL = !!targetLangObj.isRTL;

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color="#EF4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    if (!result && !loading) {
      return (
        <View style={styles.emptyStateContainer}>
          <LinearGradient
            colors={['#F0F9FF', '#E0F2FE']}
            style={styles.emptyStateIcon}
          >
            <Ionicons name="chatbubbles-outline" size={48} color="#0EA5E9" />
          </LinearGradient>
          <Text style={styles.emptyStateTitle}>Ready to help you learn!</Text>
          <Text style={styles.emptyStateSubtitle}>
            {mode === 'Translate'
              ? 'Type something to translate and get detailed analysis'
              : 'Ask me anything about language learning'}
          </Text>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Analyzing your text...</Text>
          <Text style={styles.loadingSubtext}>
            This may take a few moments
          </Text>
        </View>
      );
    }

    if (mode === 'Tutor') {
      // Render tutor response as Markdown
      const tutorText =
        typeof result === 'string' ? result : JSON.stringify(result, null, 2);

      return (
        <ResultCard
          title="AI Tutor Response"
          icon="school"
          color="#8B5CF6"
          isRTL={targetIsRTL}
          listenText={tutorText}
          listenLang={targetLangCode}
          highlight
        >
          <Markdown
            style={{
              body: {
                fontSize: 16,
                lineHeight: 24,
                color: '#374151',
                textAlign: targetIsRTL ? 'right' : 'left',
              },
              heading1: { fontSize: 24, fontWeight: '700' },
              heading2: { fontSize: 20, fontWeight: '700' },
              // inline code style
              code_inline: {
                backgroundColor: '#F3F4F6',
                borderRadius: 4,
                padding: 2,
              },
              // code block style
              code_block: {
                backgroundColor: '#F3F4F6',
                borderRadius: 8,
                padding: 12,
              },
              // you can override more elements if desired
            }}
          >
            {tutorText}
          </Markdown>
        </ResultCard>
      );
    }

    // Translate mode with structured response
    if (
      typeof result === 'object' &&
      result.translation &&
      result.inputAnalysis
    ) {
      const { translation, inputAnalysis, formality, culturalNotes } = result;

      return (
        <>
          <ResultCard
            title="Translation"
            icon="language"
            color="#059669"
            isRTL={targetIsRTL}
            listenText={translation}
            listenLang={targetLangCode}
            highlight
          >
            <Text
              style={[
                styles.translationText,
                targetIsRTL && { textAlign: 'right' },
              ]}
            >
              {translation}
            </Text>
          </ResultCard>

          <ResultCard
            title="Grammar Analysis"
            icon={inputAnalysis.isCorrect ? 'checkmark-circle' : 'alert-circle'}
            color={inputAnalysis.isCorrect ? '#059669' : '#DC2626'}
            isRTL={sourceIsRTL}
            listenText={inputAnalysis.correction}
            listenLang={sourceLangCode}
          >
            <View style={{ marginBottom: 12 }}>
              <View
                style={[
                  styles.statusBadge,
                  inputAnalysis.isCorrect
                    ? styles.correctBadge
                    : styles.incorrectBadge,
                ]}
              >
                <Ionicons
                  name={inputAnalysis.isCorrect ? 'checkmark' : 'close'}
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.statusBadgeText}>
                  {inputAnalysis.isCorrect ? 'Correct' : 'Needs improvement'}
                </Text>
              </View>
              <Text
                style={[
                  styles.correctionText,
                  sourceIsRTL && { textAlign: 'right' },
                ]}
              >
                {inputAnalysis.correction || 'N/A'}
              </Text>
              {!inputAnalysis.isCorrect && (
                <View style={styles.explanationContainer}>
                  <Text style={styles.explanationLabel}>
                    Why this correction:
                  </Text>
                  <Text style={styles.explanationText}>
                    {inputAnalysis.explanation}
                  </Text>
                </View>
              )}
            </View>
          </ResultCard>

          <ResultCard
            title="Formality Variations"
            icon="people"
            color="#7C3AED"
            isRTL={targetIsRTL}
            listenText={`Formal: ${formality.formal}. Informal: ${formality.informal}`}
            listenLang={targetLangCode}
          >
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.formalityLabelText}>Formal</Text>
              <Text style={styles.formalityText}>
                {formality.formal || 'N/A'}
              </Text>
            </View>
            <View style={styles.formalityDivider} />
            <View>
              <Text style={styles.formalityLabelText}>Informal</Text>
              <Text style={styles.formalityText}>
                {formality.informal || 'N/A'}
              </Text>
            </View>
          </ResultCard>

          <ResultCard
            title="Cultural Context"
            icon="globe"
            color="#F59E0B"
            isRTL={targetIsRTL}
          >
            <Text style={styles.culturalText}>
              {culturalNotes ||
                'No specific cultural notes for this translation.'}
            </Text>
          </ResultCard>
        </>
      );
    }

    // Unexpected response shape
    return (
      <ResultCard title="Unexpected Response" icon="alert-circle" color="#EF4444">
        <Text style={styles.bodyText}>The AI returned something unexpected.</Text>
        <Text style={styles.rawText}>
          {JSON.stringify(result, null, 2)}
        </Text>
      </ResultCard>
    );
  };

  const MAX_INPUT = 500;
  const charColor =
    inputText.length > MAX_INPUT * 0.8 ? '#EF4444' : '#94A3B8';

  // options for ToggleSwitch
  const modeOptions = [
    {
      key: 'Translate',
      label: 'Translate',
      icon: 'language-outline',
      LabelComponent: Text,
    },
    {
      key: 'Tutor',
      label: 'Tutor',
      icon: 'school-outline',
      LabelComponent: Text,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* HEADER */}
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={navigation.openDrawer}
            style={styles.menuButton}
          >
            <Ionicons name="menu-outline" size={24} color="#475569" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Language Lab</Text>
            <Text style={styles.subtitle}>
              AI-powered learning assistant
            </Text>
          </View>
          <View style={styles.headerRight} />
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* MODE TOGGLE */}
          <View style={styles.section}>
            <ToggleSwitch
              options={modeOptions}
              selected={mode}
              onSelect={setMode}
              disabled={loading}
            />
          </View>

          {/* LANGUAGE SETTINGS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={18} color="#64748B" />
              <Text style={styles.sectionTitle}>Language Settings</Text>
            </View>
            <LanguageSettings
              sourceLangCode={sourceLangCode}
              targetLangCode={targetLangCode}
              onSwap={swapLanguages}
              onSelectSource={setSourceLangCode}
              onSelectTarget={setTargetLangCode}
              disabled={loading}
            />
          </View>

          {/* RESULTS */}
          <View style={styles.resultsSection}>{renderResult()}</View>
        </ScrollView>

        {/* INPUT */}
        <View style={styles.composerContainer}>
          <View style={styles.composerCard}>
            <TextInput
              style={[
                styles.input,
                inputText.length > 0 && styles.inputActive,
              ]}
              placeholder={
                mode === 'Translate'
                  ? 'Type text to translate...'
                  : 'Ask your language tutor...'
              }
              placeholderTextColor="#9CA3AF"
              multiline
              value={inputText}
              onChangeText={setInputText}
              editable={!loading}
              maxLength={MAX_INPUT}
              textAlignVertical="top"
            />
            <TouchableOpacity
              onPress={handleProcess}
              disabled={!inputText.trim() || loading}
              style={[
                styles.sendButton,
                (!inputText.trim() || loading) && styles.sendButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={
                  !inputText.trim() || loading
                    ? ['#CBD5E1', '#94A3B8']
                    : ['#3B82F6', '#1D4ED8']
                }
                style={styles.sendButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={styles.composerFooter}>
            <Text style={[styles.charCounter, { color: charColor }]}>
              {inputText.length} / {MAX_INPUT}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  menuButton: {
    padding: 8,
    marginLeft: -8,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  headerRight: {
    width: 40,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  resultsSection: { marginTop: 8 },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 8,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  resultCardHighlight: {
    borderColor: '#DBEAFE',
    elevation: 4,
    shadowOpacity: 0.12,
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FAFBFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  resultCardContent: { padding: 20 },
  listenButton: { marginLeft: 12 },
  listenButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  listenButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  translationText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#059669',
    lineHeight: 28,
  },
  tutorResponseText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  bodyText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  correctionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  correctBadge: { backgroundColor: '#059669' },
  incorrectBadge: { backgroundColor: '#DC2626' },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  explanationContainer: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginTop: 12,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  explanationText: {
    color: '#92400E',
    fontSize: 14,
    lineHeight: 20,
  },
  formalityDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  formalityLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 4,
  },
  formalityText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  culturalText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  rawText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  composerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  composerCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    minHeight: 24,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  inputActive: {
    color: '#1E293B',
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.6 },
  composerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  charCounter: {
    fontSize: 12,
    fontWeight: '500',
  },
});

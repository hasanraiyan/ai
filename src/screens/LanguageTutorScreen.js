// src/screens/LanguageTutorScreen.js

import React, { useState, useContext, useEffect, useCallback } from 'react';
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
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';
import { SettingsContext } from '../contexts/SettingsContext';
import { processLanguageRequest } from '../agents/languageAgent';
import { supportedLanguages } from '../constants/languages';
import ScreenHeader from '../components/ScreenHeader';
import ToggleSwitch from '../components/ToggleSwitch';
import LanguageSettings from '../components/LanguageSettings'; // <-- IMPORTED
import { useTheme, spacing, typography } from '../utils/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Internal Components ---

const ListenButton = ({ text, langCode }) => {
  const theme = useTheme();
  const styles = useStyles(theme);
  const { colors } = theme;
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handlePress = async () => {
    if (isSpeaking) return Speech.stop();
    if (!(await Speech.isLanguageAvailableAsync(langCode))) {
      return Alert.alert('Audio Unavailable', 'This language is not available on your device.');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Speech.speak(text, { language: langCode, onStart: () => setIsSpeaking(true), onDone: () => setIsSpeaking(false), onStopped: () => setIsSpeaking(false), onError: () => setIsSpeaking(false) });
  };

  useEffect(() => () => Speech.stop(), []);

  return (
    <TouchableOpacity onPress={handlePress} style={[styles.listenButton, { backgroundColor: isSpeaking ? colors.accent : colors.accent20 }]}>
      <Ionicons name={isSpeaking ? 'stop' : 'volume-high'} size={18} color={isSpeaking ? '#FFF' : colors.accent} />
    </TouchableOpacity>
  );
};

const ResultCard = ({ title, icon, children, color, isRTL, listenText, listenLang, highlight }) => {
  const theme = useTheme();
  const styles = useStyles(theme);
  const { colors } = theme;
  const cardColor = color || colors.accent;

  return (
    <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: highlight ? cardColor : colors.border }]}>
      <View style={[styles.resultCardHeader, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={styles.resultCardTitleContainer}>
          <View style={[styles.iconContainer, { backgroundColor: `${cardColor}1A` }]}>
            <Ionicons name={icon} size={18} color={cardColor} />
          </View>
          <Text style={[styles.resultCardTitle, { color: cardColor }]}>{title}</Text>
        </View>
        {listenText && listenLang && <ListenButton text={listenText} langCode={listenLang} />}
      </View>
      <View style={styles.resultCardContent}>{children}</View>
    </View>
  );
};

// --- Main Screen Component ---

export default function LanguageTutorScreen({ navigation }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useStyles(theme);
  const scheme = useColorScheme();
  const { apiKey, agentModelName } = useContext(SettingsContext);

  const [mode, setMode] = useState('Translate');
  const [inputText, setInputText] = useState('');
  const [sourceLangCode, setSourceLangCode] = useState('en');
  const [targetLangCode, setTargetLangCode] = useState('fr');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const markdownStyles = {
    body: { fontSize: 16, lineHeight: 24, color: colors.text },
    heading1: { ...typography.h1, fontWeight: '700', color: colors.text },
    code_inline: { backgroundColor: colors.emptyBg, color: colors.text, borderRadius: 4, padding: 2 },
    code_block: { backgroundColor: colors.emptyBg, padding: 12, borderRadius: 8, color: colors.text },
  };

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [result, error, loading]);

  useEffect(() => {
    setResult(null);
    setError('');
  }, [mode]);

  const handleProcess = useCallback(async () => {
    Keyboard.dismiss();
    if (!inputText.trim() || loading) return;
    if (!apiKey) return Alert.alert('API Key Missing', 'Please set it in Settings.');

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const response = await processLanguageRequest(apiKey, agentModelName, { text: inputText, sourceLang: sourceLangCode, targetLang: targetLangCode, mode });
      if (!response) throw new Error('Empty response from AI.');
      setResult(response);
      setInputText('');
    } catch (e) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }, [apiKey, agentModelName, inputText, sourceLangCode, targetLangCode, mode, loading]);

  const swapLanguages = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const oldSource = sourceLangCode;
    setSourceLangCode(targetLangCode);
    setTargetLangCode(oldSource);
  }, [sourceLangCode, targetLangCode]);

  const renderResult = () => {
    // ... (renderResult logic remains the same)
    const sourceLangObj = supportedLanguages.find(l => l.code === sourceLangCode) || {};
    const targetLangObj = supportedLanguages.find(l => l.code === targetLangCode) || {};

    if (error) return (
      <View style={[styles.errorContainer, { backgroundColor: colors.card, borderColor: '#FEE2E2' }]}>
        <Ionicons name="alert-circle" size={32} color="#EF4444" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );

    if (loading) return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.stateTitle, { color: colors.text }]}>Analyzing your text...</Text>
        <Text style={[styles.stateSubtitle, { color: colors.subtext }]}>This may take a few moments</Text>
      </View>
    );

    if (!result) return (
      <View style={styles.stateContainer}>
        <View style={[styles.stateIcon, { backgroundColor: colors.accent20 }]}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.accent} />
        </View>
        <Text style={[styles.stateTitle, { color: colors.text }]}>Ready to help you learn!</Text>
        <Text style={[styles.stateSubtitle, { color: colors.subtext }]}>
          {mode === 'Translate' ? 'Translate text and get a detailed analysis' : 'Ask me anything about language learning'}
        </Text>
      </View>
    );

    // Tutor Mode
    if (mode === 'Tutor') {
      const tutorText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return (
        <ResultCard title="AI Tutor Response" icon="school" color="#8B5CF6" isRTL={!!targetLangObj.isRTL} listenText={tutorText} listenLang={targetLangCode} highlight>
          <Markdown style={{ ...markdownStyles, body: { ...markdownStyles.body, textAlign: targetLangObj.isRTL ? 'right' : 'left' } }}>{tutorText}</Markdown>
        </ResultCard>
      );
    }

    // Translate Mode
    if (result.translation) {
      const { translation, inputAnalysis, formality, culturalNotes } = result;
      return (
        <>
          <ResultCard title="Translation" icon="language" color="#059669" isRTL={!!targetLangObj.isRTL} listenText={translation} listenLang={targetLangCode} highlight>
            <Text style={[styles.translationText, targetLangObj.isRTL && { textAlign: 'right' }]}>{translation}</Text>
          </ResultCard>

          <ResultCard title="Grammar Analysis" icon={inputAnalysis.isCorrect ? 'checkmark-circle' : 'alert-circle'} color={inputAnalysis.isCorrect ? '#059669' : '#DC2626'} isRTL={!!sourceLangObj.isRTL} listenText={inputAnalysis.correction} listenLang={sourceLangCode}>
            <Text style={[styles.correctionText, { color: colors.text }, sourceLangObj.isRTL && { textAlign: 'right' }]}>{inputAnalysis.correction || 'Your input seems correct!'}</Text>
            {!inputAnalysis.isCorrect && (
              <View style={[styles.explanationContainer, { backgroundColor: '#FEF9C3', borderLeftColor: '#F59E0B' }]}>
                <Text style={styles.explanationText}>{inputAnalysis.explanation}</Text>
              </View>
            )}
          </ResultCard>

          <ResultCard title="Formality Variations" icon="people" color="#7C3AED" isRTL={!!targetLangObj.isRTL} listenText={`Formal: ${formality.formal}. Informal: ${formality.informal}`} listenLang={targetLangCode}>
            <Text style={[styles.formalityText, { color: colors.text }]}><Text style={styles.formalityLabel}>Formal: </Text>{formality.formal}</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.formalityText, { color: colors.text }]}><Text style={styles.formalityLabel}>Informal: </Text>{formality.informal}</Text>
          </ResultCard>

          <ResultCard title="Cultural Context" icon="globe" color="#F59E0B" isRTL={!!targetLangObj.isRTL}>
            <Text style={[styles.culturalText, { color: colors.text }]}>{culturalNotes || 'No specific cultural notes for this translation.'}</Text>
          </ResultCard>
        </>
      );
    }

    // Fallback for unexpected response
    return <ResultCard title="Unexpected Response" icon="alert-circle" color="#EF4444"><Text style={[styles.bodyText, { color: colors.text }]}>{JSON.stringify(result, null, 2)}</Text></ResultCard>;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={scheme === 'dark' ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScreenHeader navigation={navigation} title="Language Lab" subtitle="AI-powered learning assistant" />
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <ToggleSwitch
              options={[{ key: 'Translate', label: 'Translate', icon: 'language-outline' }, { key: 'Tutor', label: 'Tutor', icon: 'school-outline' }]}
              selected={mode} onSelect={setMode} disabled={loading}
            />
          </View>
          <View style={styles.section}>
            <LanguageSettings // <-- USING THE IMPORTED COMPONENT
              sourceLangCode={sourceLangCode}
              targetLangCode={targetLangCode}
              onSwap={swapLanguages}
              onSelectSource={setSourceLangCode}
              onSelectTarget={setTargetLangCode}
              disabled={loading}
            />
          </View>
          {renderResult()}
        </ScrollView>
        <View style={[styles.composerContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={[styles.composerInner, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput style={[styles.input, { color: colors.text }]} placeholder={mode === 'Translate' ? 'Type text...' : 'Ask your tutor...'} placeholderTextColor={colors.subtext} multiline value={inputText} onChangeText={setInputText} editable={!loading} />
            <TouchableOpacity onPress={handleProcess} disabled={!inputText.trim() || loading} style={[styles.sendButton, (!inputText.trim() || loading) && styles.disabled]}>
              <Ionicons name="arrow-up" size={24} color={'#FFFFFF'} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = ({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContainer: { padding: spacing.md, paddingBottom: spacing.xl },
  section: { marginBottom: spacing.lg },
  disabled: { opacity: 0.5 },
  stateContainer: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.md },
  stateIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { ...typography.h2, fontWeight: '700', textAlign: 'center' },
  stateSubtitle: { ...typography.body, textAlign: 'center', lineHeight: 20 },
  errorContainer: { alignItems: 'center', padding: spacing.lg, borderRadius: 16, borderWidth: 1, gap: spacing.sm },
  errorTitle: { ...typography.h3, fontWeight: '600', color: '#DC2626' },
  errorText: { color: '#DC2626', textAlign: 'center', ...typography.body },
  resultCard: { borderRadius: 16, marginBottom: spacing.md, borderWidth: 1 },
  resultCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  resultCardTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm },
  iconContainer: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  resultCardTitle: { ...typography.h4, fontWeight: '700' },
  resultCardContent: { padding: spacing.md },
  listenButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  translationText: { fontSize: 22, fontWeight: '600', color: '#059669', lineHeight: 30 },
  correctionText: { ...typography.body, lineHeight: 22 },
  explanationContainer: { padding: spacing.md, borderRadius: 12, borderLeftWidth: 4, marginTop: spacing.md },
  explanationText: { color: '#92400E', ...typography.body, lineHeight: 20 },
  formalityText: { ...typography.body, lineHeight: 24 },
  formalityLabel: { fontWeight: '600' },
  culturalText: { ...typography.body, lineHeight: 24 },
  divider: { height: 1, marginVertical: spacing.md },
  composerContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },

  composerInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2, // Android shadow
  },

  input: {
    flex: 1,
    ...typography.body,
    height: 44, // Fixed height for vertical centering
    paddingHorizontal: spacing.sm,
    paddingVertical: 0, // remove vertical padding
    textAlignVertical: 'center', // needed for Android
    color: colors.text,
  },

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    marginLeft: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  sendIcon: {
    tintColor: '#fff',
    width: 20,
    height: 20,
  }
});
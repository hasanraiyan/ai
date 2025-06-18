import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Keyboard,
  Linking,
  ActivityIndicator,
  Pressable,
  Clipboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { DrawerActions } from '@react-navigation/native';

import { SettingsContext } from '../contexts/SettingsContext';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { generateChatTitle, sendMessageToAI } from '../services/aiService';
import TypingIndicator from '../components/TypingIndicator';
import { safetySettings } from '../constants/safetySettings';
import { markdownStyles } from '../styles/markdownStyles';

function ChatThread({ navigation, route }) {
  const { threadId, name } = route.params || {};
  const { modelName, titleModelName, systemPrompt, agentSystemPrompt, apiKey } = useContext(SettingsContext);
  const { threads, updateThreadMessages, renameThread } = useContext(ThreadsContext);
  const thread = threads.find(t => t.id === threadId) || { id: threadId, name: name || 'Chat', messages: [] };
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('chat');
  const listRef = useRef(null);
  const titled = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const scrollToBottom = () => listRef.current?.scrollToEnd({ animated: true });

  const handleGenerateTitle = async firstUserText => {
    try {
      const title = await generateChatTitle(apiKey, titleModelName || 'gemma-3-1b-it', firstUserText);
      if (title) renameThread(threadId, title);
    } catch (e) { console.error("Title generation failed:", e); }
  };

  const sendAI = async text => {
    if (!apiKey) {
      Alert.alert("API Key Missing", "Please set your API Key in Settings to use the AI features.");
      setLoading(false);
      return;
    }
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: `u${Date.now()}`, text, role: 'user', ts };
    const isFirstRealMessage = thread.messages.length === 2;
    const updatedMessages = [...thread.messages, userMsg];
    updateThreadMessages(threadId, updatedMessages);
    setLoading(true);

    const currentSystemPrompt = mode === 'agent' ? agentSystemPrompt : systemPrompt;
    const historyForAPI = thread.messages.map(m => ({ ...m }));
    const systemMessageIndex = historyForAPI.findIndex(m => m.id.startsWith('u-system-'));
    if (systemMessageIndex > -1) {
        historyForAPI[systemMessageIndex].text = currentSystemPrompt;
    }
    
    try {
      const reply = await sendMessageToAI(apiKey, modelName, historyForAPI, text);
      const aiMsg = { id: `a${Date.now()}`, text: reply, role: 'model', ts };
      updateThreadMessages(threadId, [...updatedMessages, aiMsg]);
      if (isFirstRealMessage && !titled.current) {
        handleGenerateTitle(text);
        titled.current = true;
      }
    } catch (e) {
      const errMsgText = e.message.includes("API Key Missing") ? e.message : 'An error occurred while fetching the response.';
      const errMsg = { id: `e${Date.now()}`, text: errMsgText, role: 'model', error: true, ts };
      updateThreadMessages(threadId, [...updatedMessages, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const onSend = () => {
    const t = input.trim();
    if (!t || loading) return;
    setInput('');
    Keyboard.dismiss();
    sendAI(t);
  };

  const onLinkPress = url => {
    Linking.openURL(url).catch(() => { });
    return false;
  };

  const displayMessages = thread.messages.filter((_, idx) => idx > 1);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.chatHeader}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <Ionicons name="arrow-back" size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.chatTitle} numberOfLines={1}>{thread.name}</Text>
       
      </View>
      <View style={styles.modeSelectorContainer}>
        <TouchableOpacity
            style={[styles.modeButton, mode === 'chat' && styles.modeButtonActive]}
            onPress={() => setMode('chat')}
        >
            <Text style={[styles.modeButtonText, mode === 'chat' && styles.modeButtonTextActive]}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
            style={[styles.modeButton, mode === 'agent' && styles.modeButtonActive]}
            onPress={() => setMode('agent')}
        >
            <Text style={[styles.modeButtonText, mode === 'agent' && styles.modeButtonTextActive]}>Agent</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        ref={listRef}
        data={displayMessages}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.chatContent}
        renderItem={({ item }) =>
          <Pressable onLongPress={() => { Clipboard.setString(item.text); }}>
            {item.role === 'user' ? (
              <View style={styles.userRow}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{item.text}</Text>
                  <Text style={styles.time}>{item.ts}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.aiRow}>
                <View style={styles.avatar}>
                  <Ionicons name="sparkles-outline" size={20} color="#6366F1" />
                </View>
                <View style={[styles.aiBubble, item.error && styles.errorBubble]}>
                  {item.error
                    ? <Text style={styles.errorText}>{item.text}</Text>
                    : <Markdown style={markdownStyles} onLinkPress={onLinkPress}>{item.text}</Markdown>
                  }
                  <Text style={[styles.time, item.error && styles.errorTime]}>{item.ts}</Text>
                </View>
              </View>
            )}
          </Pressable>
        }
        ListFooterComponent={loading && <TypingIndicator />}
        keyboardShouldPersistTaps="handled"
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            multiline
            editable={!loading}
          />
          <TouchableOpacity
            onPress={onSend}
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendDisabled]}
            disabled={!input.trim() || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  headerIconButton: { padding: 8 },
  chatTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginHorizontal: 12, flex: 1 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', margin: 8 },
  userBubble: { backgroundColor: '#6366F1', padding: 12, borderRadius: 16, maxWidth: '80%' },
  userText: { color: '#fff', fontSize: 16 },
  aiRow: { flexDirection: 'row', margin: 8, alignItems: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  aiBubble: { backgroundColor: '#fff', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', maxWidth: '80%' },
  errorBubble: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  errorText: { color: '#B91C1C', fontSize: 16 },
  time: { fontSize: 10, color: '#94A3B8', marginTop: 4, alignSelf: 'flex-end' },
  errorTime: { color: '#FCA5A5' },
  chatContent: { padding: 12, paddingBottom: 60 },
  inputRow: { flexDirection: 'row', padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E2E8F0' },
  input: { flex: 1, padding: 12, backgroundColor: '#F1F5F9', borderRadius: 20, marginRight: 8, maxHeight: 100 },
  sendBtn: { backgroundColor: '#6366F1', padding: 12, borderRadius: 20, justifyContent: 'center' },
  sendDisabled: { backgroundColor: '#A5B4FC' },
  modeSelectorContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    padding: 4,
    marginVertical: 10,
  },
  modeButton: {
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  modeButtonActive: {
    backgroundColor: '#6366F1',
  },
  modeButtonText: {
    fontWeight: '600',
    color: '#334155',
    fontSize: 15,
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
});

export default ChatThread;
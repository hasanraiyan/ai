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
import { GoogleGenerativeAI } from '@google/generative-ai';
import Markdown from 'react-native-markdown-display';
import { DrawerActions } from '@react-navigation/native';

import { SettingsContext } from '../contexts/SettingsContext';
import { ThreadsContext } from '../contexts/ThreadsContext';
import TypingIndicator from '../components/TypingIndicator';
import { safetySettings } from '../constants/safetySettings';
import { styles } from '../styles/globalStyles';
import { markdownStyles } from '../styles/markdownStyles';

function ChatThread({ navigation, route }) {
  const { threadId, name } = route.params || {};
  const { modelName, systemPrompt, apiKey } = useContext(SettingsContext);
  const { threads, updateThreadMessages, renameThread } = useContext(ThreadsContext);
  const thread = threads.find(t => t.id === threadId) || { id: threadId, name: name || 'Chat', messages: [] };
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const titled = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const scrollToBottom = () => listRef.current?.scrollToEnd({ animated: true });

  const generateTitle = async firstUserText => {
    try {
      if (!apiKey) return;
      const genAI = new GoogleGenerativeAI(apiKey);
      const prompt = `Generate a short chat title summarizing: "${firstUserText}". Respond only in JSON with a "title" field.`;
      const chat = genAI
        .getGenerativeModel({ model: 'gemma-3-1b-it', safetySettings })
        .startChat({ history: [{ role: 'user', parts: [{ text: prompt }] }] });
      const res = await chat.sendMessage(prompt);
      const raw = await (await res.response).text();
      const match = raw.match(/\{[^]*\}/);
      if (match) {
        const obj = JSON.parse(match[0]);
        if (obj.title) renameThread(threadId, obj.title.trim().slice(0, 30));
      }
    } catch { }
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
    try {
      const history = thread.messages
        .filter(m => !m.error)
        .map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const genAI = new GoogleGenerativeAI(apiKey);
      const chat = genAI.getGenerativeModel({ model: modelName, safetySettings }).startChat({ history });
      const res = await chat.sendMessage(text);
      const reply = await (await res.response).text();
      const aiMsg = { id: `a${Date.now()}`, text: reply, role: 'model', ts };
      updateThreadMessages(threadId, [...updatedMessages, aiMsg]);
      if (isFirstRealMessage && !titled.current) {
        generateTitle(text);
        titled.current = true;
      }
    } catch (e) {
      const errMsg = { id: `e${Date.now()}`, text: 'An error occurred while fetching the response.', role: 'model', error: true, ts };
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
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.headerIconButton}>
          <Ionicons name="menu-outline" size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.chatTitle} numberOfLines={1}>{thread.name}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <Ionicons name="arrow-back" size={24} color="#475569" />
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
            placeholder="Type a message…"
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

export default ChatThread;
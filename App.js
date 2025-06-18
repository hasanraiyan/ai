// this enbale persistane staorage 
// App.js

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useContext,
  createContext,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  Easing,
  StatusBar,
  Keyboard,
  Linking,
  ActivityIndicator,
  Pressable,
  ScrollView // Add ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import Markdown from 'react-native-markdown-display';
import { NavigationContainer, DrawerActions } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';

const { width } = Dimensions.get('window');
const API_KEY = 'AIzaSyDer4H_KDzSsdPpxfXrs6uD6dIZa6UFETk';
const genAI = new GoogleGenerativeAI(API_KEY);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const SettingsContext = createContext();
const ThreadsContext = createContext();

const TypingIndicator = () => {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: -5, duration: 400, delay: i * 150, useNativeDriver: true, easing: Easing.ease }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.ease }),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.aiRow}>
      <View style={styles.avatar}>
        <Ionicons name="sparkles" size={20} color="#6366F1" />
      </View>
      <View style={[styles.aiBubble, styles.typingBubble]}>
        {dots.map((dot, idx) => (
          <Animated.View key={idx} style={[styles.typingDot, { transform: [{ translateY: dot }] }]} />
        ))}
      </View>
    </View>
  );
};

function ChatThread({ navigation, route }) {
  const { threadId, name } = route.params || {};
  const { modelName, systemPrompt } = useContext(SettingsContext);
  const { threads, updateThreadMessages, renameThread } = useContext(ThreadsContext);
  const thread = threads.find(t => t.id === threadId) || { id: threadId, name: name || 'Chat', messages: [] };

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const firstSent = useRef(false);
  const titled = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const scrollToBottom = () => listRef.current?.scrollToEnd({ animated: true });

  const generateTitle = async firstUserText => {
    try {
      const prompt = `Generate a short chat title summarizing: "${firstUserText}". Respond only in JSON with a "title" field.`;
      const chat = genAI
        .getGenerativeModel({ model: 'gemma-3-1b-it', safetySettings })
        .startChat({ history: [{ role: 'user', parts: [{ text: prompt }] }] });
      const res = await chat.sendMessage(prompt);
      const raw = await (await res.response).text();
      const match = raw.match(/\{[^]*\}/);
      if (match) {
        const obj = JSON.parse(match[0]);
        if (obj.title) {
          renameThread(threadId, obj.title.trim().slice(0, 30));
        }
      }
    } catch {}
  };

  const sendAI = async text => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: `u${Date.now()}`, text, role: 'user', ts };
    updateThreadMessages(threadId, [...thread.messages, userMsg]);
    setLoading(true);

    try {
      let history = [...thread.messages, userMsg]
        .filter(m => !m.error)
        .map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const firstUser = history.findIndex(m => m.role === 'user');
      history = history.slice(firstUser === -1 ? 0 : firstUser);
      if (!firstSent.current) {
        history = [{ role: 'user', parts: [{ text: systemPrompt }] }, ...history];
        firstSent.current = true;
      }

      const chat = genAI.getGenerativeModel({ model: modelName, safetySettings }).startChat({ history });
      const res = await chat.sendMessage(text);
      const reply = await (await res.response).text();
      const aiMsg = { id: `a${Date.now()}`, text: reply, role: 'model', ts };
      updateThreadMessages(threadId, [...thread.messages, userMsg, aiMsg]);

      if (!titled.current && thread.messages.length === 0) {
        titled.current = true;
        generateTitle(text);
      }
    } catch {
      const errMsg = { id: `e${Date.now()}`, text: 'Error occurred', role: 'model', error: true, ts };
      updateThreadMessages(threadId, [...thread.messages, userMsg, errMsg]);
    } finally {
      setLoading(false);
      scrollToBottom();
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
    Linking.openURL(url).catch(() => {});
    return false;
  };

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
        data={thread.messages}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.chatContent}
        renderItem={({ item }) =>
          item.role === 'user' ? (
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
          )
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

function ThreadsList({ navigation }) {
  const { threads, createThread } = useContext(ThreadsContext);

  const renderItem = ({ item }) => {
    const last = item.messages[item.messages.length - 1];
    const snippet = last
      ? last.text.slice(0, 40) + (last.text.length > 40 ? '…' : '')
      : 'No messages yet';
    return (
      <TouchableOpacity
        style={styles.threadCard}
        onPress={() => navigation.navigate('Chat', { threadId: item.id, name: item.name })}
      >
        <View style={styles.threadCardContent}>
          <View style={styles.threadIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#6366F1" />
          </View>
          <View style={styles.threadTextContainer}>
            <Text style={styles.threadTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.threadSnippet} numberOfLines={1}>{snippet}</Text>
          </View>
          {last && <Text style={styles.threadTime}>{last.ts}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.listHeader}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.headerIconButton}>
          <Ionicons name="menu-outline" size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.listTitle}>Conversations</Text>
        <TouchableOpacity
          onPress={() => {
            const id = createThread();
            navigation.navigate('Chat', { threadId: id, name: 'New Chat' });
          }}
          style={styles.headerIconButton}
        >
          <Ionicons name="add-circle" size={28} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {threads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No chats yet. Tap + to start.</Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.threadsListContainer}
        />
      )}
    </SafeAreaView>
  );
}

function SettingsScreen({ navigation }) {
  const { modelName, setModelName, systemPrompt, setSystemPrompt } = useContext(SettingsContext);
  const models = ['gemma-3n-e4b-it', 'gemma-3-4b-it', 'gemma-3-12b-it', 'gemma-3-27b-it'];
  // Consider fetching these or making them configurable

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.settingsHeader}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.headerIconButton}>
          <Ionicons name="menu-outline" size={26} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.settingsTitle}>Settings</Text>
        {/* Optional: Add a save button or other actions here if needed */}
      </View>

      <ScrollView contentContainerStyle={styles.settingsScrollView}>
        <View style={styles.settingsCard}>
          <View style={styles.settingsCardHeader}>
            <Ionicons name="options-outline" size={22} color="#6366F1" style={styles.settingsCardIcon} />
            <Text style={styles.settingsCardTitle}>System Instruction</Text>
          </View>
          <TextInput
            style={styles.systemInstructionInput}
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            placeholder="Define the AI's persona and behavior..."
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top" // For Android
          />
          <Text style={styles.settingsCharCount}>{systemPrompt.length} characters</Text>
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingsCardHeader}>
            <Ionicons name="hardware-chip-outline" size={22} color="#6366F1" style={styles.settingsCardIcon} />
            <Text style={styles.settingsCardTitle}>Language Model</Text>
          </View>
          {models.map(m => {
            const isSelected = modelName === m;
            return (
              <Pressable
                key={m}
                style={({ pressed }) => [
                  styles.modelOptionItem,
                  isSelected && styles.modelOptionItemSelected,
                  pressed && styles.modelOptionItemPressed,
                ]}
                onPress={() => setModelName(m)}
                android_ripple={{ color: styles.modelOptionItemSelected.backgroundColor || '#E0E0E0' }}
              >
                <Text style={[styles.modelOptionText, isSelected && styles.modelOptionTextSelected]}>
                  {m}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color="#6366F1" />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Example: Add more settings sections as needed */}
        {/*
        <View style={styles.settingsCard}>
          <View style={styles.settingsCardHeader}>
            <Ionicons name="information-circle-outline" size={22} color="#6366F1" style={styles.settingsCardIcon} />
            <Text style={styles.settingsCardTitle}>About</Text>
          </View>
          <Text style={styles.settingsInfoText}>App Version: 1.0.0</Text>
          <Text style={styles.settingsInfoText}>Developed by YourName</Text>
        </View>
        */}
      </ScrollView>
    </SafeAreaView>
  );
}

function CustomDrawerContent(props) {
  const activeRouteName = props.state.routes[props.state.index].name;

  const navigateToScreen = (screenName) => {
    props.navigation.closeDrawer(); // Close drawer after navigation
    props.navigation.navigate(screenName);
  };

  // Example: Function to handle external links or other actions
  const handleHelpPress = () => {
    props.navigation.closeDrawer();
    // Example: Linking.openURL('https://your-help-page.com');
    // Or navigate to a help screen: props.navigation.navigate('HelpScreen');
    console.log('Help & Feedback pressed');
  };

  const menuItems = [
    {
      name: 'Threads',
      label: 'Threads',
      icon: 'chatbubbles-outline',
      activeIcon: 'chatbubbles',
      action: () => navigateToScreen('Threads'),
    },
    {
      name: 'Settings',
      label: 'Settings',
      icon: 'settings-outline',
      activeIcon: 'settings',
      action: () => navigateToScreen('Settings'),
    },
  ];

  const footerItems = [
    {
      name: 'Help',
      label: 'Help & Feedback',
      icon: 'help-circle-outline',
      action: handleHelpPress,
    },
    // Add more footer items like Logout here
  ];

  const renderDrawerItem = (item, index, isFooter = false) => {
    const isActive = !isFooter && activeRouteName === item.name;
    return (
      <Pressable
        key={item.name || `footer-${index}`}
        style={({ pressed }) => [
          styles.drawerItem,
          isActive && styles.drawerItemActive,
          pressed && styles.drawerItemPressed, // Style for pressed state
        ]}
        onPress={item.action}
        android_ripple={{ color: styles.drawerItemActive.backgroundColor || '#E0E0E0' }}
      >
        <Ionicons
          name={isActive ? item.activeIcon : item.icon}
          size={22}
          color={isActive ? styles.drawerTextActive.color : (isFooter ? styles.drawerFooterIcon.color : styles.drawerIcon.color)}
          style={isFooter ? styles.drawerFooterIcon : styles.drawerIcon}
        />
        <Text style={[
          styles.drawerText,
          isActive && styles.drawerTextActive,
          isFooter && styles.drawerFooterText,
        ]}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContentContainer}>
      <View style={styles.drawerHeaderContainer}>
        {/* You can replace this with your app's logo/icon */}
        <Ionicons name="sparkles-sharp" size={32} color="#6366F1" style={styles.drawerLogo} />
        <Text style={styles.drawerHeaderText}>AI Assistant</Text>
      </View>

      <View style={styles.drawerSection}>
        {menuItems.map((item, index) => renderDrawerItem(item, index))}
      </View>

      <View style={styles.drawerSeparator} />

      <View style={styles.drawerSection}>
        {footerItems.map((item, index) => renderDrawerItem(item, index, true))}
      </View>

      {/* Optional: App Version */}
      <Text style={styles.appVersionText}>Version 1.0.0</Text>
    </DrawerContentScrollView>
  );
}

const Drawer = createDrawerNavigator();

export default function App() {
  const [modelName, setModelName] = useState('gemma-3-27b-it');
  const [systemPrompt, setSystemPrompt] = useState('You are Arya, a friendly and insightful AI assistant...');
  const [threads, setThreads] = useState([]);
  const [ready, setReady] = useState(false);

  // Hydrate from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const [m, s, t] = await Promise.all([
          AsyncStorage.getItem('@modelName'),
          AsyncStorage.getItem('@systemPrompt'),
          AsyncStorage.getItem('@threads'),
        ]);
        if (m) setModelName(m);
        if (s) setSystemPrompt(s);
        if (t) setThreads(JSON.parse(t));
      } catch {}
      setReady(true);
    })();
  }, []);

  // Persist changes
  useEffect(() => { AsyncStorage.setItem('@modelName', modelName); }, [modelName]);
  useEffect(() => { AsyncStorage.setItem('@systemPrompt', systemPrompt); }, [systemPrompt]);
  useEffect(() => { AsyncStorage.setItem('@threads', JSON.stringify(threads)); }, [threads]);

  const createThread = () => {
    const id = Date.now().toString();
    setThreads(prev => [...prev, { id, name: 'New Chat', messages: [] }]);
    return id;
  };
  const updateThreadMessages = (threadId, messages) =>
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, messages } : t));
  const renameThread = (threadId, name) =>
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, name } : t));

  if (!ready) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    );
  }

  return (
    <SettingsContext.Provider value={{ modelName, setModelName, systemPrompt, setSystemPrompt }}>
      <ThreadsContext.Provider value={{ threads, createThread, updateThreadMessages, renameThread }}>
        <SafeAreaProvider>
          <NavigationContainer>
            <Drawer.Navigator
              drawerContent={props => <CustomDrawerContent {...props} />}
              screenOptions={{ headerShown: false, drawerType: 'slide' }}
            >
              <Drawer.Screen name="Threads" component={ThreadsList} />
              <Drawer.Screen name="Chat" component={ChatThread} />
              <Drawer.Screen name="Settings" component={SettingsScreen} />
            </Drawer.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </ThreadsContext.Provider>
    </SettingsContext.Provider>
  );
}

const markdownStyles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24, color: '#334155' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  // Chat header
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerIconButton: { padding: 8 },
  chatTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginHorizontal: 12, flex: 1 },

  // Message rows
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', margin: 8 },
  userBubble: {
    backgroundColor: '#6366F1',
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },
  userText: { color: '#fff', fontSize: 16 },
  aiRow: { flexDirection: 'row', margin: 8, alignItems: 'flex-end' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  aiBubble: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: '80%',
  },
  errorBubble: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  errorText: { color: '#B91C1C', fontSize: 16 },
  time: { fontSize: 10, color: '#94A3B8', marginTop: 4, alignSelf: 'flex-end' },
  errorTime: { color: '#FCA5A5' },
  chatContent: { padding: 12, paddingBottom: 60 },

  // Typing indicator
  typingBubble: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: 40,
  },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8', margin: 3 },

  // Input
  inputRow: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    marginRight: 8,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#6366F1',
    padding: 12,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: '#A5B4FC' },

  // Threads list header
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  threadsListContainer: { paddingVertical: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 8, fontSize: 16, color: '#64748B' },

  // Thread card
  threadCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2 },
    }),
  },
  threadCardContent: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  threadIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  threadTextContainer: { flex: 1 },
  threadTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  threadSnippet: { fontSize: 14, color: '#64748B', marginTop: 4 },
  threadTime: { fontSize: 12, color: '#94A3B8', marginLeft: 8 },

  // Settings
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12, // Adjusted padding
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#fff', // Ensure header has a background
  },
  settingsTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginLeft: 16 }, // Increased size and margin
  settingsScrollView: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16, // Use marginBottom for spacing between cards
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2 },
    }),
  },
  settingsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingsCardIcon: {
    marginRight: 10,
  },
  settingsCardTitle: { fontSize: 17, fontWeight: '600', color: '#1E293B' }, // Slightly larger title
  systemInstructionInput: { // Renamed from systemInput for clarity
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 12,
    minHeight: 100, // Increased minHeight
    textAlignVertical: 'top',
    color: '#1E293B',
    fontSize: 15, // Adjusted font size
    lineHeight: 20, // Added line height
  },
  settingsCharCount: { textAlign: 'right', fontSize: 12, color: '#64748B', marginTop: 8 }, // Renamed and adjusted margin
  modelOptionItem: { // Renamed from modelRow
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14, // Increased padding
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    marginBottom: 8,
  },
  modelOptionItemSelected: { backgroundColor: '#EEF2FF' }, // Renamed from modelRowSel
  modelOptionItemPressed: { backgroundColor: '#E0E7FF' }, // Added pressed state
  modelOptionText: { fontSize: 15, color: '#334155' }, // Renamed and adjusted size
  modelOptionTextSelected: { fontWeight: '600', color: '#1E293B' }, // Renamed
  settingsInfoText: { fontSize: 14, color: '#475569', marginBottom: 6},

  // Drawer
  drawerContentContainer: {
    flex: 1,
    backgroundColor: '#fff',
    // paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight, // Consider SafeAreaView or manual padding
  },
  drawerHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  drawerLogo: { marginRight: 15 },
  drawerHeaderText: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  drawerSection: {
    marginTop: 10,
    marginBottom: 5,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12, // Slightly reduced padding for more items
    paddingHorizontal: 20,
    marginHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2, // Reduced margin
  },
  drawerItemActive: { backgroundColor: '#EEF2FF' }, // Light primary color
  drawerItemPressed: { backgroundColor: '#E0E7FF' }, // Slightly darker for press feedback
  drawerIcon: { marginRight: 18, color: '#475569' },
  drawerText: { fontSize: 15, color: '#334155', fontWeight: '500' },
  drawerTextActive: { color: '#6366F1', fontWeight: '600' }, // Primary color
  drawerSeparator: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 20, marginVertical: 10 },
  drawerFooterIcon: { marginRight: 18, color: '#64748B' },
  drawerFooterText: { fontSize: 14, color: '#475569', fontWeight: 'normal' },
  appVersionText: { textAlign: 'center', color: '#94A3B8', fontSize: 12, paddingVertical: 15, marginTop: 'auto' },
});

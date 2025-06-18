
import React, { useState, useEffect, useContext } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

import { SettingsContext } from './src/contexts/SettingsContext';
import { ThreadsContext } from './src/contexts/ThreadsContext';
import ChatThread from './src/screens/ChatThread';
import ThreadsList from './src/screens/ThreadsList';
import SettingsScreen from './src/screens/SettingsScreen';
import CustomDrawerContent from './src/navigation/CustomDrawerContent';
import { styles } from './src/styles/globalStyles'; // For WelcomeModal and loading indicator

const Drawer = createDrawerNavigator();

export default function App() {
  const [modelName, setModelName] = useState('gemma-3-27b-it');
  const [systemPrompt, setSystemPrompt] = useState('You are Arya, a friendly and insightful AI assistant with a touch of wit and warmth. You speak in a conversational, relatable tone—like a clever Gen Z friend who’s also secretly a professor. You’re respectful, humble when needed, but never afraid to speak the truth. You\'re helpful, curious, and love explaining things in a clear, creative way. Keep your answers accurate, helpful, and full of personality. Never act robotic—be real, be Arya.');
  const [threads, setThreads] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [ready, setReady] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const [m, s, t, ak, seen] = await Promise.all([
          AsyncStorage.getItem('@modelName'),
          AsyncStorage.getItem('@systemPrompt'),
          AsyncStorage.getItem('@threads'),
          AsyncStorage.getItem('@apiKey'),
          AsyncStorage.getItem('@seenWelcome'),
        ]);
        if (m) setModelName(m);
        if (s) setSystemPrompt(s);
        if (t) setThreads(JSON.parse(t));
        if (ak) setApiKey(ak);
        if (!seen) setShowWelcome(true);
      } catch { }
      setReady(true);
    })();
  }, []);
  useEffect(() => { AsyncStorage.setItem('@modelName', modelName); }, [modelName]);
  useEffect(() => { AsyncStorage.setItem('@systemPrompt', systemPrompt); }, [systemPrompt]);
  useEffect(() => { AsyncStorage.setItem('@threads', JSON.stringify(threads)); }, [threads]);
  useEffect(() => { AsyncStorage.setItem('@apiKey', apiKey); }, [apiKey]);
  const createThread = () => {
    const id = Date.now().toString();
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const initialMessages = [
      {
        id: `u-system-${id}`,
        text: systemPrompt,
        role: 'user',
        ts,
      },
      {
        id: `a-system-${id}`,
        text: "Understood. I'm ready to assist you as Arya. How can I help you today?",
        role: 'model',
        ts,
      },
    ];
    const newThread = { id, name: 'New Chat', messages: initialMessages };
    setThreads(prev => [...prev, newThread]);
    return id;
  };
  const updateThreadMessages = (threadId, messages) =>
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, messages } : t));
  const renameThread = (threadId, name) =>
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, name } : t));
  const deleteThread = threadId =>
    setThreads(prev => prev.filter(t => t.id !== threadId));
  const closeWelcome = () => {
    setShowWelcome(false);
    AsyncStorage.setItem('@seenWelcome', '1').catch(() => { });
  };
  if (!ready) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    );
  }
  return (
    <SettingsContext.Provider value={{ modelName, setModelName, systemPrompt, setSystemPrompt, apiKey, setApiKey }}>
      <ThreadsContext.Provider value={{ threads, createThread, updateThreadMessages, renameThread, deleteThread }}>
        <SafeAreaProvider>
          <NavigationContainer>
            <Drawer.Navigator drawerContent={props => <CustomDrawerContent {...props} />} screenOptions={{ headerShown: false, drawerType: 'slide' }}>
              <Drawer.Screen name="Threads" component={ThreadsList} />
              <Drawer.Screen name="Chat" component={ChatThread} />
              <Drawer.Screen name="Settings" component={SettingsScreen} />
            </Drawer.Navigator>
          </NavigationContainer>
          <Modal transparent visible={showWelcome} animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.welcomeModal}>
                <Ionicons name="sparkles-sharp" size={36} color="#6366F1" style={{ alignSelf: 'center', marginBottom: 12 }} />
                <Text style={styles.welcomeTitle}>Welcome to AI Assistant</Text>
                <Text style={styles.welcomeText}>
                  To get started, you'll need a Google AI API Key. This key lets the app communicate with the Gemma language model.
                </Text>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary, { alignSelf: 'stretch', marginTop: 16 }]}
                  onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey').catch(() => { })}
                >
                  <Text style={styles.modalButtonText}>Get API Key</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary, { alignSelf: 'stretch', marginTop: 12 }]}
                  onPress={closeWelcome}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>Maybe Later</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </SafeAreaProvider>
      </ThreadsContext.Provider>
    </SettingsContext.Provider>
  );
}

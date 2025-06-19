import React, { useState, useEffect } from 'react';
import {
  Text, // Keep Text import just in case, although it's mostly used in children
  View,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Toast from 'react-native-toast-message'; // Import Toast

import { SettingsContext } from './src/contexts/SettingsContext';
import { ThreadsContext } from './src/contexts/ThreadsContext';
import ChatThread from './src/screens/ChatThread';
import ThreadsList from './src/screens/ThreadsList';
import SettingsScreen from './src/screens/SettingsScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import ImageGenerationScreen from './src/screens/ImageGenerationScreen'; // Import the new screen
import CustomDrawerContent from './src/navigation/CustomDrawerContent';
import { toolMetadata } from './src/services/tools';
import { generateAgentPrompt } from './src/prompts/agentPrompt';

const Drawer = createDrawerNavigator();
const { width } = Dimensions.get('window');

export default function App() {
  // These are default states, the actual values are loaded from AsyncStorage
  const [modelName, setModelName] = useState('gemma-3-27b-it');
  const [titleModelName, setTitleModelName] = useState('gemma-3-1b-it');
  const [agentModelName, setAgentModelName] = useState('gemma-3-27b-it');
  const [systemPrompt, setSystemPrompt] = useState(
    "You are Arya, a friendly and insightful AI assistant with a touch of wit and warmth. You speak in a conversational, relatable tone like a clever Gen Z friend who's also secretly a professor. You're respectful, humble when needed, but never afraid to speak the truth. You're helpful, curious, and love explaining things in a clear, creative way. Keep your answers accurate, helpful, and full of personality. Never act roboticâ€”be real, be Arya."
  );

  const initialEnabledTools = toolMetadata.reduce((acc, tool) => ({ ...acc, [tool.agent_id]: true }), {});
  const [enabledTools, setEnabledTools] = useState(initialEnabledTools);
  // agentSystemPrompt is derived, not stored directly
  const [agentSystemPrompt, setAgentSystemPrompt] = useState('');

  const [threads, setThreads] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [ready, setReady] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Effect to update the agent system prompt whenever enabledTools or agentModel changes
  useEffect(() => {
    setAgentSystemPrompt(generateAgentPrompt(enabledTools, agentModelName));
  }, [enabledTools, agentModelName]);

  // Effect to load state from AsyncStorage on app start
  useEffect(() => {
    (async () => {
      try {
        const [
          m,
          tm,
          am,
          s,
          t,
          ak,
          seen,
          et,
        ] = await Promise.all([
          AsyncStorage.getItem('@modelName'),
          AsyncStorage.getItem('@titleModelName'),
          AsyncStorage.getItem('@agentModelName'),
          AsyncStorage.getItem('@systemPrompt'),
          AsyncStorage.getItem('@threads'),
          AsyncStorage.getItem('@apiKey'),
          AsyncStorage.getItem('@seenWelcome'),
          AsyncStorage.getItem('@enabledTools'),
        ]);
        // Update state only if loaded value is not null
        if (m !== null) setModelName(m);
        if (tm !== null) setTitleModelName(tm);
        if (am !== null) setAgentModelName(am);
        if (s !== null) setSystemPrompt(s);
        if (t !== null) setThreads(JSON.parse(t));
        if (ak !== null) setApiKey(ak);
        if (et !== null) {
          const savedTools = JSON.parse(et);
          // Merge saved tools with initial defaults, prioritizing saved
          setEnabledTools(prev => ({ ...prev, ...savedTools }));
        }
        // Only show welcome if it hasn't been seen before
        if (!seen) setShowWelcome(true);
      } catch (e) {
        console.warn('Error loading AsyncStorage:', e);
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('@modelName', modelName);
  }, [modelName]);

  useEffect(() => {
    AsyncStorage.setItem('@titleModelName', titleModelName);
  }, [titleModelName]);

  useEffect(() => {
    AsyncStorage.setItem('@agentModelName', agentModelName);
  }, [agentModelName]);

  useEffect(() => {
    AsyncStorage.setItem('@systemPrompt', systemPrompt);
  }, [systemPrompt]);

  useEffect(() => {
    AsyncStorage.setItem('@enabledTools', JSON.stringify(enabledTools));
  }, [enabledTools]);

  useEffect(() => {
    AsyncStorage.setItem('@threads', JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    AsyncStorage.setItem('@apiKey', apiKey);
  }, [apiKey]);

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
    setThreads(prev => [newThread, ...prev]);
    return id;
  };

  const updateThreadMessages = (threadId, messages) =>
    setThreads(prev => {
      const threadToUpdate = prev.find(t => t.id === threadId);
      if (!threadToUpdate) {
        return prev;
      }
      const updatedThread = { ...threadToUpdate, messages };
      const otherThreads = prev.filter(t => t.id !== threadId);
      return [updatedThread, ...otherThreads];
    });

  const renameThread = (threadId, name) =>
    setThreads(prev => prev.map(t => (t.id === threadId ? { ...t, name } : t)));

  const deleteThread = threadId => setThreads(prev => prev.filter(t => t.id !== threadId));

  const clearAllThreads = () => {
    setThreads([]);
  };

  const closeWelcome = () => {
    setShowWelcome(false);
    AsyncStorage.setItem('@seenWelcome', '1').catch(() => {});
  };

  if (!ready) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#6366F1" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SettingsContext.Provider
        value={{
          modelName,
          setModelName,
          titleModelName,
          setTitleModelName,
          agentModelName,
          setAgentModelName,
          systemPrompt,
          setSystemPrompt,
          agentSystemPrompt,
          enabledTools,
          setEnabledTools,
          apiKey,
          setApiKey,
        }}
      >
        <ThreadsContext.Provider
          value={{
            threads,
            createThread,
            updateThreadMessages,
            renameThread,
            deleteThread,
            clearAllThreads,
          }}
        >
          <StatusBar barStyle="dark-content" />
          <NavigationContainer>
            <Drawer.Navigator
              drawerContent={props => <CustomDrawerContent {...props} />}
              screenOptions={{ headerShown: false, drawerType: 'slide' }}
            >
              <Drawer.Screen name="Threads" component={ThreadsList} />
              <Drawer.Screen name="Chat" component={ChatThread} />
              <Drawer.Screen name="ImageGeneration" component={ImageGenerationScreen} options={{ title: 'Generate Image' }} />
              <Drawer.Screen name="Gallery" component={GalleryScreen} />
              <Drawer.Screen name="Settings" component={SettingsScreen} />
            </Drawer.Navigator>
          </NavigationContainer>
          <Modal transparent visible={showWelcome} animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.welcomeModal}>
                <Ionicons
                  name="sparkles-sharp"
                  size={36}
                  color="#6366F1"
                  style={{ alignSelf: 'center', marginBottom: 12 }}
                />
                <Text style={styles.welcomeTitle}>Welcome to AI Assistant</Text>
                <Text style={styles.welcomeText}>
                  To get started, you'll need a Google AI API Key. This key lets the app communicate
                  with the Gemma language model.
                </Text>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary, { alignSelf: 'stretch', marginTop: 16 }]}
                  onPress={() =>
                    Linking.openURL('https://aistudio.google.com/app/apikey').catch(() => {})
                  }
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
        </ThreadsContext.Provider>
      </SettingsContext.Provider>
      {/* Toast needs to be at the root of the component tree or inside a Provider */}
      <Toast position="bottom" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  welcomeModal: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 12, padding: 24 },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', textAlign: 'center', marginBottom: 12 },
  welcomeText: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22 },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginLeft: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonPrimary: { backgroundColor: '#6366F1' },
  modalButtonSecondary: { backgroundColor: '#E2E8F0' },
  modalButtonText: { fontSize: 16, color: '#fff', fontWeight: '500' },
  modalButtonTextSecondary: { color: '#334155' },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' }, // Added styles for loading
});
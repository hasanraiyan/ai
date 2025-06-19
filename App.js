// src/App.js

import React, { useState, useEffect } from 'react';
import {
  Text,
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
import Toast from 'react-native-toast-message';

import { SettingsContext } from './src/contexts/SettingsContext';
import { ThreadsContext } from './src/contexts/ThreadsContext';
import { useSettings } from './src/hooks/useSettings';
import { useThreads } from './src/hooks/useThreads';

import ChatThread from './src/screens/ChatThread';
import ThreadsList from './src/screens/ThreadsList';
import SettingsScreen from './src/screens/SettingsScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import LanguageTutorScreen from './src/screens/LanguageTutorScreen';
import ImageGenerationScreen from './src/screens/ImageGenerationScreen';
import AllThreadsScreen from './src/screens/AllThreadsScreen';
import CustomDrawerContent from './src/navigation/CustomDrawerContent';

const Drawer = createDrawerNavigator();
const { width } = Dimensions.get('window');

export default function App() {
  const settingsValue = useSettings();
  const threadsValue = useThreads(settingsValue.systemPrompt);

  const [showWelcome, setShowWelcome] = useState(false);
  const ready = settingsValue.settingsReady && threadsValue.threadsReady;

  useEffect(() => {
    (async () => {
      const seenWelcome = await AsyncStorage.getItem('@seenWelcome');
      if (!seenWelcome) {
        setShowWelcome(true);
      }
    })();
  }, []);


  const closeWelcome = () => {
    setShowWelcome(false);
    AsyncStorage.setItem('@seenWelcome', '1').catch(() => { });
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
      <SettingsContext.Provider value={settingsValue}>
        <ThreadsContext.Provider value={threadsValue}>
          <StatusBar barStyle="dark-content" />
          <NavigationContainer>
            <Drawer.Navigator
              drawerContent={props => <CustomDrawerContent {...props} />}
              screenOptions={{ headerShown: false, drawerType: 'slide' }}
            >
              <Drawer.Screen name="Threads" component={ThreadsList} options={{ title: 'Arya' }} />
              <Drawer.Screen name="Chat" component={ChatThread} />
              <Drawer.Screen name="ImageGeneration" component={ImageGenerationScreen} options={{ title: 'Generate Image' }} />
              <Drawer.Screen name="LanguageTutor" component={LanguageTutorScreen} options={{ title: 'Language Tutor' }} />
              <Drawer.Screen name="Gallery" component={GalleryScreen} />
              <Drawer.Screen name="Settings" component={SettingsScreen} />
              <Drawer.Screen name="AllThreads" component={AllThreadsScreen} options={{ drawerItemStyle: { height: 0 } }} />
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
        </ThreadsContext.Provider>
      </SettingsContext.Provider>
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
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, marginLeft: 10, minWidth: 80, alignItems: 'center' },
  modalButtonPrimary: { backgroundColor: '#6366F1' },
  modalButtonSecondary: { backgroundColor: '#E2E8F0' },
  modalButtonText: { fontSize: 16, color: '#fff', fontWeight: '500' },
  modalButtonTextSecondary: { color: '#334155' },
});
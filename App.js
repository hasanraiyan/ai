// src/App.js

import React, { useState, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Toast from 'react-native-toast-message';

import { SettingsContext } from './src/contexts/SettingsContext';
import { ThreadsContext } from './src/contexts/ThreadsContext';
import { CharactersContext } from './src/contexts/CharactersContext';
import { useSettings } from './src/hooks/useSettings';
import { useThreads } from './src/hooks/useThreads';
import { useCharacters } from './src/hooks/useCharacters';

import ThreadsList from './src/screens/ThreadsList';
import ChatThread from './src/screens/ChatThread';
import SettingsScreen from './src/screens/SettingsScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import ImageGenerationScreen from './src/screens/ImageGenerationScreen';
import AllThreadsScreen from './src/screens/AllThreadsScreen';
import CustomDrawerContent from './src/navigation/CustomDrawerContent';
import CharacterSelectScreen from './src/screens/CharacterSelectScreen';
import CharacterEditorScreen from './src/screens/CharacterEditorScreen';
import LanguageTutorScreen from './src/screens/LanguageTutorScreen';

const Drawer = createDrawerNavigator();

export default function App() {
  const settingsValue = useSettings();
  // --- FIX: Remove the systemPrompt dependency ---
  const threadsValue = useThreads(); 
  const charactersValue = useCharacters();

  const ready = settingsValue.settingsReady && threadsValue.threadsReady && charactersValue.charactersReady;

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
        <CharactersContext.Provider value={charactersValue}>
          <ThreadsContext.Provider value={threadsValue}>
            <StatusBar barStyle="dark-content" />
            <NavigationContainer>
              <Drawer.Navigator
                drawerContent={props => <CustomDrawerContent {...props} />}
                screenOptions={{ headerShown: false, drawerType: 'slide' }}
              >
                <Drawer.Screen name="Threads" component={ThreadsList} options={{ title: 'Dashboard' }} />
                <Drawer.Screen name="Chat" component={ChatThread} />
                <Drawer.Screen name="Characters" component={CharacterSelectScreen} options={{ title: 'Characters' }} />
                <Drawer.Screen name="ImageGeneration" component={ImageGenerationScreen} options={{ title: 'Generate Image' }} />
                <Drawer.Screen name="LanguageTutor" component={LanguageTutorScreen} options={{ title: 'Language Tutor' }} />
                <Drawer.Screen name="Gallery" component={GalleryScreen} />
                <Drawer.Screen name="Settings" component={SettingsScreen} />
                <Drawer.Screen name="AllThreads" component={AllThreadsScreen} options={{ drawerItemStyle: { height: 0 } }} />
                <Drawer.Screen name="CharacterEditor" component={CharacterEditorScreen} options={{ drawerItemStyle: { height: 0 } }} />
              </Drawer.Navigator>
            </NavigationContainer>
          </ThreadsContext.Provider>
        </CharactersContext.Provider>
      </SettingsContext.Provider>
      <Toast position="bottom" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
});
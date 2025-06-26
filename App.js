// src/App.js

import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Toast from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';

import { SettingsContext } from './src/contexts/SettingsContext';
import { ThreadsContext } from './src/contexts/ThreadsContext';
import { CharactersContext } from './src/contexts/CharactersContext';
import { FinanceProvider } from './src/contexts/FinanceContext';
import { useSettings } from './src/hooks/useSettings';
import { useThreads } from './src/hooks/useThreads';
import { useCharacters } from './src/hooks/useCharacters';
import { useTheme } from './src/utils/theme';

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
import FinanceScreen from './src/screens/FinanceScreen'; // --- NEW ---

const Drawer = createDrawerNavigator();

const LoadingIndicator = () => {
  const theme = useTheme();
  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const ThemeWrapper = ({ children }) => {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style="auto" />
      {children}
    </View>
  );
};

export default function App() {
  const settingsValue = useSettings();
  const threadsValue = useThreads();
  const charactersValue = useCharacters();
  const ready = settingsValue.settingsReady && threadsValue.threadsReady && charactersValue.charactersReady;

  if (!ready) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaProvider>
      <SettingsContext.Provider value={settingsValue}>
        <CharactersContext.Provider value={charactersValue}>
          <ThreadsContext.Provider value={threadsValue}>
            <FinanceProvider>
              <ThemeWrapper>
                <NavigationContainer>
                  <Drawer.Navigator
                    drawerContent={props => <CustomDrawerContent {...props} />}
                    screenOptions={{ headerShown: false, drawerType: 'slide' }}
                  >
                    <Drawer.Screen name="Threads" component={ThreadsList} options={{ title: 'Dashboard' }} />
                    <Drawer.Screen name="Chat" component={ChatThread} />
                    <Drawer.Screen name="Characters" component={CharacterSelectScreen} options={{ title: 'Characters' }} />
                    <Drawer.Screen name="Finance" component={FinanceScreen} options={{ title: 'Finance' }} />
                    <Drawer.Screen name="ImageGeneration" component={ImageGenerationScreen} options={{ title: 'Generate Image' }} />
                    <Drawer.Screen name="LanguageTutor" component={LanguageTutorScreen} options={{ title: 'Language Tutor' }} />
                    <Drawer.Screen name="Gallery" component={GalleryScreen} />
                    <Drawer.Screen name="Settings" component={SettingsScreen} />
                    <Drawer.Screen name="AllThreads" component={AllThreadsScreen} options={{ drawerItemStyle: { height: 0 } }} />
                    <Drawer.Screen name="CharacterEditor" component={CharacterEditorScreen} options={{ drawerItemStyle: { height: 0 } }} />
                  </Drawer.Navigator>
                </NavigationContainer>
                <Toast position="bottom" />
              </ThemeWrapper>
            </FinanceProvider>
          </ThreadsContext.Provider>
        </CharactersContext.Provider>
      </SettingsContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
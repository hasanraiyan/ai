// src/screens/ThreadsList.js

import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { CharactersContext } from '../contexts/CharactersContext'; // <-- Import Characters
import { useTheme, spacing, typography } from '../utils/theme';
import ScreenHeader from '../components/ScreenHeader';

const IMAGE_DIR = `${FileSystem.documentDirectory}ai_generated_images/`;
const { width: screenWidth } = Dimensions.get('window');

// --- Reusable Section Component ---
const DashboardSection = React.memo(({ title, children, onSeeAll, seeAllLabel = "See All" }) => {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity
            onPress={onSeeAll}
            accessibilityRole="button"
            accessibilityLabel={`See all ${title}`}
            style={styles.seeAllButton}
          >
            <Text style={[styles.seeAllText, { color: colors.accent }]}>{seeAllLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      </View>
      <View>{children}</View>
    </View>
  );
});

// --- Quick Actions ---
const QuickActions = ({ navigation }) => {
  const { colors } = useTheme();
  const actions = useMemo(() => [
    { title: 'New Chat', icon: 'chatbubble-ellipses-outline', screen: 'NewGenericChat', description: 'Start fresh' },
    { title: 'Generate Image', icon: 'image-outline', screen: 'ImageGeneration', description: 'Create art' },
    { title: 'Language Tutor', icon: 'language-outline', screen: 'LanguageTutor', description: 'Learn languages' },
  ], []);

  return (
    <DashboardSection title="Quick Actions">
      <View style={styles.quickActionsGrid}>
        {actions.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={[ styles.qaCard, { backgroundColor: colors.card, borderColor: colors.border } ]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.8}
          >
            <View style={[styles.qaIconContainer, { backgroundColor: colors.accent20 }]}>
              <Ionicons name={item.icon} size={28} color={colors.accent} />
            </View>
            <View>
              <Text style={[styles.qaTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.qaDescription, { color: colors.subtext }]} numberOfLines={1}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </DashboardSection>
  );
};

// --- NEW: Selectable Characters Section ---
const SelectableCharacters = ({ navigation }) => {
    const { characters } = useContext(CharactersContext);
    const { createThread } = useContext(ThreadsContext);
    const { colors } = useTheme();

    const handleSelectCharacter = (character) => {
        const initialMessages = [
            { id: `u-system-${Date.now()}`, text: character.systemPrompt, role: 'user', isHidden: true },
            { id: `a-system-${Date.now()}`, text: character.greeting, role: 'model', characterId: character.id },
        ];
        const newThreadId = createThread(character.name, initialMessages, character.id);
        navigation.navigate('Chat', { threadId: newThreadId, name: character.name });
    };

    return (
        <DashboardSection title="Start a Chat" onSeeAll={() => navigation.navigate('Characters')}>
            <FlatList
                data={characters.slice(0, 8)} // Show up to 8 characters
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing.md }}
                keyExtractor={item => item.id}
                renderItem={({ item, index }) => (
                    <TouchableOpacity
                        onPress={() => handleSelectCharacter(item)}
                        style={[styles.charCard, { 
                            marginRight: index === characters.slice(0, 8).length - 1 ? 0 : spacing.sm,
                            backgroundColor: colors.card
                        }]}
                    >
                        <Image
                            source={{ uri: item.avatarUrl }}
                            style={[styles.charAvatar, { backgroundColor: colors.imagePlaceholder }]}
                        />
                        <Text style={[styles.charName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    </TouchableOpacity>
                )}
            />
        </DashboardSection>
    );
};

// --- (PinnedMessages and RecentImages components remain unchanged) ---
const PinnedMessages = ({ navigation }) => {
  const { pinnedMessages } = useContext(ThreadsContext);
  const { colors } = useTheme();

  if (!pinnedMessages || pinnedMessages.length === 0) {
    return (
      <DashboardSection title="Pinned Messages">
        <View style={[styles.emptySection, { backgroundColor: colors.emptyBg }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.accent20 }]}>
            <Ionicons name="pin-outline" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.emptySectionText, { color: colors.subtext }]}>
            Pin important messages in a chat to see them here for quick access.
          </Text>
        </View>
      </DashboardSection>
    );
  }

  const items = pinnedMessages.slice(0, 3);

  return (
    <DashboardSection title="Pinned Messages">
      <View style={{ paddingHorizontal: spacing.md }}>
        {items.map(({ threadId, threadName, message }, index) => (
          <TouchableOpacity
            key={message.id}
            style={[
              styles.pinCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginBottom: index === items.length - 1 ? 0 : spacing.sm,
              }
            ]}
            onPress={() => navigation.navigate('Chat', { threadId, name: threadName })}
            activeOpacity={0.7}
          >
            <View style={styles.pinHeader}>
              <Ionicons name="pin" size={16} color={colors.accent} />
              <Text style={[styles.pinSource, { color: colors.subtext }]}>
                {threadName}
              </Text>
            </View>
            <Text style={[styles.pinText, { color: colors.text }]} numberOfLines={3}>
              {message.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </DashboardSection>
  );
};

const RecentImages = ({ navigation }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  const loadRecentImages = useCallback(async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
      if (!dirInfo.exists) {
        setImages([]);
        return;
      }
      const files = await FileSystem.readDirectoryAsync(IMAGE_DIR);
      const imageFiles = files.filter(f => /\.(jpe?g|png)$/i.test(f));
      const data = await Promise.all(
        imageFiles.map(async fn => {
          const info = await FileSystem.getInfoAsync(IMAGE_DIR + fn, { size: false });
          return { id: fn, uri: IMAGE_DIR + fn, time: info.modificationTime || 0 };
        })
      );
      data.sort((a, b) => b.time - a.time);
      setImages(data.slice(0, 6));
    } catch (e) {
      console.error("Couldn't load recent images:", e);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadRecentImages);
    loadRecentImages();
    return unsub;
  }, [navigation, loadRecentImages]);

  return (
    <DashboardSection title="Recent Images" onSeeAll={() => navigation.navigate('Gallery')}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : images.length === 0 ? (
        <View style={[styles.emptySection, { backgroundColor: colors.emptyBg }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.accent20 }]}>
            <Ionicons name="images-outline" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.emptySectionText, { color: colors.subtext }]}>
            Use the "Generate Image" action to create your first AI masterpiece.
          </Text>
        </View>
      ) : (
        <FlatList
          data={images}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md }}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Gallery')}
              style={{ marginRight: index === images.length - 1 ? 0 : spacing.sm }}
            >
              <Image
                source={{ uri: item.uri }}
                style={[
                  styles.riImage,
                  { backgroundColor: colors.imagePlaceholder }
                ]}
              />
            </TouchableOpacity>
          )}
        />
      )}
    </DashboardSection>
  );
};


// --- UPGRADED: Recent Conversations Section ---
const RecentConversations = ({ navigation }) => {
  const { threads } = useContext(ThreadsContext);
  const { characters } = useContext(CharactersContext);
  const { colors } = useTheme();
  const recentThreads = threads.slice(0, 4);

  return (
    <DashboardSection title="Recent Conversations" onSeeAll={() => navigation.navigate('AllThreads')}>
      {recentThreads.length === 0 ? (
        <View style={[styles.emptySection, { backgroundColor: colors.emptyBg }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.accent20 }]}>
            <Ionicons name="chatbubbles-outline" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.emptySectionText, { color: colors.subtext }]}>
            Start a new chat to see your conversations here.
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: spacing.md }}>
          {recentThreads.map((item, index) => {
            const last = item.messages[item.messages.length - 1];
            const snippet = last ? `${last.text.slice(0, 50)}…` : 'No messages yet';
            const character = characters.find(c => c.id === item.characterId);
            
            return (
              <TouchableOpacity
                key={item.id}
                style={[ styles.threadCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: index === recentThreads.length - 1 ? 0 : spacing.sm, } ]}
                onPress={() => navigation.navigate('Chat', { threadId: item.id, name: item.name })}
                activeOpacity={0.7}
              >
                <View style={[styles.threadIcon, { backgroundColor: character ? 'transparent' : colors.accent20, overflow: 'hidden' }]}>
                  {character ? (
                     <Image source={{ uri: character.avatarUrl }} style={styles.threadAvatar} />
                  ) : (
                     <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.accent} />
                  )}
                </View>
                <View style={styles.threadTextContainer}>
                  <Text style={[styles.threadTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.threadSnippet, { color: colors.subtext }]} numberOfLines={1}>{snippet}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </DashboardSection>
  );
};


// --- Main Dashboard Screen ---
export default function ThreadsList({ navigation }) {
  const { createThread } = useContext(ThreadsContext);
  const { systemPrompt } = useContext(SettingsContext);
  const { colors } = useTheme();

  const handleCreateGenericThread = () => {
    const initialMessages = [
        { id: `u-system-${Date.now()}`, text: systemPrompt, role: 'user', isHidden: true },
        { id: `a-system-${Date.now()}`, text: "Understood. I'm ready to assist. How can I help you today?", role: 'model' },
    ];
    const newThreadId = createThread("New Chat", initialMessages, null);
    navigation.navigate('Chat', { threadId: newThreadId, name: "New Chat" });
  };
  
  // Create a pseudo-route for Quick Actions to handle new chat creation
  const handleNavigate = (screen) => {
    if (screen === 'NewGenericChat') {
      handleCreateGenericThread();
    } else {
      navigation.navigate(screen);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        navigation={navigation}
        title="Dashboard"
        subtitle="Welcome back!"
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <QuickActions navigation={{ navigate: handleNavigate }} />
        <SelectableCharacters navigation={navigation} />
        <PinnedMessages navigation={navigation} />
        <RecentImages navigation={navigation} />
        <RecentConversations navigation={navigation} />
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Combined and Updated Styles ---
const styles = StyleSheet.create({
  root: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: typography.h2, fontWeight: '700' },
  seeAllButton: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { fontSize: typography.body, fontWeight: '600' },
  emptySection: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg, borderRadius: 16, marginHorizontal: spacing.md,
    borderWidth: 1, borderColor: 'rgba(129, 140, 248, 0.1)',
  },
  emptyIconContainer: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  emptySectionText: { fontSize: typography.body, textAlign: 'center', lineHeight: 20 },
  loadingContainer: { height: 120, alignItems: 'center', justifyContent: 'center' },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
  },
  qaCard: {
    width: (screenWidth - spacing.md * 4) / 3, // Dynamic width
    height: 120,
    borderRadius: 20,
    padding: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  qaIconContainer: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  qaTitle: { fontSize: typography.body, fontWeight: '700', textAlign: 'center' },
  qaDescription: { fontSize: typography.small, textAlign: 'center' },
  pinCard: { borderRadius: 16, padding: spacing.md, borderWidth: 1 },
  pinHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  pinText: { fontSize: typography.body, lineHeight: 22 },
  pinSource: { fontSize: typography.small, marginLeft: spacing.xs, fontWeight: '600' },
  riImage: { width: 120, height: 120, borderRadius: 16 },
  threadCard: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
    borderRadius: 16, borderWidth: 1,
  },
  threadIcon: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
  },
  threadAvatar: {
    width: '100%', height: '100%', borderRadius: 22,
  },
  threadTextContainer: { flex: 1 },
  threadTitle: { fontSize: typography.body, fontWeight: '700', marginBottom: 2 },
  threadSnippet: { fontSize: typography.small, lineHeight: 16 },
  charCard: {
    alignItems: 'center',
    width: 90,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 16,
  },
  charAvatar: {
    width: 64, height: 64, borderRadius: 32,
    marginBottom: spacing.sm,
  },
  charName: {
    fontSize: typography.small,
    fontWeight: '600',
    textAlign: 'center',
  },
});
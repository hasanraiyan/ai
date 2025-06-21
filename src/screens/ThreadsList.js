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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { CharactersContext } from '../contexts/CharactersContext';
import { useTheme, spacing, typography } from '../utils/theme';
import ScreenHeader from '../components/ScreenHeader';

const IMAGE_DIR = `${FileSystem.documentDirectory}ai_generated_images/`;
const { width: screenWidth } = Dimensions.get('window');

// Enhanced Section Component with better animations
const DashboardSection = React.memo(({ title, children, onSeeAll, seeAllLabel = "See All", icon }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          {icon && (
            <View style={[styles.sectionIconContainer, { backgroundColor: colors.accent + '15' }]}>
              <Ionicons name={icon} size={20} color={colors.accent} />
            </View>
          )}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>
        {onSeeAll && (
          <TouchableOpacity
            onPress={onSeeAll}
            style={styles.seeAllButton}
            activeOpacity={0.7}
          >
            <Text style={[styles.seeAllText, { color: colors.accent }]}>{seeAllLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} style={styles.seeAllIcon} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
});

// Enhanced Quick Actions with better visual hierarchy
const QuickActions = ({ navigation }) => {
  const { colors } = useTheme();
  const actions = useMemo(() => [
    {
      title: 'Generate Image',
      icon: 'image-outline',
      screen: 'ImageGeneration',
      description: 'Create stunning AI art',
      bgColor: '#FF6B6B15'
    },
    {
      title: 'Language Tutor',
      icon: 'language-outline',
      screen: 'LanguageTutor',
      description: 'Practice languages',
      bgColor: '#4ECDC415'
    },
  ], []);

  return (
    <DashboardSection title="Quick Actions" icon="flash-outline">
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsContainer}
      >
        {actions.map((item, index) => (
          <TouchableOpacity
            key={item.title}
            style={[
              styles.qaCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginRight: index === actions.length - 1 ? spacing.md : spacing.sm,
              },
            ]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.8}
          >
            <View style={[styles.qaIconContainer, { backgroundColor: item.bgColor }]}>
              <Ionicons name={item.icon} size={24} color={colors.accent} />
            </View>
            <View style={styles.qaTextContainer}>
              <Text style={[styles.qaTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.qaDescription, { color: colors.subtext }]} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
            <View style={styles.qaArrow}>
              <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </DashboardSection>
  );
};

// Enhanced Character Selection with better avatars and status
const SelectableCharacters = ({ navigation }) => {
  const { characters } = useContext(CharactersContext);
  const { createThread } = useContext(ThreadsContext);
  const { systemPrompt } = useContext(SettingsContext);
  const { colors } = useTheme();

  const defaultAi = useMemo(() => ({
    id: 'default-ai',
    name: 'Arya',
    avatarUrl: 'https://image.pollinations.ai/prompt/abstract_logo_of_a_friendly_AI_assistant,_glowing_blue_and_purple_orb?width=512&height=512&seed=12345',
    systemPrompt: systemPrompt,
    greeting: "Hello! How can I help you today?",
    isDefault: true,
  }), [systemPrompt]);

  const handleSelectCharacter = (character) => {
    if (character.id === 'default-ai') {
      const initialMessages = [
        { id: `u-system-${Date.now()}`, text: character.systemPrompt, role: 'user', isHidden: true },
        { id: `a-system-${Date.now()}`, text: character.greeting, role: 'model', characterId: null },
      ];
      const newThreadId = createThread("New Chat", initialMessages, null);
      navigation.navigate('Chat', { threadId: newThreadId, name: "New Chat" });
    } else {
      const initialMessages = [
        { id: `u-system-${Date.now()}`, text: character.systemPrompt, role: 'user', isHidden: true },
        { id: `a-system-${Date.now()}`, text: character.greeting, role: 'model', characterId: character.id },
      ];
      const newThreadId = createThread(character.name, initialMessages, character.id);
      navigation.navigate('Chat', { threadId: newThreadId, name: character.name });
    }
  };
  
  const allSelectable = [defaultAi, ...characters];

  return (
    <DashboardSection 
      title="Start a Chat" 
      icon="chatbubbles-outline"
      onSeeAll={() => navigation.navigate('Characters')}
      seeAllLabel={`View All (${characters.length})`}
    >
      <FlatList
        data={allSelectable.slice(0, 8)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.charactersContainer}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => {
          return (
            <TouchableOpacity
              onPress={() => handleSelectCharacter(item)}
              style={[
                styles.charCard,
                {
                  marginRight: index === allSelectable.slice(0, 8).length - 1 ? spacing.md : spacing.sm,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                }
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.charAvatarContainer}>
                <Image
                  source={{ uri: item.avatarUrl }}
                  style={[styles.charAvatar, { backgroundColor: colors.imagePlaceholder }]}
                />
                {item.isDefault && (
                  <View style={[styles.charBadge, { backgroundColor: colors.accent }]}>
                    <Ionicons name="star" size={10} color="#fff" />
                  </View>
                )}
                <View style={[styles.charStatus, { backgroundColor: '#4ADE80' }]} />
              </View>
              <Text style={[styles.charName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </DashboardSection>
  );
};

// Enhanced Pinned Messages with better visual design
const PinnedMessages = ({ navigation }) => {
  const { pinnedMessages } = useContext(ThreadsContext);
  const { colors } = useTheme();

  if (!pinnedMessages || pinnedMessages.length === 0) {
    return (
      <DashboardSection title="Pinned Messages" icon="pin-outline">
        <View style={[styles.emptySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.accent + '15' }]}>
            <Ionicons name="pin-outline" size={28} color={colors.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Pinned Messages</Text>
          <Text style={[styles.emptySectionText, { color: colors.subtext }]}>
            Pin important messages in conversations to access them quickly here.
          </Text>
        </View>
      </DashboardSection>
    );
  }

  const items = pinnedMessages.slice(0, 3);

  return (
    <DashboardSection title="Pinned Messages" icon="pin-outline">
      <View style={styles.pinnedContainer}>
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
              <View style={[styles.pinIconContainer, { backgroundColor: colors.accent + '15' }]}>
                <Ionicons name="pin" size={14} color={colors.accent} />
              </View>
              <Text style={[styles.pinSource, { color: colors.subtext }]} numberOfLines={1}>
                {threadName}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
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

// Enhanced Recent Images with better grid layout
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
    <DashboardSection 
      title="Recent Images" 
      icon="images-outline"
      onSeeAll={() => navigation.navigate('Gallery')}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : images.length === 0 ? (
        <View style={[styles.emptySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.accent + '15' }]}>
            <Ionicons name="images-outline" size={28} color={colors.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Images Yet</Text>
          <Text style={[styles.emptySectionText, { color: colors.subtext }]}>
            Use the "Generate Image" action to create your first AI masterpiece.
          </Text>
        </View>
      ) : (
        <FlatList
          data={images}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imagesContainer}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Gallery')}
              style={[
                styles.imageCard,
                {
                  marginRight: index === images.length - 1 ? spacing.md : spacing.sm,
                }
              ]}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.uri }}
                style={[styles.riImage, { backgroundColor: colors.imagePlaceholder }]}
              />
              <View style={styles.imageOverlay}>
                <Ionicons name="eye-outline" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </DashboardSection>
  );
};

// Enhanced Recent Conversations with better metadata
const RecentConversations = ({ navigation }) => {
  const { threads } = useContext(ThreadsContext);
  const { characters } = useContext(CharactersContext);
  const { colors } = useTheme();
  const recentThreads = threads.slice(0, 4);

  const formatTime = (ts) => {
    if (!ts) return '';
    return ts;
  };

  return (
    <DashboardSection title="Recent Conversations" icon="archive-outline" onSeeAll={() => navigation.navigate('AllThreads')}>
      {recentThreads.length === 0 ? (
        <View style={[styles.emptySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.accent + '15' }]}>
            <Ionicons name="chatbubbles-outline" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Conversations Yet</Text>
          <Text style={[styles.emptySectionText, { color: colors.subtext }]}>
            Start a new chat to see your conversations here.
          </Text>
        </View>
      ) : (
        <View style={styles.threadsContainer}>
          {recentThreads.map((item, index) => {
            // --- FIX: Find the last *visible* message for the snippet ---
            const lastVisibleMessage = item.messages.slice().reverse().find(m => !m.isHidden);
            const snippet = lastVisibleMessage ? `${lastVisibleMessage.text.slice(0, 50)}â€¦` : 'No messages yet';
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
                 <Text style={[styles.threadTime, { color: colors.subtext }]}>{formatTime(lastVisibleMessage?.ts)}</Text>
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
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleCreateGenericThread = () => {
    const initialMessages = [
        { id: `u-system-${Date.now()}`, text: systemPrompt, role: 'user', isHidden: true },
        { id: `a-system-${Date.now()}`, text: "Understood. I'm ready to assist. How can I help you today?", role: 'model' },
    ];
    const newThreadId = createThread("New Chat", initialMessages, null);
    navigation.navigate('Chat', { threadId: newThreadId, name: "New Chat" });
  };
  
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        navigation={navigation}
        title="Dashboard"
        subtitle="Welcome back!"
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <SelectableCharacters navigation={navigation} />
        <QuickActions navigation={navigation} />
        <PinnedMessages navigation={navigation} />
        <RecentImages navigation={navigation} />
        <RecentConversations navigation={navigation} />
      </ScrollView>
      
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.fabBg }]}
        onPress={handleCreateGenericThread}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// --- Combined and Updated Styles ---
const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContainer: { paddingTop: spacing.lg, paddingBottom: 100 },
  sectionContainer: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.md, },
  sectionTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  sectionIconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  sectionTitle: { fontSize: typography.h1, fontWeight: '700' },
  seeAllButton: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { fontSize: typography.body, fontWeight: '600' },
  seeAllIcon: { marginLeft: 2 },
  sectionContent: {},
  emptySection: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, borderRadius: 16, marginHorizontal: spacing.md, borderWidth: 1 },
  emptyIconContainer: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, },
  emptyTitle: { fontSize: typography.h2 - 2, fontWeight: '600', marginBottom: spacing.xs },
  emptySectionText: { fontSize: typography.body, textAlign: 'center', lineHeight: 20 },
  loadingContainer: { height: 120, alignItems: 'center', justifyContent: 'center' },
  quickActionsContainer: { paddingHorizontal: spacing.md },
  qaCard: { width: (screenWidth / 2) - spacing.xl, height: 140, borderRadius: 20, padding: spacing.md, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  qaIconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  qaTextContainer: { flex: 1 },
  qaTitle: { fontSize: typography.body, fontWeight: '700' },
  qaDescription: { fontSize: typography.small, marginTop: 2 },
  qaArrow: { position: 'absolute', bottom: spacing.sm, right: spacing.sm },
  charactersContainer: { paddingHorizontal: spacing.md },
  charCard: { alignItems: 'center', width: 90, paddingVertical: spacing.sm, borderRadius: 16, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  charAvatarContainer: { position: 'relative' },
  charAvatar: { width: 64, height: 64, borderRadius: 32, marginBottom: spacing.sm },
  charBadge: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  charStatus: { position: 'absolute', bottom: 4, right: 4, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  charName: { fontSize: typography.small, fontWeight: '600', textAlign: 'center' },
  charAction: { position: 'absolute', bottom: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
  pinnedContainer: { paddingHorizontal: spacing.md },
  pinCard: { borderRadius: 16, padding: spacing.md, borderWidth: 1 },
  pinHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, justifyContent: 'space-between' },
  pinIconContainer: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  pinText: { fontSize: typography.body, lineHeight: 22 },
  pinSource: { flex: 1, fontSize: typography.small, marginLeft: spacing.xs, fontWeight: '600' },
  imagesContainer: { paddingHorizontal: spacing.md },
  imageCard: { borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  riImage: { width: 120, height: 150 },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  threadsContainer: { paddingHorizontal: spacing.md },
  threadCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: 16, borderWidth: 1 },
  threadIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md, },
  threadAvatar: { width: '100%', height: '100%', borderRadius: 22, },
  threadTextContainer: { flex: 1 },
  threadTitle: { fontSize: typography.body, fontWeight: '700', marginBottom: 2 },
  threadSnippet: { fontSize: typography.small, lineHeight: 16 },
  threadTime: { fontSize: typography.small, marginLeft: spacing.sm },
  fab: { position: 'absolute', margin: spacing.lg, right: 0, bottom: 0, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, },
});
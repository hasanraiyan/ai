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
  Alert,
  Modal,
  Pressable,
  TextInput,
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

// --- Reusable Components ---

const DashboardSection = React.memo(({ title, children, onSeeAll, seeAllLabel = "See All", icon }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          {icon && (
            <View style={[styles.sectionIconContainer, { backgroundColor: colors.accent + '1A' }]}>
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
      {/* The content is rendered directly, allowing it to control its own padding */}
      {children}
    </View>
  );
});

// --- Dashboard Sections ---

const QuickActions = ({ navigation }) => {
  const { colors } = useTheme();
  const actions = useMemo(() => [
    // --- MODIFIED: Added Finance screen to quick actions ---
    { title: 'Finance Overview', icon: 'wallet-outline', screen: 'Finance', description: 'Track your money flow', color: '#6366F1' },
    { title: 'Generate Image', icon: 'image-outline', screen: 'ImageGeneration', description: 'Create stunning AI art', color: '#FF6B6B' },
    { title: 'Language Tutor', icon: 'language-outline', screen: 'LanguageTutor', description: 'Practice new languages', color: '#4ECDC4' },
  ], []);

  return (
    <DashboardSection title="Quick Actions" icon="flash-outline">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContainer}
      >
        {actions.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={[ styles.qaCard, { backgroundColor: colors.card, borderColor: colors.border } ]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.8}
          >
            <View style={[styles.qaIconContainer, { backgroundColor: item.color + '1A' }]}>
              <Ionicons name={item.icon} size={28} color={item.color} />
            </View>
            <Text style={[styles.qaTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.qaDescription, { color: colors.subtext }]}>{item.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </DashboardSection>
  );
};

const SelectableCharacters = ({ navigation }) => {
  const { characters } = useContext(CharactersContext);
  const { createThread } = useContext(ThreadsContext);
  const { systemPrompt } = useContext(SettingsContext);
  const { colors } = useTheme();

  const defaultAi = useMemo(() => ({
    id: 'default-ai',
    name: 'Arya',
    avatarUrl: require('../../assets/icon.png'), // This uses a local asset
    systemPrompt: systemPrompt,
    greeting: "Hello! How can I help you today?",
    isDefault: true,
  }), [systemPrompt]);

  const handleSelectCharacter = (character) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isDefault = character.id === 'default-ai';
    const initialMessages = [
      { id: `u-system-${Date.now()}`, text: character.systemPrompt, role: 'user', isHidden: true },
      { id: `a-system-${Date.now()}`, text: character.greeting, role: 'model', characterId: isDefault ? null : character.id, ts },
    ];
    const threadName = isDefault ? "New Chat" : character.name;
    const newThreadId = createThread(threadName, initialMessages, isDefault ? null : character.id);
    navigation.navigate('Chat', { threadId: newThreadId, name: threadName });
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
        contentContainerStyle={styles.horizontalListContainer}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const imageSource = typeof item.avatarUrl === 'string'
            ? { uri: item.avatarUrl }
            : item.avatarUrl;

          return (
            <TouchableOpacity
              onPress={() => handleSelectCharacter(item)}
              style={[ styles.charCard, { backgroundColor: colors.card, borderColor: colors.border } ]}
              activeOpacity={0.8}
            >
              <View>
                <Image
                  source={imageSource}
                  style={[styles.charAvatar, { backgroundColor: colors.imagePlaceholder }]}
                />
                {item.id === 'default-ai' && (
                  <View style={[styles.charBadge, { backgroundColor: colors.accent, borderColor: colors.card }]}>
                    <Ionicons name="star" size={10} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={[styles.charName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </DashboardSection>
  );
};

const PinnedMessages = ({ navigation }) => {
  const { pinnedMessages } = useContext(ThreadsContext);
  const { colors } = useTheme();

  const renderEmptyState = () => (
    <View style={[styles.emptySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.accent + '1A' }]}>
        <Ionicons name="pin-outline" size={28} color={colors.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Pinned Messages</Text>
      <Text style={[styles.emptySectionText, { color: colors.subtext }]}>
        Pin important messages to access them quickly.
      </Text>
    </View>
  );

  if (!pinnedMessages || pinnedMessages.length === 0) {
    return (
      <DashboardSection title="Pinned Messages" icon="pin-outline">
        {renderEmptyState()}
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="Pinned Messages" icon="pin-outline">
      <View style={styles.verticalListContainer}>
        {pinnedMessages.slice(0, 3).map(({ threadId, threadName, message }, index) => (
          <TouchableOpacity
            key={message.id}
            style={[ styles.pinCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: index === 2 ? 0 : spacing.sm } ]}
            onPress={() => navigation.navigate('Chat', { threadId, name: threadName })}
            activeOpacity={0.7}
          >
            <Text style={[styles.pinText, { color: colors.text }]} numberOfLines={2}>{message.text}</Text>
            <View style={styles.pinFooter}>
              <Ionicons name="return-up-forward-outline" size={14} color={colors.subtext} />
              <Text style={[styles.pinSource, { color: colors.subtext }]} numberOfLines={1}>{threadName}</Text>
            </View>
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
    setLoading(true);
    try {
      const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
      if (!dirInfo.exists) { setImages([]); return; }
      const files = (await FileSystem.readDirectoryAsync(IMAGE_DIR)).filter(f => /\.(jpe?g|png)$/i.test(f));
      const fileData = await Promise.all(
        files.map(async (fileName) => ({
          id: fileName,
          uri: IMAGE_DIR + fileName,
          time: (await FileSystem.getInfoAsync(IMAGE_DIR + fileName)).modificationTime || 0,
        }))
      );
      setImages(fileData.sort((a, b) => b.time - a.time).slice(0, 6));
    } catch (e) {
      console.error("Couldn't load recent images:", e);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadRecentImages);
    return unsubscribe;
  }, [navigation, loadRecentImages]);

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator style={styles.loadingContainer} color={colors.accent} size="large" />;
    }
    if (images.length === 0) {
      return (
        <View style={[styles.emptySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.accent + '1A' }]}>
            <Ionicons name="images-outline" size={28} color={colors.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Images Yet</Text>
          <Text style={[styles.emptySectionText, { color: colors.subtext }]}>
            Use "Generate Image" to create your first one.
          </Text>
        </View>
      );
    }
    return (
      <FlatList
        data={images}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContainer}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Gallery', { initialImage: item.uri })}
            style={styles.imageCard}
            activeOpacity={0.8}
          >
            <Image source={{ uri: item.uri }} style={[styles.riImage, { backgroundColor: colors.imagePlaceholder }]}/>
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <DashboardSection title="Recent Images" icon="images-outline" onSeeAll={() => navigation.navigate('Gallery')}>
      {renderContent()}
    </DashboardSection>
  );
};

const RecentConversations = ({ navigation }) => {
  const { threads, renameThread, deleteThread } = useContext(ThreadsContext);
  const { characters } = useContext(CharactersContext);
  const { colors } = useTheme();
  const recentThreads = threads.slice(0, 4);

  const [selectedThread, setSelectedThread] = useState(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameInput, setRenameInput] = useState('');

  const handleLongPress = useCallback((thread) => {
    setSelectedThread(thread);
    Alert.alert(
      "Conversation Options",
      `What would you like to do with "${thread.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {
            Alert.alert(
              "Delete Conversation",
              `Are you sure you want to permanently delete "${thread.name}"?`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteThread(thread.id) },
              ]
            );
        }},
        { text: "Rename", onPress: () => {
            setRenameInput(thread.name);
            setRenameModalVisible(true);
        }},
      ]
    );
  }, [deleteThread]);

  const saveRename = useCallback(() => {
    if (selectedThread && renameInput.trim()) {
      renameThread(selectedThread.id, renameInput.trim());
    }
    setRenameModalVisible(false);
    setSelectedThread(null);
    setRenameInput('');
  }, [selectedThread, renameInput, renameThread]);

  if (recentThreads.length === 0) { return null; }

  return (
    <DashboardSection title="Recent Conversations" icon="archive-outline" onSeeAll={() => navigation.navigate('AllThreads')}>
      <View style={styles.verticalListContainer}>
        {recentThreads.map((item, index) => {
          const lastVisibleMessage = item.messages.slice().reverse().find(m => !m.isHidden);
          const snippet = lastVisibleMessage ? lastVisibleMessage.text : 'No messages yet';
          const character = characters.find(c => c.id === item.characterId);

          return (
            <TouchableOpacity
              key={item.id}
              style={[ styles.threadCard, { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: index === recentThreads.length - 1 ? 0 : 1, }]}
              onPress={() => navigation.navigate('Chat', { threadId: item.id, name: item.name })}
              onLongPress={() => handleLongPress(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.threadIcon, { backgroundColor: character ? 'transparent' : colors.accent + '1A' }]}>
                {character ? (
                   <Image source={{ uri: character.avatarUrl }} style={styles.threadAvatar} />
                ) : (
                   <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.accent} />
                )}
              </View>
              <View style={styles.threadTextContainer}>
                <Text style={[styles.threadTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.threadSnippet, { color: colors.subtext }]} numberOfLines={1}>{snippet}</Text>
              </View>
              <Text style={[styles.threadTime, { color: colors.subtext }]}>{lastVisibleMessage?.ts || ''}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Modal transparent visible={renameModalVisible} animationType="fade" onRequestClose={() => setRenameModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRenameModalVisible(false)}>
          <Pressable style={[styles.renameModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Rename Conversation</Text>
            <TextInput
              style={[styles.renameInput, { backgroundColor: colors.emptyBg, color: colors.text, borderColor: colors.border }]}
              value={renameInput}
              onChangeText={setRenameInput}
              placeholder="Enter new name"
              placeholderTextColor={colors.subtext}
              autoFocus
            />
            <View style={styles.renameBtns}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setRenameModalVisible(false)}>
                <Text style={[styles.modalButtonText, { color: colors.subtext }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={saveRename}>
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    // In a real app, you'd re-fetch data here. For now, it's a mock refresh.
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleCreateGenericThread = () => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const initialMessages = [
        { id: `u-system-${Date.now()}`, text: systemPrompt, role: 'user', isHidden: true },
        { id: `a-system-${Date.now()}`, text: "Understood. I'm ready to assist. How can I help you today?", role: 'model', ts },
    ];
    const newThreadId = createThread("New Chat", initialMessages, null);
    navigation.navigate('Chat', { threadId: newThreadId, name: "New Chat" });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader navigation={navigation} title="Dashboard" subtitle="Welcome back!" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <QuickActions navigation={navigation} />
        <SelectableCharacters navigation={navigation} />
        <PinnedMessages navigation={navigation} />
        <RecentImages navigation={navigation} />
        <RecentConversations navigation={navigation} />
      </ScrollView>

     <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.fabBg }]}
        onPress={handleCreateGenericThread}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContainer: { paddingTop: spacing.md, paddingBottom: spacing.xl * 2, },

  // Section Layout
  sectionContainer: { marginBottom: spacing.xl, },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.md },
  sectionTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { ...typography.h2, fontWeight: '700' },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, paddingLeft: spacing.sm },
  seeAllText: { ...typography.body, fontWeight: '600' },
  seeAllIcon: { marginLeft: 2 },

  // List Containers
  horizontalListContainer: { paddingHorizontal: spacing.md, gap: spacing.sm },
  verticalListContainer: { marginHorizontal: spacing.md },

  // Empty State & Loading
  emptySection: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg, borderRadius: 16, marginHorizontal: spacing.md, borderWidth: 1, },
  emptyIconContainer: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, },
  emptyTitle: { ...typography.h3, fontWeight: '600', marginBottom: spacing.xs },
  emptySectionText: { ...typography.body, textAlign: 'center', lineHeight: 20 },
  loadingContainer: { height: 150, alignItems: 'center', justifyContent: 'center' },

  // Card: Quick Actions
  qaCard: { width: (screenWidth / 2) - (spacing.md + (spacing.sm / 2)), borderRadius: 20, padding: spacing.md, borderWidth: 1, gap: spacing.sm },
  qaIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  qaTitle: { ...typography.h4, fontWeight: '700' },
  qaDescription: { ...typography.small, lineHeight: 16 },

  // Card: Characters
  charCard: { alignItems: 'center', width: 90, padding: spacing.sm, borderRadius: 16, borderWidth: 1, gap: spacing.sm },
  charAvatar: { width: 60, height: 60, borderRadius: 30 },
  charBadge: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  charName: { ...typography.small, fontWeight: '600', textAlign: 'center' },

  // Card: Pinned Messages
  pinCard: { borderRadius: 16, padding: spacing.md, borderWidth: 1, },
  pinText: { ...typography.body, lineHeight: 22, fontWeight: '500' },
  pinFooter: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.xs },
  pinSource: { ...typography.small, fontWeight: '600', flex: 1 },

  // Card: Recent Images
  imageCard: { borderRadius: 12, overflow: 'hidden' },
  riImage: { width: 120, height: 150 },

  // Item: Recent Conversations
  threadCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: 16, },
  threadIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md, overflow: 'hidden' },
  threadAvatar: { width: '100%', height: '100%' },
  threadTextContainer: { flex: 1, marginRight: spacing.sm },
  threadTitle: { ...typography.body, fontWeight: '700', marginBottom: 2 },
  threadSnippet: { ...typography.small, lineHeight: 18 },
  threadTime: { ...typography.small },

  // Floating Action Button (FAB)
  fab: { position: 'absolute', margin: spacing.lg, right: 0, bottom: 0, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, },
  fabText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },

  // --- Styles for Rename Modal ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  renameModal: { width: '100%', borderRadius: 20, padding: spacing.lg },
  modalTitle: { fontSize: typography.h2, fontWeight: 'bold', marginBottom: spacing.lg, textAlign: 'center' },
  renameInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, height: 48, fontSize: typography.body, marginBottom: spacing.lg },
  renameBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  modalButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: 10 },
  modalButtonText: { fontSize: typography.body, fontWeight: '600' },
});
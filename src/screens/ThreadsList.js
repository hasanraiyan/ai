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
  useColorScheme,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { useTheme, spacing, typography } from '../utils/theme';

const IMAGE_DIR = `${FileSystem.documentDirectory}ai_generated_images/`;
const { width: screenWidth } = Dimensions.get('window');

// --- Reusable Section Component ---
const DashboardSection = React.memo(({ title, children, onSeeAll, seeAllLabel = "See All" }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionContainer, { marginBottom: spacing.xl }]}>
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
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
});

// --- Quick Actions ---
const QuickActions = ({ navigation }) => {
  const { colors } = useTheme();
  const actions = useMemo(() => [
    { 
      title: 'Generate Image', 
      icon: 'image-outline', 
      screen: 'ImageGeneration',
      gradient: ['#667eea', '#764ba2'],
      description: 'Create AI art'
    },
    { 
      title: 'Language Tutor', 
      icon: 'language-outline', 
      screen: 'LanguageTutor',
      gradient: ['#f093fb', '#f5576c'],
      description: 'Learn languages'
    },
    { 
      title: 'Settings', 
      icon: 'settings-outline', 
      screen: 'Settings',
      gradient: ['#4facfe', '#00f2fe'],
      description: 'App preferences'
    },
  ], []);

  const cardWidth = (screenWidth - spacing.md * 2 - spacing.md * 2) / 3;

  return (
    <DashboardSection title="Quick Actions">
      <View style={styles.quickActionsGrid}>
        {actions.map((item, index) => (
          <TouchableOpacity
            key={item.title}
            style={[
              styles.qa_card_new,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                width: cardWidth,
                // Add subtle shadow
                ...Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                  },
                  android: {
                    elevation: 3,
                  },
                }),
              },
            ]}
            onPress={() => navigation.navigate(item.screen)}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}: ${item.description}`}
            activeOpacity={0.8}
          >
            <View style={[
              styles.qa_icon_container_new, 
              { backgroundColor: `${colors.accent}15` }
            ]}>
              <Ionicons name={item.icon} size={28} color={colors.accent} />
            </View>
            <View style={styles.qa_text_container}>
              <Text style={[styles.qa_title_new, { color: colors.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[styles.qa_description, { color: colors.subtext }]} numberOfLines={1}>
                {item.description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </DashboardSection>
  );
};

// --- Pinned Messages ---
const PinnedMessages = ({ navigation }) => {
  const { pinnedMessages } = useContext(ThreadsContext);
  const { colors } = useTheme();

  if (!pinnedMessages || pinnedMessages.length === 0) {
    return (
      <DashboardSection title="Pinned Messages">
        <View style={[styles.emptySection, { backgroundColor: colors.emptyBg }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.emptyIcon}10` }]}>
            <Ionicons name="pin-outline" size={32} color={colors.emptyIcon} />
          </View>
          <Text style={[styles.emptySectionText, { color: colors.subtext }]}>
            Pin messages in a chat to see them here
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
              styles.pin_card, 
              { 
                backgroundColor: colors.card, 
                borderColor: colors.border,
                marginBottom: index === items.length - 1 ? 0 : spacing.sm,
              }
            ]}
            onPress={() => navigation.navigate('Chat', { threadId, name: threadName })}
            accessibilityRole="button"
            accessibilityLabel={`Pinned message from ${threadName}: ${message.text}`}
            activeOpacity={0.7}
          >
            <View style={styles.pinHeader}>
              <Ionicons name="pin" size={16} color={colors.accent} />
              <Text style={[styles.pin_source, { color: colors.subtext }]}>
                {threadName}
              </Text>
            </View>
            <Text style={[styles.pin_text, { color: colors.text }]} numberOfLines={3}>
              {message.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </DashboardSection>
  );
};

// --- Recent Images ---
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
          <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.emptyIcon}10` }]}>
            <Ionicons name="images-outline" size={32} color={colors.emptyIcon} />
          </View>
          <Text style={[styles.emptySectionText, { color: colors.subtext }]}>
            Generated images will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={images}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: spacing.md, paddingRight: spacing.md }}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Gallery')}
              accessibilityRole="imagebutton"
              accessibilityLabel="View generated image"
              style={{ marginRight: index === images.length - 1 ? 0 : spacing.sm }}
            >
              <Image
                source={{ uri: item.uri }}
                style={[
                  styles.ri_image,
                  {
                    backgroundColor: colors.imagePlaceholder,
                    ...Platform.select({
                      ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 8,
                      },
                      android: {
                        elevation: 4,
                      },
                    }),
                  }
                ]}
                accessibilityIgnoresInvertColors={false}
              />
            </TouchableOpacity>
          )}
        />
      )}
    </DashboardSection>
  );
};

// --- Recent Conversations ---
const RecentConversations = ({ navigation }) => {
  const { threads } = useContext(ThreadsContext);
  const { colors } = useTheme();
  const recentThreads = threads.slice(0, 4);

  return (
    <DashboardSection title="Recent Conversations" onSeeAll={() => navigation.navigate('AllThreads')}>
      {recentThreads.length === 0 ? (
        <View style={[styles.emptySection, { backgroundColor: colors.emptyBg }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.emptyIcon}10` }]}>
            <Ionicons name="chatbubbles-outline" size={32} color={colors.emptyIcon} />
          </View>
          <Text style={[styles.emptySectionText, { color: colors.subtext }]}>
            Start a new conversation to see it here
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: spacing.md }}>
          {recentThreads.map((item, index) => {
            const last = item.messages[item.messages.length - 1];
            const snippet = last ? `${last.text.slice(0, 50)}…` : 'No messages yet';
            const timeLabel = last ? last.ts : '';
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.threadCard, 
                  { 
                    backgroundColor: colors.card, 
                    borderColor: colors.border,
                    marginBottom: index === recentThreads.length - 1 ? 0 : spacing.sm,
                  }
                ]}
                onPress={() => navigation.navigate('Chat', { threadId: item.id, name: item.name })}
                accessibilityRole="button"
                accessibilityLabel={`Open conversation ${item.name}, last message: ${snippet}`}
                activeOpacity={0.7}
              >
                <View style={[styles.threadIcon, { backgroundColor: `${colors.accent}15` }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.accent} />
                </View>
                <View style={styles.threadTextContainer}>
                  <Text style={[styles.threadTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.threadSnippet, { color: colors.subtext }]} numberOfLines={1}>
                    {snippet}
                  </Text>
                </View>
                {timeLabel ? (
                  <Text style={[styles.threadTime, { color: colors.subtext }]}>{timeLabel}</Text>
                ) : null}
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
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder }]}>
        <TouchableOpacity
          onPress={() => navigation.openDrawer()}
          style={styles.headerIconButton}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Ionicons name="menu-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Dashboard</Text>
        <View style={{ width: 24 + spacing.sm * 2 }} />
      </View>

      <ScrollView 
        contentContainerStyle={{ 
          paddingTop: spacing.lg, // Added top padding after header
          paddingBottom: 100 
        }}
        showsVerticalScrollIndicator={false}
      >
        <QuickActions navigation={navigation} />
        <PinnedMessages navigation={navigation} />
        <RecentImages navigation={navigation} />
        <RecentConversations navigation={navigation} />
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.fab, 
          { 
            backgroundColor: colors.fabBg,
            ...Platform.select({
              android: {
                elevation: 8,
              },
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              },
            }),
          }
        ]}
        onPress={() => {
          const id = createThread();
          navigation.navigate('Chat', { threadId: id, name: 'New Chat' });
        }}
        accessibilityRole="button"
        accessibilityLabel="Start new chat"
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
  },
  headerIconButton: {
    padding: spacing.xs,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: typography.h1,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  sectionContainer: {
    // marginBottom handled inline
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.h2,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
  },
  seeAllText: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  sectionContent: {},
  
  // Empty states
  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    borderRadius: 16,
    marginHorizontal: spacing.md,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptySectionText: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  // Quick Actions - New Design
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  qa_card_new: {
    height: 120,
    borderRadius: 20,
    padding: spacing.md,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  qa_icon_container_new: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  qa_text_container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  qa_title_new: {
    fontSize: typography.body,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 2,
  },
  qa_description: {
    fontSize: typography.small,
    lineHeight: 14,
  },

  // Pinned Messages
  pin_card: {
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
  },
  pinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pin_text: {
    fontSize: typography.body,
    lineHeight: 22,
  },
  pin_source: {
    fontSize: typography.small,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },

  // Recent Images
  ri_image: {
    width: 120,
    height: 120,
    borderRadius: 16,
  },

  // Recent Conversations
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  threadIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  threadTextContainer: {
    flex: 1,
  },
  threadTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    marginBottom: 2,
  },
  threadSnippet: {
    fontSize: typography.small,
    lineHeight: 16,
  },
  threadTime: {
    fontSize: typography.small,
    marginLeft: spacing.sm,
  },

  // FAB
  fab: {
    position: 'absolute',
    margin: spacing.lg,
    right: 0,
    bottom: 0,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
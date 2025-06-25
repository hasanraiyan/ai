// src/screens/AllThreadsScreen.js
import React, { useState, useContext, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StatusBar,
  Dimensions,
  Image,
  Animated,
  Easing,
  Pressable,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { CharactersContext } from '../contexts/CharactersContext';
import { useTheme, spacing, typography } from '../utils/theme';

const { width, height } = Dimensions.get('window');

// --- Custom Animated Action Sheet ---
const ActionSheetModal = ({ isVisible, onClose, actions }) => {
  const { colors } = useTheme();
  const styles = useStyles({ colors });
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : height,
      duration: isVisible ? 300 : 250,
      easing: isVisible ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [isVisible, slideAnim]);

  return (
    <Modal visible={isVisible} transparent animationType="none">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View 
          style={[
            styles.actionSheetContainer, 
            { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] }
          ]}
          onStartShouldSetResponder={() => true} 
        >
          <View style={[styles.actionSheetHandle, { backgroundColor: colors.border }]} />
          <SafeAreaView edges={['bottom']} style={{ width: '100%' }}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionBtn}
                onPress={() => {
                  onClose(); 
                  setTimeout(action.onPress, 150);
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={action.icon} 
                  size={22} 
                  color={action.color || colors.text} 
                  style={styles.actionIcon} 
                />
                <Text style={[styles.actionText, { color: action.color || colors.text }]}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.actionBtn, styles.cancelActionBtn, { borderColor: colors.border }]} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionText, { color: colors.subtext, fontWeight: '600' }]}>Cancel</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};


// --- A dedicated component for each list item ---
const ThreadItem = ({ item, character, onPress, onLongPress }) => {
  const { colors } = useTheme();
  const styles = useStyles({ colors });
  const lastVisibleMessage = item.messages.slice().reverse().find(m => !m.isHidden);
  const snippet = lastVisibleMessage ? lastVisibleMessage.text : 'No messages yet';

  return (
    <TouchableOpacity
      style={[styles.threadCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <View style={[styles.threadIconContainer, { backgroundColor: character ? 'transparent' : colors.accent20 }]}>
        {character?.avatarUrl ? (
          <Image source={{ uri: character.avatarUrl }} style={styles.threadAvatarImage} />
        ) : (
          <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.accent} />
        )}
      </View>
      <View style={styles.threadTextContainer}>
        <Text style={[styles.threadTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.threadSnippet, { color: colors.subtext }]} numberOfLines={2}>{snippet}</Text>
      </View>
      {lastVisibleMessage?.ts && <Text style={[styles.threadTime, { color: colors.subtext }]}>{lastVisibleMessage.ts}</Text>}
    </TouchableOpacity>
  );
};

export default function AllThreadsScreen({ navigation }) {
  const { colors } = useTheme();
  const scheme = useColorScheme();
  const styles = useStyles({ colors });

  const { threads, renameThread, deleteThread } = useContext(ThreadsContext);
  const { characters } = useContext(CharactersContext);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleLongPress = (thread) => {
    setSelectedThread(thread);
    setActionSheetVisible(true);
  };

  // --- FIX: Wrap handlers in useCallback for stability ---
  const handleDelete = useCallback(() => {
    if (selectedThread) {
        deleteThread(selectedThread.id);
    }
  }, [selectedThread, deleteThread]);

  const handleRename = useCallback(() => {
    if (selectedThread) {
        setRenameInput(selectedThread.name);
        setRenameModalVisible(true);
    }
  }, [selectedThread]);

  const saveRename = useCallback(() => {
    if (selectedThread) {
      renameThread(selectedThread.id, renameInput.trim() || selectedThread.name);
    }
    setRenameModalVisible(false);
  }, [selectedThread, renameInput, renameThread]);
  
  const threadActions = useMemo(() => [
    { title: 'Rename Conversation', icon: 'pencil-outline', onPress: handleRename },
    { title: 'Delete Conversation', icon: 'trash-outline', color: '#EF4444', onPress: handleDelete },
  ], [handleRename, handleDelete]);

  const displayedThreads = useMemo(() => 
    threads.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [threads, searchQuery]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={scheme === 'dark' ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <Ionicons name="arrow-back-outline" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.listTitle}>All Conversations</Text>
        <View style={styles.headerIconButton} />
      </View>

      <View style={styles.searchContainer}>
         <Ionicons name="search-outline" size={20} color={colors.subtext} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.emptyBg, color: colors.text }]}
          placeholder="Search conversations…"
          placeholderTextColor={colors.subtext}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={displayedThreads}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <ThreadItem
            item={item}
            character={characters.find(c => c.id === item.characterId)}
            onPress={() => navigation.navigate('Chat', { threadId: item.id, name: item.name })}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        contentContainerStyle={styles.threadsListContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {threads.length === 0 ? (
                <>
                    <Ionicons name="chatbubbles-outline" size={60} color={colors.emptyIcon} />
                    <Text style={[styles.emptyTitle, {color: colors.text}]}>No Conversations Yet</Text>
                    <Text style={[styles.emptyText, {color: colors.subtext}]}>Start a new chat from the dashboard.</Text>
                </>
            ) : (
                <>
                    <Ionicons name="search" size={48} color={colors.emptyIcon} />
                    <Text style={[styles.emptyTitle, {color: colors.text}]}>No Results</Text>
                    <Text style={[styles.emptyText, {color: colors.subtext}]}>Try a different search term.</Text>
                </>
            )}
          </View>
        )}
      />

      <ActionSheetModal 
        isVisible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        actions={threadActions}
      />

      <Modal transparent visible={renameModalVisible} animationType="fade" onRequestClose={() => setRenameModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -150} // Adjust as needed
        >
          <Pressable style={styles.modalOverlay} onPress={() => setRenameModalVisible(false)}>
            <Pressable style={[styles.renameModal, { backgroundColor: colors.card }]} onPress={null}>
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
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const useStyles = ({ colors }) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, },
  headerIconButton: { padding: spacing.sm },
  listTitle: { fontSize: typography.h1, fontWeight: 'bold', color: colors.text },
  searchContainer: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', },
  searchIcon: { position: 'absolute', left: spacing.md + 12, zIndex: 1 },
  searchInput: { flex: 1, borderRadius: 12, paddingLeft: 38, paddingRight: spacing.md, height: 44, fontSize: typography.body, },
  threadsListContainer: { flexGrow: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, marginTop: -spacing.xl*2 },
  emptyTitle: { fontSize: typography.h2, fontWeight: '600', marginTop: spacing.md },
  emptyText: { fontSize: typography.body, color: colors.subtext, marginTop: spacing.xs, textAlign: 'center' },
  threadCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: 16, borderWidth: 1, marginBottom: spacing.sm },
  threadIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md, overflow: 'hidden' },
  threadAvatarImage: { width: '100%', height: '100%', },
  threadTextContainer: { flex: 1, marginRight: spacing.sm, },
  threadTitle: { fontSize: typography.body, fontWeight: '600', marginBottom: 4 },
  threadSnippet: { fontSize: typography.small, lineHeight: 18 },
  threadTime: { fontSize: typography.small, alignSelf: 'flex-start' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: typography.h2, fontWeight: '600', marginBottom: spacing.lg, textAlign: 'center' },
  actionSheetContainer: { position: 'absolute', bottom: 0, width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: spacing.md, alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.sm, },
  actionSheetHandle: { width: 40, height: 5, borderRadius: 2.5, marginBottom: spacing.md, },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, width: '100%', },
  actionIcon: { marginRight: spacing.lg, width: 24, textAlign: 'center' },
  actionText: { fontSize: typography.h2 - 2, fontWeight: '500' },
  cancelActionBtn: { borderTopWidth: 1, marginTop: spacing.sm, justifyContent: 'center' },
  renameModal: { width: width * 0.9, borderRadius: 20, padding: spacing.lg },
  renameInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, height: 48, fontSize: typography.body, marginBottom: spacing.lg },
  renameBtns: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: 10, marginLeft: spacing.sm, },
  modalButtonText: { fontSize: typography.body, fontWeight: '600' },
});
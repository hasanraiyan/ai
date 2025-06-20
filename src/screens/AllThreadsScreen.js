// src/screens/AllThreadsScreen.js

import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StatusBar,
  Platform,
  Dimensions,
  Image, // <-- Import Image component
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThreadsContext } from '../contexts/ThreadsContext';
import { CharactersContext } from '../contexts/CharactersContext'; // <-- Import CharactersContext

const { width } = Dimensions.get('window');

// --- NEW: A dedicated component for each list item ---
const ThreadItem = ({ item, character, onPress, onLongPress }) => {
  const lastMessage = item.messages[item.messages.length - 1];
  const snippet = lastMessage
    ? lastMessage.text.slice(0, 40) + (lastMessage.text.length > 40 ? '…' : '')
    : 'No messages yet';

  return (
    <TouchableOpacity
      style={styles.threadCard}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.threadCardContent}>
        <View style={styles.threadIconContainer}>
          {character?.avatarUrl ? (
            <Image source={{ uri: character.avatarUrl }} style={styles.threadAvatarImage} />
          ) : (
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#6366F1" />
          )}
        </View>
        <View style={styles.threadTextContainer}>
          <Text style={styles.threadTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.threadSnippet} numberOfLines={1}>{snippet}</Text>
        </View>
        {lastMessage && <Text style={styles.threadTime}>{lastMessage.ts}</Text>}
      </View>
    </TouchableOpacity>
  );
};

// This screen is the dedicated view for ALL conversations, with search and management.
export default function AllThreadsScreen({ navigation }) {
  const { threads, renameThread, deleteThread } = useContext(ThreadsContext);
  const { characters } = useContext(CharactersContext); // <-- Get characters from context

  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // --- UPDATED RENDER FUNCTION ---
  const renderItem = ({ item }) => {
    // Find the character associated with this thread, if any.
    const character = characters.find(c => c.id === item.characterId);
    return (
      <ThreadItem
        item={item}
        character={character} // Pass the character to the item component
        onPress={() => navigation.navigate('Chat', { threadId: item.id, name: item.name })}
        onLongPress={() => {
          setSelectedThread(item);
          setActionModalVisible(true);
        }}
      />
    );
  };

  const handleDelete = () => {
    deleteThread(selectedThread.id);
    setActionModalVisible(false);
  };

  const handleRename = () => {
    setRenameInput(selectedThread.name);
    setActionModalVisible(false);
    setRenameModalVisible(true);
  };

  const saveRename = () => {
    renameThread(selectedThread.id, renameInput.trim() || selectedThread.name);
    setRenameModalVisible(false);
  };

  const displayedThreads = threads.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.listHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <Ionicons name="arrow-back-outline" size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.listTitle}>All Conversations</Text>
        <View style={{ width: 24 + 8 * 2 }} />{/* Placeholder for balance */}
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations…"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      {threads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No chats yet.</Text>
        </View>
      ) : (
        <FlatList
          data={displayedThreads}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.threadsListContainer}
        />
      )}
      <Modal transparent visible={actionModalVisible} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setActionModalVisible(false)}>
          <View style={styles.actionModal}>
            <Text style={styles.modalTitle}>Thread Actions</Text>
            <TouchableOpacity style={styles.actionBtn} onPress={handleRename}>
              <Ionicons name="pencil-outline" size={20} color="#1E293B" style={styles.actionIcon} />
              <Text style={styles.actionText}>Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" style={styles.actionIcon} />
              <Text style={[styles.actionText, styles.deleteActionText]}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.cancelActionBtn]} onPress={() => setActionModalVisible(false)}>
              <Text style={styles.actionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal transparent visible={renameModalVisible} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setRenameModalVisible(false)}>
          <View style={styles.renameModal}>
            <Text style={styles.modalTitle}>Rename Chat</Text>
            <TextInput
              style={styles.renameInput}
              value={renameInput}
              onChangeText={setRenameInput}
              placeholder="Enter new name"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.renameBtns}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonSecondary]} onPress={() => setRenameModalVisible(false)}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={saveRename}>
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  headerIconButton: { padding: 8 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff' },
  searchInput: { backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 16, height: 40, fontSize: 16, color: '#1E293B' },
  threadsListContainer: { paddingVertical: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 8, fontSize: 16, color: '#64748B' },
  threadCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2 },
    }),
  },
  threadCardContent: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  threadIconContainer: { // Renamed for clarity
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  threadAvatarImage: { // New style for the avatar image
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  threadTextContainer: { flex: 1 },
  threadTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  threadSnippet: { fontSize: 14, color: '#64748B', marginTop: 4 },
  threadTime: { fontSize: 12, color: '#94A3B8', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginBottom: 16, textAlign: 'center' },
  actionModal: { width: width * 0.85, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, },
  actionIcon: { marginRight: 12 },
  actionText: { fontSize: 16, color: '#1E293B', },
  deleteActionText: { color: '#DC2626' },
  cancelActionBtn: { borderTopWidth: 1, borderColor: '#F1F5F9', marginTop: 8, paddingTop: 14 },
  renameModal: { width: width * 0.85, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  renameInput: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#1E293B', marginBottom: 20 },
  renameBtns: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, marginLeft: 10, minWidth: 80, alignItems: 'center' },
  modalButtonPrimary: { backgroundColor: '#6366F1' },
  modalButtonSecondary: { backgroundColor: '#E2E8F0' },
  modalButtonText: { fontSize: 16, color: '#fff', fontWeight: '500' },
  modalButtonTextSecondary: { color: '#334155' },
});
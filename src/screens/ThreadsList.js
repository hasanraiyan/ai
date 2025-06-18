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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThreadsContext } from '../contexts/ThreadsContext';
import { styles } from '../styles/globalStyles';

function ThreadsList({ navigation }) {
  const { threads, createThread, renameThread, deleteThread } = useContext(ThreadsContext);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const renderItem = ({ item }) => {
    const last = item.messages[item.messages.length - 1];
    const snippet = last
      ? last.text.slice(0, 40) + (last.text.length > 40 ? '…' : '')
      : 'No messages yet';
    return (
      <TouchableOpacity
        style={styles.threadCard}
        onPress={() => navigation.navigate('Chat', { threadId: item.id, name: item.name })}
        onLongPress={() => {
          setSelectedThread(item);
          setActionModalVisible(true);
        }}
      >
        <View style={styles.threadCardContent}>
          <View style={styles.threadIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#6366F1" />
          </View>
          <View style={styles.threadTextContainer}>
            <Text style={styles.threadTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.threadSnippet} numberOfLines={1}>{snippet}</Text>
          </View>
          {last && <Text style={styles.threadTime}>{last.ts}</Text>}
        </View>
      </TouchableOpacity>
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
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.headerIconButton}>
          <Ionicons name="menu-outline" size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.listTitle}>Conversations</Text>
        <TouchableOpacity
          onPress={() => {
            const id = createThread();
            navigation.navigate('Chat', { threadId: id, name: 'New Chat' });
          }}
          style={styles.headerIconButton}
        >
          <Ionicons name="add-circle" size={28} color="#6366F1" />
        </TouchableOpacity>
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
          <Text style={styles.emptyText}>No chats yet. Tap + to start.</Text>
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

export default ThreadsList;
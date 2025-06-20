// src/screens/CharacterSelectScreen.js
import React, { useContext, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { CharactersContext } from '../contexts/CharactersContext';
import { useTheme, spacing, typography } from '../utils/theme';
import ScreenHeader from '../components/ScreenHeader';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const CARD_MARGIN = spacing.sm;
const CARD_WIDTH = (width - spacing.md * 2 - CARD_MARGIN * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// --- FIX: Moved the getStyles function to the top-level scope ---
// This allows any component within this file to use it to create a styles object.
const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  grid: { padding: spacing.md },
  card: {
    marginBottom: CARD_MARGIN,
    marginHorizontal: CARD_MARGIN / 2,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  avatar: {
    width: CARD_WIDTH - spacing.md * 2,
    height: CARD_WIDTH - spacing.md * 2,
    borderRadius: 12,
    marginBottom: spacing.md,
    backgroundColor: theme.colors.imagePlaceholder,
  },
  name: { fontSize: typography.h2, fontWeight: '700', marginBottom: spacing.xs },
  description: { fontSize: typography.small, lineHeight: 18 },
  fab: {
    position: 'absolute', margin: spacing.lg, right: 0, bottom: 0,
    width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  actionModal: { width: width * 0.85, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  actionIcon: { marginRight: 12 },
  actionText: { fontSize: 16 },
  cancelActionBtn: { borderTopWidth: 1, marginTop: 8, paddingTop: 14, justifyContent: 'center' },
});


const CharacterCard = ({ item, onPress, onLongPress }) => {
  const theme = useTheme();
  // --- FIX: Create a local styles object inside this component's scope ---
  const styles = getStyles(theme); 
  
  return (
    <TouchableOpacity
      style={[styles.card, { width: CARD_WIDTH, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[styles.description, { color: theme.colors.subtext }]} numberOfLines={2}>{item.description}</Text>
    </TouchableOpacity>
  );
};

export default function CharacterSelectScreen({ navigation }) {
  const { createThread } = useContext(ThreadsContext);
  const { characters, deleteCharacter } = useContext(CharactersContext);
  const theme = useTheme();
  // --- FIX: Create a local styles object inside this component's scope ---
  const styles = getStyles(theme); 

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  const handleSelectCharacter = (character) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const initialMessages = [
        { id: `u-system-${Date.now()}`, text: character.systemPrompt, role: 'user', isHidden: true },
        { id: `a-system-${Date.now()}`, text: character.greeting, role: 'model', characterId: character.id },
    ];
    const newThreadId = createThread(character.name, initialMessages, character.id);
    navigation.navigate('Chat', { threadId: newThreadId, name: character.name });
  };

  const handleLongPress = (character) => {
    setSelectedCharacter(character);
    setModalVisible(true);
  };
  
  const handleEdit = () => {
    if (!selectedCharacter) return;
    setModalVisible(false);
    navigation.navigate('CharacterEditor', { character: selectedCharacter });
  };
  
  const handleDelete = () => {
    if (!selectedCharacter) return;
    setModalVisible(false);
    Alert.alert(
      "Delete Character?",
      `Are you sure you want to delete "${selectedCharacter.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteCharacter(selectedCharacter.id) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        navigation={navigation}
        title="Characters"
        subtitle="Select a persona to chat with"
      />
      <FlatList
        data={characters}
        numColumns={NUM_COLUMNS}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <CharacterCard
            item={item}
            onPress={() => handleSelectCharacter(item)}
            onLongPress={() => handleLongPress(item)}
          />
        )}
      />
      
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.accent }]}
        onPress={() => navigation.navigate('CharacterEditor')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      
      <Modal transparent visible={modalVisible} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={[styles.actionModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedCharacter?.name}</Text>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleEdit}
              disabled={selectedCharacter?.isDefault}
            >
              <Ionicons name="pencil-outline" size={20} color={selectedCharacter?.isDefault ? theme.colors.subtext : theme.colors.text} style={styles.actionIcon} />
              <Text style={[styles.actionText, selectedCharacter?.isDefault && { color: theme.colors.subtext }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleDelete}
              disabled={selectedCharacter?.isDefault}
            >
              <Ionicons name="trash-outline" size={20} color={selectedCharacter?.isDefault ? "#9CA3AF" : "#DC2626"} style={styles.actionIcon} />
              <Text style={[styles.actionText, { color: selectedCharacter?.isDefault ? "#9CA3AF" : "#DC2626" }]}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.cancelActionBtn, { borderTopColor: theme.colors.border }]} onPress={() => setModalVisible(false)}>
              <Text style={[styles.actionText, {color: theme.colors.accent}]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
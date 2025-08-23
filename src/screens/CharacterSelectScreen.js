import React, { useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { CharactersContext } from '../contexts/CharactersContext';
import { useTheme, spacing, typography } from '../utils/theme';
import ScreenHeader from '../components/ScreenHeader';
import { debounce } from 'lodash';

// --- Reusable Components ---

const EmptyState = ({ onCreateCharacter, isSearchEmpty = false }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const title = isSearchEmpty ? "No Results Found" : "Create Your First Character";
  const subtitle = isSearchEmpty
    ? "Try a different search term or clear the filter to see all characters."
    : "Bring your conversations to life by creating Axion characters with unique personalities and voices.";

  return (
    <ScrollView contentContainerStyle={styles.emptyScrollContainer}>
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconBg, { backgroundColor: theme.colors.accent20 }]}>
          <Ionicons name={isSearchEmpty ? "search-outline" : "people-outline"} size={56} color={theme.colors.accent} />
        </View>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptySubtitle}>{subtitle}</Text>
        {!isSearchEmpty && (
          <TouchableOpacity style={styles.emptyButton} onPress={onCreateCharacter} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#fff" style={styles.emptyButtonIcon} />
            <Text style={styles.emptyButtonText}>Create Character</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const AnimatedCharacterCard = ({ item, onPress, onLongPress, onChatPress, index }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [imageError, setImageError] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true }).start();
    Animated.timing(translateY, { toValue: 0, duration: 400, delay: index * 100, useNativeDriver: true }).start();
  }, [opacity, translateY, index]);

  const hasAvatar = item.avatarUrl && !imageError;
  const initials = item.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable style={styles.card} onPress={onPress} onLongPress={onLongPress}>
        <View style={styles.cardImageContainer}>
          {hasAvatar ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.cardImage} onError={() => setImageError(true)} />
          ) : (
            <View style={[styles.cardImagePlaceholder, { backgroundColor: theme.colors.accent20 }]}>
              <Text style={[styles.cardImageInitials, { color: theme.colors.accent }]}>{initials}</Text>
            </View>
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.cardGradient} />
          <View style={styles.cardOverlay}>
            <View style={styles.cardTextContainer}>
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            </View>
            <TouchableOpacity style={styles.chatButton} onPress={onChatPress} activeOpacity={0.8}>
              <Text style={styles.chatButtonText}>Chat</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const ActionSheetModal = ({ visible, onClose, character, onEdit, onDelete }) => {
    const theme = useTheme();
    const styles = getStyles(theme);
    if (!character) return null;
    const isDefault = character.isDefault;

    return (
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable style={[styles.actionSheet, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.actionSheetHandle, { backgroundColor: theme.colors.border }]} />
            <Text style={styles.modalTitle}>{character.name}</Text>
            <TouchableOpacity onPress={onEdit} disabled={isDefault} style={[styles.actionBtn, isDefault && styles.disabled]}>
              <Ionicons name="pencil-outline" size={22} color={isDefault ? theme.colors.subtext : theme.colors.text} />
              <Text style={[styles.actionText, isDefault && {color: theme.colors.subtext}]}>Edit Character</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} disabled={isDefault} style={[styles.actionBtn, isDefault && styles.disabled]}>
              <Ionicons name="trash-outline" size={22} color={isDefault ? theme.colors.subtext : (theme.colors.danger || '#EF4444')} />
              <Text style={[styles.actionText, { color: isDefault ? theme.colors.subtext : (theme.colors.danger || '#EF4444') }]}>Delete Character</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
};

// --- Main Screen ---

export default function CharacterSelectScreen({ navigation }) {
  const { createThread } = useContext(ThreadsContext);
  const { characters, deleteCharacter } = useContext(CharactersContext);
  const theme = useTheme();
  const styles = getStyles(theme);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');

  // Debounce the search query to improve performance
  const debouncedSetSearchQuery = useCallback(debounce(setSearchQuery, 300), []);

  const handleSearchChange = (text) => {
    setSearchInputValue(text);
    debouncedSetSearchQuery(text);
  };

  const filteredCharacters = useMemo(() => {
    if (!searchQuery) return characters;
    const lowercasedQuery = searchQuery.toLowerCase();
    return characters.filter(
      (char) =>
        char.name.toLowerCase().includes(lowercasedQuery) ||
        char.description.toLowerCase().includes(lowercasedQuery)
    );
  }, [characters, searchQuery]);

  const handleSelectCharacter = useCallback((character) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const initialMessages = [
        { id: `u-system-${Date.now()}`, text: character.systemPrompt, role: 'user', isHidden: true },
        { id: `a-system-${Date.now()}`, text: character.greeting, role: 'model', characterId: character.id, ts },
    ];
    const newThreadId = createThread(character.name, initialMessages, character.id);
    navigation.navigate('Chat', { threadId: newThreadId, name: character.name });
  }, [createThread, navigation]);

  const handleLongPress = useCallback((character) => {
    setSelectedCharacter(character);
    setModalVisible(true);
  }, []);

  const handleEdit = useCallback(() => {
    if (!selectedCharacter) return;
    setModalVisible(false);
    // Use a short timeout to allow the modal to close before navigating
    setTimeout(() => {
      navigation.navigate('CharacterEditor', { character: selectedCharacter });
    }, 150);
  }, [selectedCharacter, navigation]);

  const handleDelete = useCallback(() => {
    if (!selectedCharacter) return;
    setModalVisible(false);
    setTimeout(() => {
      Alert.alert(
        "Delete Character",
        `Are you sure you want to delete "${selectedCharacter.name}"? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteCharacter(selectedCharacter.id) },
        ]
      );
    }, 150);
  }, [selectedCharacter, deleteCharacter]);

  const renderCharacter = useCallback(({ item, index }) => (
    <AnimatedCharacterCard
      item={item}
      index={index}
      onPress={() => handleLongPress(item)}
      onLongPress={() => handleLongPress(item)}
      onChatPress={() => handleSelectCharacter(item)}
    />
  ), [handleSelectCharacter, handleLongPress]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Header is part of this screen, so offset might not be needed or needs careful adjustment
      >
        <ScreenHeader navigation={navigation} title="Characters" subtitle={`${characters.length} available to chat`} />

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.subtext} style={styles.searchIcon} />
          <TextInput
          style={styles.searchInput}
          placeholder="Search characters by name or description..."
          placeholderTextColor={theme.colors.subtext}
          value={searchInputValue}
          onChangeText={handleSearchChange}
          clearButtonMode="while-editing"
        />
        {searchInputValue.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')} style={styles.clearIcon}>
            <Ionicons name="close-circle" size={20} color={theme.colors.subtext} />
          </TouchableOpacity>
        )}
      </View>

      {characters.length === 0 && !searchQuery ? (
        <EmptyState onCreateCharacter={() => navigation.navigate('CharacterEditor')} />
      ) : (
        <FlatList
          data={filteredCharacters}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={renderCharacter}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState isSearchEmpty={true} />}
        />
      )}

      {characters.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CharacterEditor')} activeOpacity={0.8}>
          <Ionicons name="add" size={32} color={theme.colors.fabText || '#fff'} />
        </TouchableOpacity>
      )}

      <ActionSheetModal visible={modalVisible} onClose={() => setModalVisible(false)} character={selectedCharacter} onEdit={handleEdit} onDelete={handleDelete}/>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles ---

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  // Search Bar
  searchContainer: { marginHorizontal: spacing.md, marginBottom: spacing.sm, justifyContent: 'center' },
  searchInput: { backgroundColor: theme.colors.card, borderRadius: 12, paddingVertical: spacing.sm + 4, paddingLeft: 44, paddingRight: 40, fontSize: typography.body, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border },
  searchIcon: { position: 'absolute', left: 14, zIndex: 1 },
  clearIcon: { position: 'absolute', right: 14, zIndex: 1 },
  // List
  listContainer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 120 },
  // FAB

  fab: { position: 'absolute', right:spacing.md, bottom: spacing.md, width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.fabBg, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  // Character Card
  card: { borderRadius: 24, marginBottom: spacing.lg, overflow: 'hidden', elevation: 6, backgroundColor: theme.colors.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  cardImageContainer: { width: '100%', aspectRatio: 3 / 4, backgroundColor: theme.colors.imagePlaceholder, justifyContent: 'flex-end' },
  cardImage: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  cardImagePlaceholder: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  cardImageInitials: { fontSize: 64, fontWeight: 'bold' },
  cardGradient: { ...StyleSheet.absoluteFillObject },
  cardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  cardTextContainer: { flex: 1, marginRight: spacing.md },
  name: { fontSize: typography.h2, fontWeight: 'bold', color: '#FFFFFF', textShadowColor: 'rgba(0, 0, 0, 0.7)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  description: { fontSize: typography.body - 1, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 20, marginTop: spacing.xs },
  chatButton: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 20, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' },
  chatButtonText: { fontSize: typography.body, fontWeight: 'bold', color: theme.colors.accent, marginRight: spacing.xs },
  // Empty State
  emptyScrollContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', padding: spacing.xl, paddingBottom: 80 },
  emptyIconBg: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl },
  emptyTitle: { fontSize: typography.h1 + 2, fontWeight: 'bold', color: theme.colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  emptySubtitle: { fontSize: typography.body, color: theme.colors.subtext, textAlign: 'center', lineHeight: 24, maxWidth: '90%', marginBottom: spacing.xl },
  emptyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.accent, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: 30 },
  emptyButtonIcon: { marginRight: spacing.sm },
  emptyButtonText: { color: '#fff', fontSize: typography.body, fontWeight: '700' },
  // Action Sheet Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.md, paddingBottom: spacing.xl + spacing.md },
  actionSheetHandle: { width: 40, height: 5, borderRadius: 2.5, backgroundColor: theme.colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: typography.h2, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: spacing.lg },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: 12, marginVertical: spacing.xs },
  actionText: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginLeft: spacing.md },
  disabled: { opacity: 0.5 },
});
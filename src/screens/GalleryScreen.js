import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  RefreshControl,
  Modal,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';

const IMAGE_DIR = `${FileSystem.documentDirectory}ai_generated_images/`;
const { width, height } = Dimensions.get('window');
const numColumns = 2;
const padding = 16;
const spacing = 12;
const itemSize = (width - padding * 2 - spacing) / numColumns;
const imageHeight = itemSize * 0.9;

async function ensureDirExists() {
  const info = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

export default function GalleryScreen({ navigation }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();
  const [refreshing, setRefreshing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState(null);
  const [mediaPerm, requestPerm] = MediaLibrary.usePermissions();

  const loadImages = useCallback(async () => {
    setError(null);
    if (!refreshing) setLoading(true);

    try {
      await ensureDirExists();
      const files = await FileSystem.readDirectoryAsync(IMAGE_DIR);
      const pics = files
        .filter(f => /\.(jpe?g|png)$/i.test(f))
        .map(f => ({ id: f, uri: IMAGE_DIR + f }));

      const withStats = await Promise.all(
        pics.map(async p => {
          try {
            const st = await FileSystem.getInfoAsync(p.uri, { size: false });
            return { ...p, time: st.modificationTime || 0 };
          } catch {
            return { ...p, time: 0 };
          }
        })
      );
      withStats.sort((a, b) => b.time - a.time);
      setImages(withStats);
    } catch (e) {
      console.error(e);
      setError('Couldn’t load images');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadImages);
    loadImages();
    return unsub;
  }, [loadImages, navigation]);

  // SHARE
  async function onShare(uri) {
    closeSheet();
    if (!(await Sharing.isAvailableAsync())) {
      return Alert.alert('Sharing not available');
    }
    try {
      await Sharing.shareAsync(uri, { dialogTitle: 'Share Image' });
    } catch {
      Alert.alert('Couldn’t share');
    }
  }

  // DELETE
  function onDelete(item) {
    closeSheet();
    Alert.alert('Delete image?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await FileSystem.deleteAsync(item.uri, { idempotent: true });
            setImages(imgs => imgs.filter(i => i.id !== item.id));
            Toast.show({ type: 'success', text1: 'Deleted' });
            if (selected?.id === item.id) closeSheet();
          } catch {
            Alert.alert('Failed to delete');
          }
        }
      }
    ]);
  }

  // DOWNLOAD
  async function onDownload(uri) {
    closeSheet();
    let { granted } = mediaPerm || {};
    if (!granted) {
      const res = await requestPerm();
      granted = res.granted;
    }
    if (!granted) {
      return Alert.alert('Permission needed to save');
    }
    try {
      const asset = await MediaLibrary.createAssetAsync(uri);
      const album = await MediaLibrary.getAlbumAsync('AI Generated');
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync('AI Generated', asset, false);
      }
      Toast.show({ type: 'success', text1: 'Saved to gallery' });
    } catch {
      Alert.alert('Couldn’t save');
    }
  }

  function openSheet(item) {
    setSelected(item);
    setSheetVisible(true);
  }

  function closeSheet() {
    setSheetVisible(false);
    setTimeout(() => setSelected(null), 300);
  }

  function renderItem({ item, index }) {
    const isLeft = index % numColumns === 0;
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            marginLeft: isLeft ? padding : spacing / 2,
            marginRight: isLeft ? spacing / 2 : padding,
          }
        ]}
        activeOpacity={0.8}
        onPress={() => openSheet(item)}
      >
        <Image source={{ uri: item.uri }} style={styles.thumb} />
        <View style={styles.infoBar}>
          <Text style={styles.date}>
            {item.time
              ? new Date(item.time * 1000).toLocaleDateString()
              : 'Unknown'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // LOADING
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.status}>Loading images…</Text>
      </SafeAreaView>
    );
  }

  // ERROR
  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={60} color="#dc2626" />
        <Text style={[styles.status, { color: '#dc2626' }]}>{error}</Text>
        <TouchableOpacity onPress={loadImages} style={styles.btnPrimary}>
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu-outline" size={28} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.title}>AI Image Gallery</Text>
        <View style={{ width: 28 }} />
      </View>

      {images.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={80} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No images yet</Text>
          <Text style={styles.emptySub}>
            Your AI-generated images will show up here.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ChatScreen')}
            style={styles.btnPrimary}
          >
            <Text style={styles.btnText}>Generate One</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderItem}
          keyExtractor={i => i.id}
          numColumns={numColumns}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => setRefreshing(true)}
              tintColor="#6366F1"
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

   

      {/* Bottom-sheet Modal */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <Pressable style={styles.overlay} onPress={closeSheet} />
        <View style={styles.sheet}>
          {selected && (
            <>
              <Image
                source={{ uri: selected.uri }}
                style={styles.preview}
                resizeMode="contain"
              />
              <View style={styles.sheetInfo}>
                <Text style={styles.sheetName}>{selected.id}</Text>
                {selected.time > 0 && (
                  <Text style={styles.sheetDate}>
                    {new Date(selected.time * 1000).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <View style={styles.sheetActions}>
                <TouchableOpacity onPress={() => onShare(selected.uri)}>
                  <Ionicons name="share-social" size={28} color="#475569" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDownload(selected.uri)}>
                  <Ionicons name="download" size={28} color="#475569" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(selected)}>
                  <Ionicons name="trash" size={28} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>

      <Toast position="bottom" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: padding
  },
  status: { marginTop: 12, fontSize: 16, color: '#475569' },

  header: {
    flexDirection: 'row',
    padding: padding,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 }
      },
      android: { elevation: 3 }
    })
  },
  title: { fontSize: 20, fontWeight: '600', color: '#1E293B' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: padding },
  emptyTitle: { marginTop: 20, fontSize: 22, fontWeight: '600', color: '#64748B' },
  emptySub: { marginTop: 8, fontSize: 15, color: '#9CA3AF', textAlign: 'center' },

  btnPrimary: {
    marginTop: 24,
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  card: {
    marginTop: spacing,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    width: itemSize,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 }
      },
      android: { elevation: 3 }
    })
  },
  thumb: { width: '100%', height: imageHeight, backgroundColor: '#E2E8F0' },
  infoBar: {
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center'
  },
  date: { fontSize: 12, color: '#475569' },

  // Bottom-sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  sheet: {
    backgroundColor: '#fff',
    padding: padding,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  preview: {
    width: '100%',
    height: height * 0.4,
    backgroundColor: '#E2E8F0',
    borderRadius: 8
  },
  sheetInfo: {
    marginTop: 12,
    alignItems: 'center'
  },
  sheetName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  sheetDate: { marginTop: 4, fontSize: 13, color: '#475569' },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingHorizontal: 32
  }
});
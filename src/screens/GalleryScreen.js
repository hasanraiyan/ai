// GalleryScreen.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, AntDesign, Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';
import { BlurView } from 'expo-blur';
import ImageViewing from 'react-native-image-viewing';

const IMAGE_DIR = `${FileSystem.documentDirectory}ai_generated_images/`;
const { width, height } = Dimensions.get('window');
const numColumns = 2;
const padding = 16;
const spacing = 12;
const cardWidth = (width - padding * 2 - spacing) / numColumns;
const listImageHeight = 200;

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
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mediaPerm, requestPerm] = MediaLibrary.usePermissions();
  const scrollY = useRef(new Animated.Value(0)).current;

  const loadImages = useCallback(async () => {
    setError(null);
    if (!refreshing) setLoading(true);

    try {
      await ensureDirExists();
      const files = await FileSystem.readDirectoryAsync(IMAGE_DIR);
      const imageFiles = files.filter(f => /\.(jpe?g|png)$/i.test(f));

      const details = await Promise.all(
        imageFiles.map(async fn => {
          const uri = IMAGE_DIR + fn;
          const id = fn.split('.')[0];
          const metaUri = `${IMAGE_DIR}${id}.json`;
          let prompt = 'Untitled';
          let time = 0;

          const info = await FileSystem.getInfoAsync(uri, { size: false });
          time = info.modificationTime || 0;

          const metaInfo = await FileSystem.getInfoAsync(metaUri);
          if (metaInfo.exists) {
            const txt = await FileSystem.readAsStringAsync(metaUri);
            const md = JSON.parse(txt);
            prompt = md.prompt || prompt;
          }
          return { id: fn, uri, prompt, time };
        })
      );
      details.sort((a, b) => b.time - a.time);
      setImages(details);
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

  async function onShare(uri) {
    setLightboxVisible(false);
    if (!(await Sharing.isAvailableAsync())) {
      return Alert.alert('Sharing not available');
    }
    try {
      await Sharing.shareAsync(uri, { dialogTitle: 'Share Image' });
    } catch {
      Alert.alert('Couldn’t share');
    }
  }

  async function onDownload(uri) {
    setLightboxVisible(false);
    let granted = mediaPerm?.granted;
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

  function onDelete(item) {
    setLightboxVisible(false);
    Alert.alert('Delete image?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const base = item.id.split('.')[0];
            await FileSystem.deleteAsync(item.uri, { idempotent: true });
            await FileSystem.deleteAsync(`${IMAGE_DIR}${base}.json`, { idempotent: true });
            setImages(imgs => imgs.filter(i => i.id !== item.id));
            Toast.show({ type: 'success', text1: 'Deleted' });
          } catch (err) {
            console.error(err);
            Alert.alert('Failed to delete');
          }
        }
      }
    ]);
  }

  function openLightbox(idx) {
    setCurrentIndex(idx);
    setLightboxVisible(true);
  }

  function renderItem({ item, index }) {
    const isGrid = viewMode === 'grid';
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => openLightbox(index)}
        style={[
          styles.card,
          isGrid ? { width: cardWidth, height: cardWidth } : { width: '100%', height: listImageHeight },
          { marginLeft: isGrid ? spacing / 2 : 0, marginRight: isGrid ? spacing / 2 : 0, marginBottom: spacing }
        ]}
      >
        <BlurView intensity={20} tint="light" style={styles.blur}>
          <ActivityIndicator size="small" color="#888" />
        </BlurView>
        <Image
          source={{ uri: item.uri }}
          style={isGrid ? styles.gridImage : styles.listImage}
          resizeMode="cover"
        />
        <View style={styles.heart}>
          <Ionicons name="heart-outline" size={20} color="#F06292" />
        </View>
      </TouchableOpacity>
    );
  }

  const imageURLs = images.map(img => ({ uri: img.uri }));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <Animated.View style={[styles.header]}>
        <TouchableOpacity onPress={navigation.openDrawer}>
          <Ionicons name="menu-outline" size={28} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.title}>AI Gallery</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => setViewMode(v => (v === 'grid' ? 'list' : 'grid'))}>
            <Ionicons name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'} size={24} color="#475569" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.status}>Loading images…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={60} color="#dc2626" />
          <Text style={[styles.status, { color: '#dc2626' }]}>{error}</Text>
          <TouchableOpacity onPress={loadImages} style={styles.btnPrimary}>
            <Text style={styles.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : images.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={80} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No images yet</Text>
          <Text style={styles.emptySub}>Tap “+” to generate your first AI masterpiece.</Text>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderItem}
          keyExtractor={i => i.id}
          numColumns={viewMode === 'grid' ? numColumns : 1}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadImages();
              }}
              tintColor="#6366F1"
            />
          }
          contentContainerStyle={{ padding: spacing }}
        />
      )}

      {/* Floating Action Button */}
      <Animated.View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('ImageGeneration')}
        >
          <AntDesign name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Lightbox */}
      <ImageViewing
        images={imageURLs}
        imageIndex={currentIndex}
        visible={lightboxVisible}
        onRequestClose={() => setLightboxVisible(false)}
        FooterComponent={({ imageIndex }) => (
          <View style={styles.lightboxFooter}>
            <Text style={styles.prompt}>{images[imageIndex].prompt}</Text>
            <Text style={styles.date}>
              {new Date(images[imageIndex].time * 1000).toLocaleString()}
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => onShare(images[imageIndex].uri)}>
                <Feather name="share-2" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDownload(images[imageIndex].uri)}>
                <Feather name="download" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(images[imageIndex])}>
                <Feather name="trash-2" size={24} color="#E57373" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Toast position="bottom" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
  headerIcons: { flexDirection: 'row', width: 40, justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: padding },
  status: { marginTop: 12, fontSize: 16, color: '#475569' },
  btnPrimary: {
    marginTop: 16,
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptyTitle: { marginTop: 16, fontSize: 22, fontWeight: '600', color: '#64748B' },
  emptySub: { marginTop: 8, fontSize: 15, color: '#9CA3AF', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden'
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(240,240,240,0.6)'
  },
  gridImage: {
    width: '100%',
    height: '100%'
  },
  listImage: {
    width: '100%',
    height: listImageHeight
  },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    padding: 4
  },
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 24
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 }
      },
      android: { elevation: 5 }
    })
  },
  lightboxFooter: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  prompt: { color: '#fff', fontSize: 16 },
  date: { color: '#ccc', fontSize: 12, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12
  }
});
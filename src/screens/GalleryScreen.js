// screens/GalleryScreen.js

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  RefreshControl,
  Clipboard,
  ToastAndroid,
  Pressable,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';
import ImageViewing from 'react-native-image-viewing';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme, spacing } from '../utils/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const IMAGE_DIR = `${FileSystem.documentDirectory}ai_generated_images/`;
const { width } = Dimensions.get('window');

const PADDING = spacing.md;
const SPACING = spacing.sm;
const HALF_WIDTH = (width - PADDING * 2 - SPACING) / 2;
const FULL_WIDTH = width - PADDING * 2;

async function ensureDirExists() {
  const info = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

export default function GalleryScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mediaPerm, requestPerm] = MediaLibrary.usePermissions();
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);

  const loadImages = useCallback(async () => {
    setError(null);
    if (!refreshing) setLoading(true);

    try {
      await ensureDirExists();
      const files = await FileSystem.readDirectoryAsync(IMAGE_DIR);
      const imageFiles = files.filter(f => /\.(jpe?g|png)$/i.test(f));

      const data = await Promise.all(
        imageFiles.map(async fn => {
          const uri = IMAGE_DIR + fn;
          const base = fn.split('.')[0];
          const metaUri = `${IMAGE_DIR}${base}.json`;

          let metadata = {
            id: fn, uri, prompt: 'Untitled', fullPrompt: 'Untitled',
            styleName: 'N/A', modelUsed: 'N/A', time: 0,
            size: { width: 512, height: 512 }, imageUrl: '',
            imageGenModel: 'flux', // Default for old images
          };

          const info = await FileSystem.getInfoAsync(uri, { size: false });
          metadata.time = info.modificationTime || 0;

          const mInfo = await FileSystem.getInfoAsync(metaUri);
          if (mInfo.exists) {
            const txt = await FileSystem.readAsStringAsync(metaUri);
            const mdFromFile = JSON.parse(txt);
            mdFromFile.size = mdFromFile.size || { width: 512, height: 512 };
            metadata = { ...metadata, ...mdFromFile };
            metadata.time = mdFromFile.creationTimestamp || metadata.time;
          }
          return metadata;
        })
      );

      data.sort((a, b) => b.time - a.time);
      setImages(data);
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
    return unsub;
  }, [loadImages, navigation]);
  
  // Also load images on initial mount
  useEffect(() => {
      loadImages();
  },[]);


  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadImages();
  }, [loadImages]);

  const groupedRows = useMemo(() => {
    const rows = [];
    let i = 0;
    while (i < images.length) {
      const currentImage = images[i];
      const isLandscape = (currentImage.size.width / currentImage.size.height) > 1.2;

      if (isLandscape) {
        rows.push([currentImage]); i++; continue;
      }
      
      const nextImage = images[i + 1];
      if (nextImage) {
        const nextIsLandscape = (nextImage.size.width / nextImage.size.height) > 1.2;
        if (nextIsLandscape) {
          rows.push([currentImage]); i++;
        } else {
          rows.push([currentImage, nextImage]); i += 2;
        }
      } else {
        rows.push([currentImage]); i++;
      }
    }
    return rows;
  }, [images]);

  async function onShare(uri) {
    await Sharing.shareAsync(uri, { dialogTitle: 'Share Image' }).catch(() => Alert.alert('Couldn’t share'));
  }

  async function onDownload(uri) {
    if (!mediaPerm?.granted) {
      const { granted } = await requestPerm();
      if (!granted) return Alert.alert('Permission needed to save');
    }
    try {
      const asset = await MediaLibrary.createAssetAsync(uri);
      let album = await MediaLibrary.getAlbumAsync('AI Generated');
      if (!album) {
        album = await MediaLibrary.createAlbumAsync('AI Generated', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }
      Toast.show({ type: 'success', text1: 'Saved to gallery' });
    } catch {
      Alert.alert('Couldn’t save');
    }
  }

  function onDelete(item) {
    setLightboxVisible(false);
    Alert.alert('Delete Image?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await ensureDirExists();
            const base = item.id.split('.')[0];
            await FileSystem.deleteAsync(item.uri, { idempotent: true });
            await FileSystem.deleteAsync(`${IMAGE_DIR}${base}.json`, { idempotent: true });
            setImages(imgs => imgs.filter(i => i.id !== item.id));
            Toast.show({ type: 'success', text1: 'Deleted' });
          } catch (err) {
            Alert.alert('Failed to delete');
          }
        }
      }
    ]);
  }

  function onCopyUrl(url) {
    if (!url) return Toast.show({ type: 'error', text1: 'No URL available' });
    Clipboard.setString(url);
    if (Platform.OS === 'android') ToastAndroid.show('URL Copied!', ToastAndroid.SHORT);
    else Toast.show({ type: 'success', text1: 'URL Copied!' });
  }

  function openLightbox(item) {
    const originalIndex = images.findIndex(img => img.id === item.id);
    if (originalIndex > -1) {
      setCurrentIndex(originalIndex);
      setIsOverlayVisible(false);
      setLightboxVisible(true);
    }
  }

  const renderRow = ({ item: row }) => (
    <View style={styles.row}>
      {row.map(imageItem => {
        const containerWidth = row.length === 2 ? HALF_WIDTH : FULL_WIDTH;
        const cardHeight = (containerWidth / imageItem.size.width) * imageItem.size.height;
        return (
          <TouchableOpacity
            key={imageItem.id}
            onPress={() => openLightbox(imageItem)}
            activeOpacity={0.8}
            style={[styles.card, { width: containerWidth, height: cardHeight }]}
          >
            <Image source={{ uri: imageItem.uri }} style={styles.image} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
  
  const renderContent = () => {
    if (loading && !refreshing) {
      return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /><Text style={styles.status}>Loading images…</Text></View>;
    }
    if (error) {
      return <View style={styles.center}><Ionicons name="alert-circle-outline" size={60} color={colors.danger} /><Text style={[styles.status, { color: colors.danger }]}>{error}</Text><TouchableOpacity onPress={loadImages} style={styles.btnPrimary}><Text style={styles.btnText}>Retry</Text></TouchableOpacity></View>;
    }
    if (images.length === 0) {
      return <View style={styles.center}><Ionicons name="images-outline" size={80} color={colors.emptyIcon} /><Text style={styles.emptyTitle}>No images yet</Text><Text style={styles.emptySub}>Tap the '+' button to generate your first masterpiece.</Text></View>;
    }
    return (
        <FlatList
          key={viewMode}
          data={viewMode === 'grid' ? groupedRows : images}
          keyExtractor={(item, index) => viewMode === 'grid' ? `row-${index}` : item.id}
          renderItem={viewMode === 'grid' ? renderRow : ({ item }) => renderRow({ item: [item] })}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          contentContainerStyle={{ paddingHorizontal: PADDING, paddingTop: PADDING }}
          showsVerticalScrollIndicator={false}
        />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        navigation={navigation}
        title="AI Gallery"
        subtitle="Your generated masterpieces"
        rightAction={
          <TouchableOpacity onPress={() => setViewMode(v => (v === 'grid' ? 'list' : 'grid'))}>
            <Ionicons name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'} size={28} color={colors.subtext} />
          </TouchableOpacity>
        }
      />
      
      {renderContent()}

      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ImageGeneration')}>
          <Ionicons name="add" size={24} color={colors.fabText} />
        </TouchableOpacity>
      </View>

      <ImageViewing
        images={images.map(img => ({ uri: img.uri }))}
        imageIndex={currentIndex}
        visible={lightboxVisible}
        onRequestClose={() => setLightboxVisible(false)}
        FooterComponent={({ imageIndex }) => {
          const currentImage = images[imageIndex];
          if (!currentImage) return null;

          const handleToggleOverlay = () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsOverlayVisible(!isOverlayVisible);
          };
          
          const imageGenModel = currentImage.imageGenModel || 'flux'; // Default to flux for older images
          const modelIcon = imageGenModel === 'turbo' ? 'rocket-outline' : 'flash-outline';
          const modelName = imageGenModel.charAt(0).toUpperCase() + imageGenModel.slice(1);

          return (
            <Pressable onPress={handleToggleOverlay}>
              <View style={styles.lightboxFooter}>
                <Text numberOfLines={isOverlayVisible ? 2 : 1} style={styles.prompt}>
                  {currentImage.fullPrompt || currentImage.prompt}
                </Text>
                
                {isOverlayVisible ? (
                  <>
                    <View style={styles.metadataRow}>
                      <View style={styles.metadataChip}><Ionicons name="color-palette-outline" size={14} color="#ccc" style={styles.chipIcon} /><Text style={styles.chipText}>{currentImage.styleName || 'N/A'}</Text></View>
                      
                      <View style={styles.metadataChip}>
                        <Ionicons name={modelIcon} size={14} color="#ccc" style={styles.chipIcon} />
                        <Text style={styles.chipText}>{modelName}</Text>
                      </View>

                      <View style={styles.metadataChip}><Ionicons name="resize-outline" size={14} color="#ccc" style={styles.chipIcon} /><Text style={styles.chipText}>{`${currentImage.size?.width || 'N/A'}x${currentImage.size?.height || 'N/A'}`}</Text></View>
                    </View>
                    <Text style={styles.date}>{new Date(currentImage.time).toLocaleString()}</Text>
                    <View style={styles.actions}>
                      <TouchableOpacity onPress={() => onCopyUrl(currentImage.imageUrl)}><Feather name="link" size={24} color="#fff" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => onShare(currentImage.uri)}><Feather name="share-2" size={24} color="#fff" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => onDownload(currentImage.uri)}><Feather name="download" size={24} color="#fff" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => onDelete(currentImage)}><Feather name="trash-2" size={24} color={colors.danger} /></TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={styles.showDetailsHint}>
                    <Ionicons name="chevron-up-outline" size={16} color="#ccc" />
                    <Text style={styles.showDetailsText}>Show Details</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
      />
      <Toast position="bottom" />
    </SafeAreaView>
  );
}

const useStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: PADDING },
  status: { marginTop: 12, fontSize: 16, color: colors.subtext },
  btnPrimary: { marginTop: 16, backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  btnText: { color: colors.fabText, fontSize: 16, fontWeight: '600' },
  emptyTitle: { marginTop: 16, fontSize: 22, fontWeight: '600', color: colors.text },
  emptySub: { marginTop: 8, fontSize: 15, color: colors.subtext, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  image: { width: '100%', height: '100%', backgroundColor: colors.imagePlaceholder },
  fabContainer: { position: 'absolute', bottom: 32, right: 24 },
  fab: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.fabBg, justifyContent: 'center', alignItems: 'center',
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
  },
  lightboxFooter: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  prompt: { color: '#fff', fontSize: 16, fontWeight: '500', marginBottom: 8 },
  metadataRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  metadataChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12, paddingVertical: 4, paddingHorizontal: 8, marginRight: 8, marginBottom: 4
  },
  chipIcon: { marginRight: 4 },
  chipText: { color: '#ccc', fontSize: 12 },
  date: { color: '#aaa', fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  showDetailsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  showDetailsText: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});
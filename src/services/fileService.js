// src/services/fileService.js

import * as FileSystem from 'expo-file-system';
import Toast from 'react-native-toast-message';

const IMAGE_DIR = `${FileSystem.documentDirectory}ai_generated_images/`;

/**
 * Deletes all contents of the AI image directory and then recreates it.
 * Provides user feedback via toast messages.
 */
export const deleteAllImageData = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);

    if (!dirInfo.exists) {
      Toast.show({
        type: 'info',
        text1: 'No Images to Delete',
        text2: 'The image directory is already empty.',
      });
      return;
    }

    console.log('Deleting image directory:', IMAGE_DIR);
    await FileSystem.deleteAsync(IMAGE_DIR, { idempotent: true });

    // Re-create the directory for future use to prevent errors
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
    
    Toast.show({
      type: 'success',
      text1: 'All Image Data Cleared',
      text2: 'Your generated images and metadata have been deleted.',
    });

  } catch (error) {
    console.error("Failed to delete image data:", error);
    Toast.show({
      type: 'error',
      text1: 'Deletion Failed',
      text2: 'Could not clear all image data.',
    });
  }
};
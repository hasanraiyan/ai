// src/services/fileService.js

import { Paths, Directory } from 'expo-file-system';
import Toast from 'react-native-toast-message';
import { systemLogger } from '../utils/logging';
import { LogCategory } from '../utils/logging';

const imageDir = new Directory(Paths.document, 'ai_generated_images');

/**
 * Deletes all contents of the AI image directory and then recreates it.
 * Provides user feedback via toast messages.
 */
export const deleteAllImageData = async () => {
  try {
    if (!imageDir.exists) {
      Toast.show({
        type: 'info',
        text1: 'No Images to Delete',
        text2: 'The image directory is already empty.',
      });
      return;
    }

    if (__DEV__) systemLogger.debug(LogCategory.SYSTEM, 'Deleting image directory', { IMAGE_DIR: imageDir.uri });
    imageDir.delete();

    // Re-create the directory for future use to prevent errors
    imageDir.create({ intermediates: true, idempotent: true });

    Toast.show({
      type: 'success',
      text1: 'All Image Data Cleared',
      text2: 'Your generated images and metadata have been deleted.',
    });

  } catch (error) {
    systemLogger.error(LogCategory.SYSTEM, "Failed to delete image data", {
      error: error.message
    });
    Toast.show({
      type: 'error',
      text1: 'Deletion Failed',
      text2: 'Could not clear all image data.',
    });
  }
};

// src/styles/markdownStyles.js
import { StyleSheet } from 'react-native';

export const markdownStyles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24, color: '#334155' },
  image: {
    // FIX: Change maxWidth to width to satisfy the image component's prop requirements.
    width: '100%', 
    height: 200,
    borderRadius: 8, // Match the bubble's border radius
    marginTop: 8,
    marginBottom: 8,
    resizeMode: 'cover', // Fills the space, might crop
  },
});
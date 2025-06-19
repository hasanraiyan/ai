// src/styles/markdownStyles.js
import { StyleSheet } from 'react-native';

export const markdownStyles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24, color: '#334155' },
  image: {
    // FIX: Changed maxWidth to width to ensure the Image component receives a valid style prop.
    width: '100%', 
    height: 200,
    borderRadius: 8, // Match the bubble's border radius
    marginTop: 8,
    marginBottom: 8,
    resizeMode: 'cover', // Fills the space, might crop
  },
});
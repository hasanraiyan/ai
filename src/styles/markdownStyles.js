import { StyleSheet } from 'react-native';

export const markdownStyles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24, color: '#334155' },
  image: {
    // Make images responsive within the chat bubble
    maxWidth: '100%',
    height: 200,
    borderRadius: 8, // Match the bubble's border radius
    marginTop: 8,
    marginBottom: 8,
    resizeMode: 'cover', // Fills the space, might crop
  },
});
// src/styles/markdownStyles.js
import { StyleSheet } from 'react-native';

export const markdownStyles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24, color: '#334155' },
  image: {
    width: '100%', 
    height: 200,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    resizeMode: 'cover',
  },
});
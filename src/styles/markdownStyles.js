// src/styles/markdownStyles.js
import { StyleSheet } from 'react-native';

export const getMarkdownStyles = (colors) => StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24, color: colors.text },
  heading1: { fontSize: 24, fontWeight: 'bold', color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, marginTop: 16, marginBottom: 8 },
  heading2: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginTop: 12, marginBottom: 4 },
  heading3: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 8 },
  list_item: { marginBottom: 8 },
  bullet_list: { color: colors.subtext },
  ordered_list: { color: colors.subtext },
  blockquote: {
    backgroundColor: colors.emptyBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    marginVertical: 8,
  },
  code_inline: {
    backgroundColor: colors.emptyBg,
    color: colors.text,
    padding: 4,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  code_block: {
    backgroundColor: colors.emptyBg,
    padding: 12,
    borderRadius: 8,
    color: colors.text,
    fontFamily: 'monospace',
  },
  link: {
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    marginTop: 8,
  },
  table_header: {
    backgroundColor: colors.emptyBg,
  },
  table_row: {
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
  },
  table_cell: {
    flex: 1,
    padding: 8,
    color: colors.text,
  },
  image: {
    width: '100%', 
    height: 200,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    resizeMode: 'cover',
    backgroundColor: colors.imagePlaceholder,
  },
});
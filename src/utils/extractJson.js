// src/utils/extractJson.js

/**
 * Extracts a JSON object from a string that may contain other text,
 * like markdown code blocks.
 * @param {string} text The text containing the JSON.
 * @returns {object|null} The parsed JSON object or null if not found/invalid.
 */
const extractJson = (text) => {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Find the first '{' and the last '}' to bound the JSON object
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null;
  }

  const jsonString = text.substring(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse extracted JSON:", e);
    console.error("Original text:", text);
    return null;
  }
};

export { extractJson };
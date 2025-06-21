// src/services/tools.js

import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { encode as btoa } from 'base-64';
import { IS_DEBUG } from '../constants';
/**
 * A collection of mock tool metadata for discovery.
 * This tells the Manager Agent what tools are available.
 */
export const toolMetadata = [
  {
    agent_id: "search_web",
    // --- MODIFIED DESCRIPTION ---
    description: "Performs a web search using the Tavily API for real-time information. Requires a Tavily API key to be set by the user.",
    capabilities: ["query"],
    input_format: { query: "string" },
    output_format: { result: "string" }
  },
  {
    agent_id: "calculator",
    description: "Evaluates a mathematical expression. Use for calculations.",
    capabilities: ["expression"],
    input_format: { expression: "string" },
    output_format: { result: "number or string error" }
  },
  {
    agent_id: "image_generator",
    description: "Generates an image based on a descriptive prompt and saves it to the device's local storage.",
    capabilities: ["prompt", "metadata"],
    input_format: { prompt: "string", metadata: "object" },
    output_format: { image_generated: "boolean", message: "string", imageUrl: "string", localUri: "string" }
  }
];

/**
 * Returns the metadata for all available tools.
 */
export const getAvailableTools = () => toolMetadata;

/**
 * Tool Implementations
 */
const tools = {
  // --- REPLACED IMPLEMENTATION ---
  search_web: async ({ query }, tavilyApiKey) => {
    console.log(`TOOL: Searching Tavily for "${query}"`);
    if (!tavilyApiKey) {
      console.error("Tavily API key is missing.");
      return { result: "Error: Tavily API key is not configured. Please add it in the settings." };
    }
    try {
      const response = await axios.post('https://api.tavily.com/search', {
        api_key: tavilyApiKey,
        query: query,
        search_depth: "basic",
        include_answer: true,
        max_results: 5
      });
      
      const { answer, results } = response.data;
      
      { IS_DEBUG && console.log("Tavily Search Response:", response.data); }
      {
        IS_DEBUG && console.log("Tavily Search Answer:", answer);
        IS_DEBUG && console.log("Tavily Search Results:", results);
      }
      // Construct a concise summary for the AI
      let summary = `**Search Answer:**\n${answer || 'No direct answer found.'}\n\n**Top Results:**\n`;
      if (results && results.length > 0) {
        summary += results.map(res => `- [${res.title}](${res.url}): ${res.content}`).join('\n');
      } else {
        summary += "No web results found.";
      }
      
      return { result: summary };

    } catch (error) {
      console.error("Tavily search failed:", error.response ? error.response.data : error.message);
      return { result: "Error: Failed to perform web search. The API key might be invalid or the service may be unavailable." };
    }
  },

  calculator: async ({ expression }) => {
    console.log(`TOOL: Calculating "${expression}"`);
    try {
      const result = eval(expression);
      return { result };
    } catch (e) {
      return { result: `Error evaluating expression: ${e.message}` };
    }
  },

  image_generator: async ({ prompt, metadata = {} }) => {
    console.log(`TOOL: Generating image for "${prompt}" with metadata:`, metadata);
    const IMAGE_DIR = `${FileSystem.documentDirectory}ai_generated_images/`;

    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
    }
    
    const { 
      width = 512, 
      height = 512, 
      imageGenModel = 'flux'
    } = metadata;
    
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?enhance=true&nologo=true&width=${width}&height=${height}&model=${imageGenModel}`;

    const uniqueId = Date.now().toString();
    const imageFilename = `${uniqueId}.png`;
    const metadataFilename = `${uniqueId}.json`;
    const fileUri = `${IMAGE_DIR}${imageFilename}`;
    const metadataUri = `${IMAGE_DIR}${metadataFilename}`;

    try {
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error('Image download failed');
      }

      const dataToSave = {
        ...metadata,
        fullPrompt: prompt,
        creationTimestamp: Date.now(),
        size: { width, height },
        imageUrl: imageUrl,
      };
      await FileSystem.writeAsStringAsync(metadataUri, JSON.stringify(dataToSave, null, 2));

      console.log('Image saved to:', downloadResult.uri);
      console.log('Metadata saved to:', metadataUri);
      
      return {
        image_generated: true,
        imageUrl: imageUrl,
        localUri: downloadResult.uri,
        message: 'Image generated successfully. You can view it in the gallery.'
      };

    } catch (err) {
      console.error('Image generation failed:', err.message);
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      await FileSystem.deleteAsync(metadataUri, { idempotent: true });
      return { image_generated: false, error: 'Failed to fetch or save image' };
    }
  }
};

export const toolImplementations = tools;

/**
 * Tool Dispatcher: Executes tools based on a toolCall object.
 */
// --- MODIFIED SIGNATURE ---
export const toolDispatcher = async ({ toolCall, tavilyApiKey }) => {
  const toolPromises = [];
  const results = {};

  for (const toolName in toolCall) {
    if (toolCall.hasOwnProperty(toolName) && tools[toolName]) {
      // Pass the specific key only to the tool that needs it
      const apiKeyForTool = toolName === 'search_web' ? tavilyApiKey : undefined;
      
      const promise = tools[toolName](toolCall[toolName], apiKeyForTool)
        .then(result => {
          results[toolName] = result;
        });
      toolPromises.push(promise);
    }
  }

  await Promise.all(toolPromises);
  return results;
};
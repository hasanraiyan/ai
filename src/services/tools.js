// src/services/tools.js

import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { encode as btoa } from 'base-64';

/**
 * A collection of mock tool metadata for discovery.
 * This tells the Manager Agent what tools are available.
 */
export const toolMetadata = [
  {
    agent_id: "search_web",
    description: "Simulates searching the web for a given query. Use for real-time information or general knowledge questions.",
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
  search_web: async ({ query }) => {
    console.log(`TOOL: Searching web for "${query}"`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      result: `Showing mock web search results for: "${query}". The latest AI trends include multimodal models, agentic workflows, and on-device AI.`
    };
  },

  calculator: async ({ expression }) => {
    console.log(`TOOL: Calculating "${expression}"`);
    try {
      // Note: Using eval() is generally unsafe in production. This is for demonstration.
      const result = eval(expression);
      return { result };
    } catch (e) {
      return { result: `Error evaluating expression: ${e.message}` };
    }
  },

  image_generator: async ({ prompt, metadata = {} }) => {
    console.log(`TOOL: Generating image for "${prompt}" with metadata:`, metadata);
    const IMAGE_DIR = `${FileSystem.documentDirectory}ai_generated_images/`;

    // Ensure the directory exists
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
    }

    // --- MODIFIED --- Destructure all relevant params from metadata with defaults
    const { 
      width = 512, 
      height = 512, 
      imageGenModel = 'flux' // Default to 'flux' if not provided
    } = metadata;
    
    const encodedPrompt = encodeURIComponent(prompt);
    // --- MODIFIED --- Append the new model parameter to the URL
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

      // The metadata object from the screen already contains everything we need
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

// Export implementations for direct use
export const toolImplementations = tools;

/**
 * Tool Dispatcher: Executes tools based on a toolCall object.
 */
export const toolDispatcher = async (toolCall) => {
  const toolPromises = [];
  const results = {};

  for (const toolName in toolCall) {
    if (tools[toolName]) {
      const promise = tools[toolName](toolCall[toolName])
        .then(result => {
          results[toolName] = result;
        });
      toolPromises.push(promise);
    }
  }

  await Promise.all(toolPromises);
  return results;
};
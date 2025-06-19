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
    description: "Generates a verified image URL based on a descriptive prompt.",
    capabilities: ["prompt"],
    input_format: { prompt: "string" },
    output_format: { image_url: "string" }
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
      const result = eval(expression);
      return { result };
    } catch (e) {
      return { result: `Error evaluating expression: ${e.message}` };
    }
  },

  // --- MODIFICATION: Save images to a dedicated directory ---
  // Define the directory for AI generated images
  // This ensures images are stored in a specific location for easier retrieval by a gallery feature.
  // Also, ensure the directory exists before attempting to save files.
  image_generator: async ({ prompt }) => {
    console.log(`TOOL: Generating image for "${prompt}"`);
    const IMAGE_DIR = `${FileSystem.documentDirectory}ai_generated_images/`;

    // Ensure the directory exists
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
    }

    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?enhance=true&nologo=true`;
    const filename = btoa(prompt).substring(0, 30).replace(/[^a-zA-Z0-9]/g, '') + '.png';
    const fileUri = `${IMAGE_DIR}${filename}`;

    try {
      // Check if image already exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        console.log('Image already cached:', fileUri);
        return { image_url: fileUri };
      }

      // Download and save the image
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error('Download failed');
      }

      console.log('Image saved to:', downloadResult.uri);
      return { image_url: downloadResult.uri };
    } catch (err) {
      console.error('Image generation failed:', err.message);
      return { error: 'Failed to fetch or save image' };
    }
  }
};

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

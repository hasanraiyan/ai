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
    capabilities: ["prompt"],
    input_format: { prompt: "string" },
    output_format: { image_generated: "boolean", message: "string" }
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

  // --- MODIFICATION: Save prompt metadata alongside the image ---
  // A unique ID is used for both the image and a new .json file.
  // The .json file stores the prompt, allowing the gallery to display it.
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

    // Use a unique ID for the image and its metadata file
    const uniqueId = Date.now().toString();
    const imageFilename = `${uniqueId}.png`;
    const metadataFilename = `${uniqueId}.json`;
    const fileUri = `${IMAGE_DIR}${imageFilename}`;
    const metadataUri = `${IMAGE_DIR}${metadataFilename}`;

    try {
      // Download and save the image
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error('Image download failed');
      }

      // Save the prompt in a corresponding JSON file
      const metadata = { prompt };
      await FileSystem.writeAsStringAsync(metadataUri, JSON.stringify(metadata));

      console.log('Image saved to:', downloadResult.uri);
      console.log('Metadata saved to:', metadataUri);
      return { image_generated: true, message: 'Image generated successfully. You can view it in the gallery.' };
    } catch (err) {
      console.error('Image generation failed:', err.message);
      // Clean up partial files on failure
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      await FileSystem.deleteAsync(metadataUri, { idempotent: true });
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
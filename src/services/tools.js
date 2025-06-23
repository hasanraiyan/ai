// src/services/tools.js

import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { encode as btoa } from 'base-64';
import { IS_DEBUG } from '../constants';

/**
 * NEW: Fetches real-time search suggestions from DuckDuckGo.
 * @param {string} query - The search term from the user.
 * @returns {Promise<string[]>} A promise that resolves to an array of suggestion strings.
 */
export const getSearchSuggestions = async (query) => {
  if (!query || query.trim().length < 2) {
    return [];
  }
  try {
    const response = await axios.get(`https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&format=json`);
    // The response is an array of objects like { phrase: "suggestion" }
    console.log("Search suggestions response:", response.data);

    return response.data.map(item => item.phrase).slice(0, 5); // Return top 5 suggestions
  } catch (error) {
    console.warn("Could not fetch search suggestions:", error);
    return [];
  }
};

/**
 * A collection of tool metadata for discovery.
 * This tells the Manager Agent what tools are available.
 * 
 * CHANGE: The 'output_format' for all tools now follows a standardized pattern:
 * { success: boolean, message: string, data: object | null }
 * This ensures consistent and predictable results for the AI to process.
 */
export const toolMetadata = [
  {
    agent_id: "search_web",
    description: "Performs a web search using the Tavily API for real-time information. ",
    capabilities: ["query"],
    input_format: { query: "string" },
    output_format: { success: "boolean", message: "string", data: { summary: "string" } }
  },
  {
    agent_id: "calculator",
    description: "Evaluates a mathematical expression. Use for calculations.",
    capabilities: ["expression"],
    input_format: { expression: "string" },
    output_format: { success: "boolean", message: "string", data: { result: "number or string" } }
  },
  {
    agent_id: "image_generator",
    description: "Generates an image based on a descriptive prompt and saves it to the device's local storage.",
    capabilities: ["prompt", "metadata"],
    input_format: { prompt: "string", metadata: "object" },
    output_format: { success: "boolean", message: "string", data: { imageUrl: "string", localUri: "string" } }
  }
];

/**
 * Returns the metadata for all available tools.
 */
export const getAvailableTools = () => toolMetadata;

/**
 * Tool Implementations
 * CHANGE: All tool implementations are updated to return the new standardized response object.
 */
const tools = {
  search_web: async ({ query }, tavilyApiKey) => {
    console.log(`TOOL: Searching Tavily for "${query}"`);
    if (!tavilyApiKey) {
      const errorMsg = "Error: Tavily API key is not configured. Please add it in the settings.";
      console.error(errorMsg);
      return { success: false, message: errorMsg, data: null };
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
      
      if (IS_DEBUG) {
          console.log("Tavily Search Response:", response.data);
          console.log("Tavily Search Answer:", answer);
          console.log("Tavily Search Results:", results);
      }
      
      // Construct a concise summary for the AI
      let summary = `**Search Answer:**\n${answer || 'No direct answer found.'}\n\n**Top Results:**\n`;
      if (results && results.length > 0) {
        summary += results.map(res => `- [${res.title}](${res.url}): ${res.content}`).join('\n');
      } else {
        summary += "No web results found.";
      }
      
      return { success: true, message: "Web search completed successfully.", data: { summary } };

    } catch (error) {
      const errorMsg = "Error: Failed to perform web search. The API key might be invalid or the service may be unavailable.";
      console.error("Tavily search failed:", error.response ? error.response.data : error.message);
      return { success: false, message: errorMsg, data: null };
    }
  },

  calculator: async ({ expression }) => {
    console.log(`TOOL: Calculating "${expression}"`);
    try {
      // A safer alternative to eval for simple math. For complex cases, a library like math.js is better.
      const result = new Function(`return ${expression}`)(); 
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error("Invalid mathematical expression.");
      }
      return { success: true, message: `Calculation result: ${result}`, data: { result } };
    } catch (e) {
      const errorMsg = `Error evaluating expression: ${e.message}`;
      console.error(errorMsg);
      return { success: false, message: errorMsg, data: null };
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
        throw new Error(`Image download failed with status ${downloadResult.status}`);
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
      
      return {
        success: true,
        message: 'Image generated successfully and is now available in the gallery.',
        data: { imageUrl: imageUrl, localUri: downloadResult.uri }
      };

    } catch (err) {
      const errorMsg = `Image generation failed: ${err.message}`;
      console.error(errorMsg);
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      await FileSystem.deleteAsync(metadataUri, { idempotent: true });
      return { success: false, message: 'Failed to fetch or save the image.', data: null };
    }
  }
};

export const toolImplementations = tools;

/**
 * Tool Dispatcher: Executes tools based on a toolCall object.
 */
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
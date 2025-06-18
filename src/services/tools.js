// src/services/tools.js

/**
 * A collection of mock tool metadata for discovery.
 * This tells the Manager Agent what tools are available.
 */
export const toolMetadata = [
  {
    agent_id: "search_web",
    description: "Simulates searching the web for a given query. Use for real-time information or general knowledge questions.",
    capabilities: ["query"],
    input_format: { "query": "string" },
    output_format: { "result": "string" }
  },
  {
    agent_id: "calculator",
    description: "Evaluates a mathematical expression. Use for calculations.",
    capabilities: ["expression"],
    input_format: { "expression": "string" },
    output_format: { "result": "number or string error" }
  },
  {
    agent_id: "image_generator",
    description: "Generates a mock image URL based on a descriptive prompt.",
    capabilities: ["prompt"],
    input_format: { "prompt": "string" },
    output_format: { "image_url": "string" }
  }
];

/**
 * Returns the metadata for all available tools.
 * @returns {Array} An array of tool metadata objects.
 */
export const getAvailableTools = () => toolMetadata;


/**
 * The actual implementation of the tools (sub-agents).
 */
const tools = {
  search_web: async ({ query }) => {
    console.log(`TOOL: Searching web for "${query}"`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { result: `Showing mock web search results for: "${query}". The latest AI trends include multimodal models, agentic workflows, and on-device AI.` };
  },
  calculator: async ({ expression }) => {
    console.log(`TOOL: Calculating "${expression}"`);
    try {
      // WARNING: eval() is insecure. Used here only for this mock environment.
      // A proper implementation would use a math parsing library.
      const result = eval(expression);
      return { result };
    } catch (e) {
      return { result: `Error evaluating expression: ${e.message}` };
    }
  },
  image_generator: async ({ prompt }) => {
    console.log(`TOOL: Generating image for "${prompt}"`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    const urlFriendlyPrompt = encodeURIComponent(prompt);
    return { image_url: `https://fakeimg.pl/400x300/?text=${urlFriendlyPrompt}` };
  }
};

/**
 * The Tool Dispatcher Layer.
 * Executes the required tools in parallel based on a JSON object from the Manager Agent.
 *
 * @param {object} toolCall - The JSON object specifying which tools to run.
 * @returns {Promise<object>} A promise that resolves to an object with the results of each tool.
 */
export const toolDispatcher = async (toolCall) => {
  const toolPromises = [];
  const results = {};

  for (const toolName in toolCall) {
    if (toolName in tools) {
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
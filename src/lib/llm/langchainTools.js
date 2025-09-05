import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { toolMetadata, toolImplementations } from "../../services/tools.js";

/**
 * Converts the project's custom tool input format into a Zod schema
 * for use with LangChain's structured tools.
 * @param {object} inputFormat - The custom input format from toolMetadata.
 * @returns {z.ZodObject} A Zod schema.
 */
const mapInputFormatToZod = (inputFormat) => {
  const zodSchema = {};
  for (const key in inputFormat) {
    if (Object.prototype.hasOwnProperty.call(inputFormat, key)) {
      const type = inputFormat[key];
      // This is a basic mapping. It can be extended for more complex types if needed.
      if (type.includes("string")) {
        zodSchema[key] = z.string().describe(`Parameter for ${key}`);
      } else if (type.includes("number")) {
        zodSchema[key] = z.number().describe(`Parameter for ${key}`);
      } else if (type.includes("object")) {
        // Using passthrough to allow any object shape, as metadata can be flexible.
        zodSchema[key] = z.object({}).passthrough().optional().describe(`Parameter for ${key}`);
      } else {
        zodSchema[key] = z.any().optional().describe(`Parameter for ${key}`);
      }
    }
  }
  return z.object(zodSchema);
};

/**
 * Creates an array of LangChain-compatible tools from the project's existing tool definitions.
 * This function uses a closure to pass the request-specific context to the tool functions.
 * @param {object} context - The context object containing API keys, functions, etc.
 * @returns {Array<DynamicStructuredTool>} An array of tools ready for a LangChain agent.
 */
export const getLangChainTools = (context = {}) => {
  return toolMetadata.map(meta => {
    const toolFunc = toolImplementations[meta.agent_id];

    if (!toolFunc) {
      console.warn(`No implementation found for tool: ${meta.agent_id}`);
      return null;
    }

    // Create a Zod schema from the tool's input format definition.
    const schema = mapInputFormatToZod(meta.input_format);

    return new DynamicStructuredTool({
      name: meta.agent_id,
      description: meta.description,
      schema: schema,
      /**
       * The actual function the LangChain agent will execute.
       * It calls the original tool implementation, passing both the parameters
       * from the LLM and the context object provided when getLangChainTools was called.
       * @param {object} params - The parameters for the tool, as determined by the LLM.
       */
      func: async (params) => {
        try {
          const result = await toolFunc(params, context);
          // LangChain tools must return a string. We stringify the structured
          // result from our original tool so the LLM can process it.
          return JSON.stringify(result);
        } catch (error) {
          console.error(`Error executing tool ${meta.agent_id}:`, error);
          return JSON.stringify({
            success: false,
            message: `An unexpected error occurred in the '${meta.agent_id}' tool.`,
            error: error.message,
          });
        }
      },
    });
  }).filter(tool => tool !== null); // Filter out any tools that had no implementation.
};

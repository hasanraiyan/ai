// src/services/enhancedTools.js

import { toolImplementations, toolMetadata } from './tools';
import { IS_DEBUG } from '../constants';
import { toolsLogger, LogCategory } from '../utils/logging';

/**
 * Enhanced Tools System for the Brain and Hands architecture
 * Provides new tools (clarify, answerUser) and integrates existing tools
 */

/**
 * Enhanced tool metadata including new tools
 */
export const enhancedToolMetadata = [
  // New enhanced tools
  {
    agent_id: "clarify",
    description: "Ask the user for clarification when their request is ambiguous or lacks necessary details",
    capabilities: ["question"],
    input_format: { question: "string" },
    output_format: { 
      type: "string", 
      question: "string", 
      requiresUserResponse: "boolean" 
    }
  },
  {
    agent_id: "answerUser",
    description: "Provide the final response to the user after completing all necessary steps",
    capabilities: ["answer"],
    input_format: { answer: "string" },
    output_format: { 
      type: "string", 
      answer: "string", 
      isComplete: "boolean" 
    }
  },
  // Include all existing tools
  ...toolMetadata
];

/**
 * Clarify tool implementation
 * Asks the user for clarification when requests are ambiguous
 * @param {Object} params - Tool parameters
 * @param {string} params.question - The clarification question to ask
 * @returns {Promise<Object>} Tool execution result
 */
const clarifyTool = async ({ question }) => {
  if (__DEV__) {
    toolsLogger.debug(LogCategory.TOOLS, 'Enhanced Tools: Clarify tool called with question:', { question });
  }
  
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return {
      success: false,
      message: 'Clarify tool requires a non-empty question parameter',
      data: null
    };
  }
  
  const cleanQuestion = question.trim();
  
  return {
    success: true,
    message: 'Clarification request prepared for user',
    data: {
      type: 'clarification',
      question: cleanQuestion,
      requiresUserResponse: true,
      timestamp: Date.now()
    }
  };
};

/**
 * Answer User tool implementation
 * Provides final responses to users after completing tasks
 * @param {Object} params - Tool parameters
 * @param {string} params.answer - The final answer to provide
 * @returns {Promise<Object>} Tool execution result
 */
const answerUserTool = async ({ answer }) => {
  if (__DEV__) {
    toolsLogger.debug(LogCategory.TOOLS, 'Enhanced Tools: AnswerUser tool called with answer:', { answer });
  }
  
  if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
    return {
      success: false,
      message: 'AnswerUser tool requires a non-empty answer parameter',
      data: null
    };
  }
  
  const cleanAnswer = answer.trim();
  
  return {
    success: true,
    message: 'Final answer prepared for user',
    data: {
      type: 'final_answer',
      answer: cleanAnswer,
      isComplete: true,
      timestamp: Date.now()
    }
  };
};

/**
 * Enhanced tool implementations including new and existing tools
 */
export const enhancedToolImplementations = {
  // New enhanced tools
  clarify: clarifyTool,
  answerUser: answerUserTool,
  
  // All existing tools
  ...toolImplementations
};

/**
 * Gets all available enhanced tools metadata
 * @returns {Array} Array of enhanced tool metadata
 */
export const getEnhancedTools = () => {
  return enhancedToolMetadata;
};

/**
 * Gets enhanced tool implementations
 * @returns {Object} Object containing all tool implementations
 */
export const getEnhancedToolImplementations = () => {
  return enhancedToolImplementations;
};

/**
 * Checks if a tool is an enhanced tool (clarify or answerUser)
 * @param {string} toolName - Name of the tool to check
 * @returns {boolean} True if tool is an enhanced tool
 */
export const isEnhancedTool = (toolName) => {
  return toolName === 'clarify' || toolName === 'answerUser';
};

/**
 * Gets metadata for a specific tool
 * @param {string} toolName - Name of the tool
 * @returns {Object|null} Tool metadata or null if not found
 */
export const getToolMetadata = (toolName) => {
  return enhancedToolMetadata.find(tool => tool.agent_id === toolName) || null;
};

/**
 * Validates tool parameters against metadata
 * @param {string} toolName - Name of the tool
 * @param {Object} parameters - Parameters to validate
 * @returns {Object} Validation result
 */
export const validateToolParameters = (toolName, parameters) => {
  const metadata = getToolMetadata(toolName);
  
  if (!metadata) {
    return {
      valid: false,
      message: `Tool '${toolName}' not found`
    };
  }
  
  if (!parameters || typeof parameters !== 'object') {
    return {
      valid: false,
      message: `Parameters must be an object for tool '${toolName}'`
    };
  }
  
  const inputFormat = metadata.input_format || {};
  const missingParams = [];
  
  for (const paramName of Object.keys(inputFormat)) {
    if (!(paramName in parameters)) {
      missingParams.push(paramName);
    }
  }
  
  if (missingParams.length > 0) {
    return {
      valid: false,
      message: `Missing required parameters for '${toolName}': ${missingParams.join(', ')}`
    };
  }
  
  return {
    valid: true,
    message: 'Parameters are valid'
  };
};

/**
 * Executes an enhanced tool with proper error handling
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} parameters - Tool parameters
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Tool execution result
 */
export const executeEnhancedTool = async (toolName, parameters, context = {}) => {
  try {
    // Validate parameters
    const validation = validateToolParameters(toolName, parameters);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message,
        data: null
      };
    }
    
    // Get tool implementation
    const toolFunction = enhancedToolImplementations[toolName];
    
    if (!toolFunction) {
      return {
        success: false,
        message: `Tool implementation not found for '${toolName}'`,
        data: null
      };
    }
    
    // Execute tool
    const result = await toolFunction(parameters, context);
    
    // Ensure result has proper structure
    if (!result || typeof result !== 'object') {
      return {
        success: false,
        message: `Tool '${toolName}' returned invalid result format`,
        data: null
      };
    }
    
    return result;
    
  } catch (error) {
    toolsLogger.error(LogCategory.TOOLS, `Enhanced Tools: Error executing '${toolName}'`, {
      error: error.message,
      toolName,
      parameters: Object.keys(parameters)
    });
    
    return {
      success: false,
      message: `Tool execution failed: ${error.message}`,
      data: null
    };
  }
};

/**
 * Gets tools filtered by allowed tools list
 * Maintains backward compatibility with existing character configurations
 * @param {Array} allowedTools - Array of allowed tool names
 * @returns {Array} Filtered tool metadata
 */
export const getFilteredTools = (allowedTools = []) => {
  // Always include enhanced tools for agent functionality
  const enhancedTools = enhancedToolMetadata.filter(tool => 
    tool.agent_id === 'clarify' || tool.agent_id === 'answerUser'
  );
  
  // Add allowed regular tools (preserving existing character tool configurations)
  const regularTools = enhancedToolMetadata.filter(tool => 
    tool.agent_id !== 'clarify' && 
    tool.agent_id !== 'answerUser' && 
    allowedTools.includes(tool.agent_id)
  );
  
  return [...enhancedTools, ...regularTools];
};

/**
 * Validates that existing character tool configurations are supported
 * @param {Array} characterTools - Array of tool names from character config
 * @returns {Object} Validation result with compatibility info
 */
export const validateCharacterToolCompatibility = (characterTools = []) => {
  // Handle null, undefined, or non-array inputs
  const toolsArray = Array.isArray(characterTools) ? characterTools : [];
  
  const availableToolNames = enhancedToolMetadata.map(tool => tool.agent_id);
  const unsupportedTools = toolsArray.filter(toolName => 
    !availableToolNames.includes(toolName)
  );
  
  return {
    isCompatible: unsupportedTools.length === 0,
    supportedTools: toolsArray.filter(toolName => 
      availableToolNames.includes(toolName)
    ),
    unsupportedTools,
    message: unsupportedTools.length > 0 
      ? `Character uses unsupported tools: ${unsupportedTools.join(', ')}`
      : 'All character tools are supported'
  };
};

/**
 * Creates a tool execution context with enhanced capabilities
 * @param {Object} baseContext - Base execution context
 * @returns {Object} Enhanced execution context
 */
export const createEnhancedContext = (baseContext = {}) => {
  return {
    ...baseContext,
    enhancedTools: true,
    toolMetadata: enhancedToolMetadata,
    availableTools: getFilteredTools(baseContext.allowedTools || [])
  };
};

/**
 * Formats tool results for display or further processing
 * @param {Object} result - Tool execution result
 * @param {string} toolName - Name of the executed tool
 * @returns {Object} Formatted result
 */
export const formatToolResult = (result, toolName) => {
  if (!result || typeof result !== 'object') {
    return {
      success: false,
      message: 'Invalid tool result',
      data: null,
      formatted: 'Tool execution failed'
    };
  }
  
  const formatted = {
    ...result,
    toolName,
    executionTime: result.data?.timestamp || Date.now()
  };
  
  // Add specific formatting for enhanced tools
  if (toolName === 'clarify' && result.success) {
    formatted.formatted = `Question: ${result.data.question}`;
    formatted.requiresResponse = true;
  } else if (toolName === 'answerUser' && result.success) {
    formatted.formatted = result.data.answer;
    formatted.isComplete = true;
  } else if (result.success) {
    formatted.formatted = result.message || 'Tool executed successfully';
  } else {
    formatted.formatted = result.message || 'Tool execution failed';
  }
  
  return formatted;
};
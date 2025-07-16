// src/services/toolCompatibilityAdapter.js

import { toolDispatcher as legacyToolDispatcher, toolImplementations, toolMetadata } from './tools';
import { enhancedToolImplementations, getEnhancedTools } from './enhancedTools';
import { IS_DEBUG } from '../constants';

/**
 * Tool Compatibility Adapter
 * Ensures existing tool interfaces are preserved while integrating with the new enhanced tools system
 * Provides backward compatibility for existing screens and character configurations
 */

/**
 * Maps legacy tool call format to new enhanced tools format
 * Legacy format: { "tools-required": [{ tool_name: "search_web", parameters: { query: "test" } }] }
 * New format: { tool_name: "search_web", parameters: { query: "test" } }
 * @param {Object} legacyToolCall - Legacy tool call format
 * @returns {Array} Array of new format tool commands
 */
export const mapLegacyToolCallToNewFormat = (legacyToolCall) => {
  if (!legacyToolCall || typeof legacyToolCall !== 'object') {
    return [];
  }

  // Handle legacy format with 'tools-required' array
  if (legacyToolCall['tools-required'] && Array.isArray(legacyToolCall['tools-required'])) {
    return legacyToolCall['tools-required'].map(toolCall => ({
      tool_name: toolCall.tool_name,
      parameters: toolCall.parameters || {}
    }));
  }

  // Handle direct tool calls (legacy single tool format)
  const commands = [];
  for (const [toolName, parameters] of Object.entries(legacyToolCall)) {
    if (toolName !== 'tools-required' && typeof parameters === 'object') {
      commands.push({
        tool_name: toolName,
        parameters: parameters || {}
      });
    }
  }

  return commands;
};

/**
 * Maps new format tool results back to legacy format
 * @param {Array} newResults - Array of new format results
 * @returns {Object} Legacy format results
 */
export const mapNewResultsToLegacyFormat = (newResults) => {
  const legacyResults = {};

  for (const result of newResults) {
    if (result.tool_name) {
      legacyResults[result.tool_name] = {
        success: result.success,
        message: result.message,
        data: result.data
      };
    }
  }

  return legacyResults;
};

/**
 * Enhanced tool dispatcher that maintains backward compatibility
 * Supports both legacy and new tool call formats
 * @param {Object} params - Tool dispatcher parameters
 * @param {Object} params.toolCall - Tool call in legacy or new format
 * @param {Object} params.context - Execution context
 * @returns {Promise<Object>} Tool execution results in legacy format
 */
export const compatibleToolDispatcher = async ({ toolCall, context = {} }) => {
  if (IS_DEBUG) {
    console.log('Tool Compatibility Adapter: Processing tool call:', toolCall);
  }

  try {
    // Check if this is a legacy tool call format
    const isLegacyFormat = toolCall && (
      toolCall['tools-required'] || 
      Object.keys(toolCall).some(key => key !== 'tools-required' && typeof toolCall[key] === 'object')
    );

    // Check if this is a new format single command
    const isNewFormatSingle = toolCall && toolCall.tool_name && toolCall.parameters;

    if (isLegacyFormat) {
      // Use legacy tool dispatcher for backward compatibility
      if (IS_DEBUG) {
        console.log('Tool Compatibility Adapter: Using legacy tool dispatcher');
      }
      return await legacyToolDispatcher({ toolCall, context });
    } else if (isNewFormatSingle) {
      // Handle new format single tool call
      if (IS_DEBUG) {
        console.log('Tool Compatibility Adapter: Using enhanced tools system for single command');
      }

      const result = await executeCompatibleTool(toolCall, context);
      return mapNewResultsToLegacyFormat([result]);
    } else {
      // Handle new format array of commands or fallback to legacy
      if (IS_DEBUG) {
        console.log('Tool Compatibility Adapter: Attempting legacy dispatcher as fallback');
      }
      return await legacyToolDispatcher({ toolCall, context });
    }
  } catch (error) {
    console.error('Tool Compatibility Adapter: Error processing tool call:', error);
    throw error;
  }
};

/**
 * Executes a single tool command with compatibility handling
 * @param {Object} command - Tool command
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Tool execution result
 */
const executeCompatibleTool = async (command, context) => {
  const { tool_name: toolName, parameters } = command;

  // Check if tool exists in enhanced tools
  if (enhancedToolImplementations[toolName]) {
    try {
      const result = await enhancedToolImplementations[toolName](parameters, context);
      return {
        ...result,
        tool_name: toolName
      };
    } catch (error) {
      return {
        success: false,
        message: `Enhanced tool execution failed: ${error.message}`,
        data: null,
        tool_name: toolName
      };
    }
  }

  // Fallback to legacy tool implementation
  if (toolImplementations[toolName]) {
    try {
      const result = await toolImplementations[toolName](parameters, context);
      return {
        ...result,
        tool_name: toolName
      };
    } catch (error) {
      return {
        success: false,
        message: `Legacy tool execution failed: ${error.message}`,
        data: null,
        tool_name: toolName
      };
    }
  }

  // Tool not found
  return {
    success: false,
    message: `Tool '${toolName}' not found in either enhanced or legacy implementations`,
    data: null,
    tool_name: toolName
  };
};

/**
 * Gets all available tools combining legacy and enhanced tools
 * Maintains backward compatibility for character configurations
 * @returns {Array} Combined tool metadata
 */
export const getCompatibleToolMetadata = () => {
  const enhancedTools = getEnhancedTools();
  
  // Remove duplicates (enhanced tools already include legacy tools)
  const uniqueTools = new Map();
  
  for (const tool of enhancedTools) {
    uniqueTools.set(tool.agent_id, tool);
  }
  
  return Array.from(uniqueTools.values());
};

/**
 * Validates that a character's supported tools are still available
 * @param {Array} supportedTools - Array of tool names from character config
 * @returns {Object} Validation result
 */
export const validateCharacterToolSupport = (supportedTools = []) => {
  const availableTools = getCompatibleToolMetadata();
  const availableToolNames = availableTools.map(tool => tool.agent_id);
  
  const unsupportedTools = supportedTools.filter(toolName => 
    !availableToolNames.includes(toolName)
  );
  
  const supportedToolsInfo = supportedTools
    .filter(toolName => availableToolNames.includes(toolName))
    .map(toolName => {
      const toolInfo = availableTools.find(tool => tool.agent_id === toolName);
      return {
        name: toolName,
        description: toolInfo?.description || 'No description available',
        isEnhanced: toolName === 'clarify' || toolName === 'answerUser'
      };
    });

  return {
    isValid: unsupportedTools.length === 0,
    supportedTools: supportedToolsInfo,
    unsupportedTools,
    totalSupported: supportedToolsInfo.length,
    message: unsupportedTools.length > 0 
      ? `Some tools are not available: ${unsupportedTools.join(', ')}`
      : 'All character tools are supported'
  };
};

/**
 * Creates a compatibility context that works with both old and new systems
 * @param {Object} originalContext - Original context from legacy system
 * @returns {Object} Enhanced context that works with both systems
 */
export const createCompatibilityContext = (originalContext = {}) => {
  return {
    // Preserve all original context properties
    ...originalContext,
    
    // Add enhanced context properties
    availableTools: getCompatibleToolMetadata(),
    
    // Ensure allowedTools is properly formatted
    allowedTools: Array.isArray(originalContext.allowedTools) 
      ? originalContext.allowedTools 
      : [],
    
    // Add compatibility flags
    compatibility: {
      legacyMode: true,
      enhancedMode: true,
      adapterVersion: '1.0.0'
    }
  };
};

/**
 * Migrates legacy tool configurations to new format
 * @param {Object} legacyConfig - Legacy tool configuration
 * @returns {Object} New format configuration
 */
export const migrateLegacyToolConfig = (legacyConfig) => {
  if (!legacyConfig || typeof legacyConfig !== 'object') {
    return {
      supportedTools: [],
      migrated: false,
      errors: ['Invalid legacy configuration']
    };
  }

  const errors = [];
  const supportedTools = [];

  // Handle different legacy configuration formats
  if (Array.isArray(legacyConfig.supportedTools)) {
    // Standard format - already correct
    supportedTools.push(...legacyConfig.supportedTools);
  } else if (Array.isArray(legacyConfig.tools)) {
    // Alternative format
    supportedTools.push(...legacyConfig.tools);
  } else if (typeof legacyConfig.supportedTools === 'string') {
    // Single tool as string
    supportedTools.push(legacyConfig.supportedTools);
  }

  // Validate each tool
  const validatedTools = [];
  const availableToolNames = getCompatibleToolMetadata().map(tool => tool.agent_id);

  for (const toolName of supportedTools) {
    if (typeof toolName === 'string' && availableToolNames.includes(toolName)) {
      validatedTools.push(toolName);
    } else {
      errors.push(`Tool '${toolName}' is not available`);
    }
  }

  return {
    supportedTools: validatedTools,
    migrated: true,
    errors,
    originalConfig: legacyConfig
  };
};

/**
 * Provides a compatibility report for debugging
 * @returns {Object} Compatibility status report
 */
export const getCompatibilityReport = () => {
  const legacyTools = toolMetadata;
  const enhancedTools = getEnhancedTools();
  const legacyToolNames = legacyTools.map(tool => tool.agent_id);
  const enhancedToolNames = enhancedTools.map(tool => tool.agent_id);

  return {
    legacyTools: {
      count: legacyTools.length,
      names: legacyToolNames
    },
    enhancedTools: {
      count: enhancedTools.length,
      names: enhancedToolNames,
      newTools: enhancedToolNames.filter(name => !legacyToolNames.includes(name))
    },
    compatibility: {
      allLegacyToolsSupported: legacyToolNames.every(name => enhancedToolNames.includes(name)),
      newToolsAdded: enhancedToolNames.filter(name => !legacyToolNames.includes(name)),
      potentialIssues: []
    },
    recommendations: [
      'All existing character configurations should continue to work',
      'New enhanced tools (clarify, answerUser) are available for improved interactions',
      'Legacy tool dispatcher remains functional for backward compatibility'
    ]
  };
};
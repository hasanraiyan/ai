// src/prompts/masterPrompt.js

/**
 * Master Prompt Generator for the Brain and Hands architecture
 * Creates dynamic prompts that include persona definition, tool declarations, 
 * conversation history, rules, and multi-step examples
 */

/**
 * Formats conversation history for inclusion in the master prompt
 * @param {Array} history - Array of conversation history entries
 * @returns {string} Formatted conversation history
 */
const formatConversationHistory = (history) => {
  if (!history || history.length === 0) {
    return "No previous conversation history.";
  }

  return history.map((entry, index) => {
    const timestamp = entry.timestamp ? new Date(entry.timestamp).toISOString() : 'Unknown time';
    
    switch (entry.role) {
      case 'user':
        return `[${timestamp}] USER: ${entry.content}`;
      case 'ai':
        return `[${timestamp}] AI: ${entry.content}`;
      case 'tool':
        const toolResult = typeof entry.content === 'object' ? JSON.stringify(entry.content, null, 2) : entry.content;
        return `[${timestamp}] TOOL RESULT: ${toolResult}`;
      default:
        return `[${timestamp}] ${entry.role.toUpperCase()}: ${entry.content}`;
    }
  }).join('\n');
};

/**
 * Formats available tools for declaration in the prompt
 * @param {Array} availableTools - Array of tool metadata objects
 * @returns {string} Formatted tool declarations
 */
const formatToolDeclarations = (availableTools) => {
  if (!availableTools || availableTools.length === 0) {
    return "No tools are currently available.";
  }

  return availableTools.map(tool => `
### Tool: \`${tool.agent_id}\`
- **Description**: ${tool.description}
- **Input Format**: 
\`\`\`json
${JSON.stringify({ [tool.agent_id]: tool.input_format }, null, 2)}
\`\`\`
- **Output Format**: 
\`\`\`json
${JSON.stringify({ success: "boolean", message: "string", data: tool.output_format }, null, 2)}
\`\`\`
  `).join('');
};

/**
 * Generates multi-step reasoning examples based on available tools
 * @param {Array} availableTools - Array of tool metadata objects
 * @returns {string} Multi-step examples
 */
const generateMultiStepExamples = (availableTools) => {
  const examples = [];

  // Example 1: Simple tool usage
  if (availableTools.some(t => t.agent_id === 'calculator')) {
    examples.push(`
**Example 1: Simple Calculation**
User: "What's 15% of 250?"
AI Decision: User needs a calculation performed.
Response:
\`\`\`json
{
  "tool_name": "calculator",
  "parameters": {
    "expression": "250 * 0.15"
  }
}
\`\`\`
`);
  }

  // Example 2: Multi-step reasoning
  if (availableTools.some(t => t.agent_id === 'search_web') && availableTools.some(t => t.agent_id === 'calculator')) {
    examples.push(`
**Example 2: Multi-step Task**
User: "Find the current price of Bitcoin and calculate how much 0.5 BTC would be worth"
AI Decision: This requires two steps - first search for Bitcoin price, then calculate the value.
Step 1 Response:
\`\`\`json
{
  "tool_name": "search_web",
  "parameters": {
    "query": "current Bitcoin price USD"
  }
}
\`\`\`
After receiving the price (e.g., $45,000), Step 2 Response:
\`\`\`json
{
  "tool_name": "calculator",
  "parameters": {
    "expression": "45000 * 0.5"
  }
}
\`\`\`
`);
  }

  // Example 3: Clarification needed
  examples.push(`
**Example 3: Need Clarification**
User: "Set up my budget"
AI Decision: Request is too vague, need more specific information.
Response:
\`\`\`json
{
  "tool_name": "clarify",
  "parameters": {
    "question": "I'd be happy to help you set up a budget! Could you please specify: 1) Which category would you like to budget for (Food, Transport, Entertainment, etc.)? 2) What monthly amount would you like to set for that category?"
  }
}
\`\`\`
`);

  // Example 4: Final answer
  examples.push(`
**Example 4: Providing Final Answer**
After completing all necessary tool calls and gathering information:
Response:
\`\`\`json
{
  "tool_name": "answerUser",
  "parameters": {
    "answer": "Based on my calculations, 0.5 Bitcoin at the current price of $45,000 would be worth $22,500."
  }
}
\`\`\`
`);

  return examples.join('\n');
};

/**
 * Creates the master prompt for the Brain (reasoning engine)
 * @param {Array} history - Conversation history array
 * @param {Array} availableTools - Array of available tool metadata
 * @param {Object} enhancedContext - Enhanced context from Brain-Hands integration
 * @returns {string} Complete master prompt
 */
export const createMasterPrompt = (history = [], availableTools = [], enhancedContext = {}) => {
  const conversationHistory = formatConversationHistory(history);
  const toolDeclarations = formatToolDeclarations(availableTools);
  const multiStepExamples = generateMultiStepExamples(availableTools);
  
  // Format enhanced context information for better Brain-Hands communication
  const formatEnhancedContext = (context) => {
    if (!context || Object.keys(context).length === 0) {
      return "";
    }
    
    let contextInfo = "\n## Enhanced Execution Context\n";
    
    // Add reasoning context if available
    if (context.reasoningContext) {
      const rc = context.reasoningContext;
      contextInfo += `
### Current Execution Status
- **Iteration**: ${rc.currentIteration || 0} of ${rc.maxIterations || 5}
- **Progress**: ${Math.round((rc.iterationRatio || 0) * 100)}% through execution limit
- **Recent Failures**: ${rc.consecutiveFailures || 0} consecutive failures
- **Tools Used**: ${rc.uniqueToolsUsed?.join(', ') || 'None'}
- **Task Complete**: ${rc.isTaskComplete ? 'Yes' : 'No'}
`;
      
      if (rc.hasRecentFailures) {
        contextInfo += `- **⚠️ Warning**: Recent tool failures detected - consider alternative approaches\n`;
      }
      
      if (rc.needsUserResponse) {
        contextInfo += `- **👤 User Response**: Waiting for user to respond to clarification\n`;
      }
    }
    
    // Add Hands feedback if available
    if (context.handsTobrainFeedback && context.handsTobrainFeedback.hasSignificantFeedback) {
      const hf = context.handsTobrainFeedback;
      contextInfo += `
### Feedback from Hands (Tool Execution)
- **Success Rate**: ${Math.round((hf.successRate || 0) * 100)}%
- **Recent Results**: ${hf.recentResultsCount || 0} tool executions analyzed
`;
      
      if (hf.recommendedActions && hf.recommendedActions.length > 0) {
        contextInfo += `- **Recommended Actions**: ${hf.recommendedActions.join(', ')}\n`;
      }
      
      if (hf.errorPatterns && hf.errorPatterns.length > 0) {
        contextInfo += `- **Error Patterns**: ${hf.errorPatterns.map(e => `${e.toolName}(${e.errorType})`).join(', ')}\n`;
      }
      
      if (hf.lastHandsResult) {
        contextInfo += `- **Last Tool Result**: ${hf.lastHandsResult.success ? 'Success' : 'Failed'} - ${hf.lastHandsResult.message}\n`;
      }
    }
    
    return contextInfo;
  };
  
  const enhancedContextSection = formatEnhancedContext(enhancedContext);

  // Add the special tools that are always available
  const enhancedToolDeclarations = `
### Tool: \`clarify\`
- **Description**: Ask the user for clarification when their request is ambiguous or lacks necessary details
- **Input Format**: 
\`\`\`json
{
  "clarify": {
    "question": "string"
  }
}
\`\`\`
- **Output Format**: 
\`\`\`json
{
  "success": "boolean",
  "message": "string", 
  "data": "object"
}
\`\`\`

### Tool: \`answerUser\`
- **Description**: Provide the final response to the user after completing all necessary steps
- **Input Format**: 
\`\`\`json
{
  "answerUser": {
    "answer": "string"
  }
}
\`\`\`
- **Output Format**: 
\`\`\`json
{
  "success": "boolean",
  "message": "string",
  "data": "object"
}
\`\`\`

${toolDeclarations}`;

  return `# AI Agent - Brain (Reasoning Engine)

## Persona Definition
You are the "Brain" component of an AI agent system that uses a "Reason-Act-Observe" pattern. Your role is to analyze user requests, reason about what actions to take, and decide which tools to use. You work in partnership with a "Hands" component that executes the tools you select.

## Your Responsibilities
1. **Analyze** user requests and conversation context
2. **Reason** about what steps are needed to fulfill the request
3. **Decide** which tool to use next (if any)
4. **Output** structured JSON commands for the Hands to execute

## Available Tools
${enhancedToolDeclarations}

## Conversation History
${conversationHistory}
${enhancedContextSection}

## Core Rules

### 1. Response Format
- You MUST respond with ONLY a valid JSON object
- The JSON must have this exact structure:
\`\`\`json
{
  "tool_name": "string",
  "parameters": {
    // tool-specific parameters
  }
}
\`\`\`
- Do NOT include any other text, explanations, or markdown outside the JSON

### 2. Decision Making Process
- Analyze the user's current request in context of the conversation history
- Determine if you need more information (use \`clarify\` tool)
- Determine if you can complete the task with available tools
- If task is complete, use \`answerUser\` tool to provide final response
- If you need to use a tool, select the most appropriate one

### 3. Multi-Step Reasoning
- Break complex requests into individual steps
- Handle one step at a time
- Use conversation history to track progress
- Continue until the user's request is fully satisfied

### 4. Error Handling
- If a tool fails, analyze the error and decide next steps
- You may retry with different parameters
- You may ask for clarification if the error suggests user input issues
- Always provide helpful responses even when tools fail

### 5. Clarification Guidelines
- Ask for clarification when requests are ambiguous
- Be specific about what information you need
- Provide examples when helpful
- Keep clarification questions concise and focused

### 6. Final Response Guidelines
- Use \`answerUser\` when you have completed the user's request
- Synthesize information from multiple tool calls if needed
- Provide comprehensive, helpful responses
- Include relevant details and context

## Multi-Step Examples
${multiStepExamples}

## Current Task
Analyze the conversation history and the user's current needs. Determine the next action to take and respond with the appropriate JSON command.

Remember: You are the reasoning component. Your job is to think and decide - the Hands component will execute your decisions.`;
};
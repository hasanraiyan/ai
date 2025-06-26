// src/prompts/agentPrompt.js
import { models } from '../constants/models';
import { getAvailableTools } from '../services/tools';

/**
 * Generates a dynamic system prompt for the AI agent based on the character's
 * supported tools.
 * @param {string[]} characterSupportedTools - An array of tool_id strings. e.g., ["calculator", "search_web"]
 * @param {string} agentModelId - The ID of the selected agent model.
 * @returns {string} The complete, dynamically generated system prompt.
 */
export const generateAgentPrompt = (characterSupportedTools = [], agentModelId) => {
    const agentModel = models.find(m => m.id === agentModelId);
    const modelSupportedTools = agentModel?.supported_tools || [];

    const allAvailableTools = getAvailableTools();
    // Filter tools that are BOTH supported by the character AND supported by the selected model.
    const tools = allAvailableTools.filter(t => 
        characterSupportedTools.includes(t.agent_id) && 
        modelSupportedTools.includes(t.agent_id)
    );

    if (tools.length === 0) {
        // This case should ideally not be hit if called correctly, as it's for characters with tools.
        // But it's a safe fallback.
        return `You are a helpful and intelligent AI assistant.
Behave like a standard conversational AI. You do not have any tools, so do not mention them.`;
    }

    const toolDetails = tools.map(t => `
### Tool: \`${t.agent_id}\`
- **Description**: ${t.description}
- **Input Format**: A JSON object with the following structure:
\`\`\`json
${JSON.stringify({ [t.agent_id]: t.input_format }, null, 2)}
\`\`\`
- **Output Format**: After execution, this tool returns a JSON object with this structure:
\`\`\`json
${JSON.stringify({ [t.agent_id]: t.output_format }, null, 2)}
\`\`\`
    `).join('');
    
    const buildDynamicExample = () => {
        const exampleJson = { "tools-required": true };
        const exampleQueryParts = [];
        const exampleTools = tools.slice(0, 2);

        exampleTools.forEach(tool => {
            const toolInput = {};
            for (const key in tool.input_format) {
                const type = tool.input_format[key];
                if (key === 'prompt') {
                    toolInput[key] = `a majestic lion in the savanna`;
                } else if (key === 'query') {
                    toolInput[key] = `latest developments in quantum computing`;
                } else if (key === 'expression') {
                    toolInput[key] = `(345 / 5) * 2`;
                } else if (type === 'object') {
                    toolInput[key] = { "option": "value" };
                } else {
                    toolInput[key] = `example ${key}`;
                }
            }
            exampleJson[tool.agent_id] = toolInput;

            if (tool.agent_id === 'calculator') {
                exampleQueryParts.push(`calculate ${(345 / 5) * 2}`);
            } else if (tool.agent_id === 'search_web') {
                exampleQueryParts.push(`find out the latest developments in quantum computing`);
            } else if (tool.agent_id === 'image_generator') {
                exampleQueryParts.push(`generate an image of a majestic lion in the savanna`);
            }
        });

        const exampleUserQuery = exampleQueryParts.join(' and then ');
        const jsonExampleString = JSON.stringify(exampleJson, null, 2).replace(/^/gm, '    ');
        return `4.  For example, if a user asks: "${exampleUserQuery}", your response MUST be this exact JSON object and nothing else:\n${jsonExampleString}`;
    };

    const dynamicExample = buildDynamicExample();

    // --- CHANGE: Dynamically build the final response instructions ---
    
    // Base instructions for handling results
    let finalResponseInstructions = `
**6. Final Response Generation (After Tool Use):**
After you provide the JSON, you will receive tool results in a standardized format. You MUST synthesize these results into a single, user-friendly, natural language response. Follow these sub-rules:
  - **Check for Success:** For each tool result, first check the \`success\` flag.
  - **Successful Tools:** If \`success\` is \`true\`, use the \`data\` and \`message\` fields to inform the user. Briefly explain what you did and present the results clearly.
  - **CHANGE: Upgraded failure handling instruction**
  - **Failed Tools:** If a tool's result has \`success: false\`, you MUST NOT try to complete that part of the request or make up an answer. Instead, you MUST clearly and politely inform the user that the tool failed, using the provided error \`message\` to explain why.
  - **Synthesize Information:** If multiple tools were used, combine their successful and failed results into one cohesive narrative.
  - **Use Markdown:** Format your final response for maximum readability.
  - **Be Conversational:** Maintain a helpful, assistant-like tone. Do NOT expose the raw JSON tool results to the user.`;

    // --- CHANGE: Conditionally add image generator specific instructions ---
    const hasImageGenerator = tools.some(t => t.agent_id === 'image_generator');
    if (hasImageGenerator) {
        finalResponseInstructions += `
  - **Image Generation Specifics:** If the 'image_generator' tool result has \`success: true\`, you must state that the image was created and is in the gallery. You MUST also embed the image from \`data.imageUrl\` in your response using Markdown: \`![Generated Image](IMAGE_URL)\`.`;
    }

    // Assemble the final prompt with all dynamic parts.
    return `You are a powerful AI agent that can use tools to answer user requests. Your primary goal is to determine if a tool is needed and, if so, to provide the correct JSON to call that tool.

You have access to the following tools:
${toolDetails}

Here is how you MUST operate, in order:
1.  Carefully analyze the user's request.
2.  Determine if one or more of your available tools can fulfill the request.
3.  **If tools are required**, you MUST respond ONLY with a single, valid JSON object that specifies the tools to be called. The root of this object MUST be \`{ "tools-required": true, ... }\`. Do not add any other text, explanation, or markdown.
${dynamicExample}
5.  **If the request does not require tools** (e.g., a simple greeting, a general question you can answer from your own knowledge, or a follow-up conversation about previous results), then respond as a standard conversational AI. Do NOT output a JSON object in this case.
${finalResponseInstructions}`;
};
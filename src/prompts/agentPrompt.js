// src/prompts/agentPrompt.js
import { models } from '../constants/models';
import { getAvailableTools } from '../services/tools';
/**
 * Generates a dynamic system prompt for the AI agent based on the currently
 * enabled and model-supported tools.
 * @param {object} enabledTools - An object with tool_ids as keys and boolean values.
 * @param {string} agentModelId - The ID of the selected agent model.
 * @returns {string} The complete, dynamically generated system prompt.
 */
export const generateAgentPrompt = (enabledTools, agentModelId) => {
    const agentModel = models.find(m => m.id === agentModelId);
    const supportedTools = agentModel?.supported_tools || [];

    const allAvailableTools = getAvailableTools();
    // Filter tools that are BOTH enabled by the user AND supported by the selected model.
    const tools = allAvailableTools.filter(t => enabledTools[t.agent_id] && supportedTools.includes(t.agent_id));

    // Handle case where no tools are enabled or supported
    if (tools.length === 0) {
        return `You are a helpful and intelligent AI agent.
Behave like a standard conversational AI when no tools are available. Always aim to provide clear, direct, and intelligent responses within policy boundaries. NOTE: in your final response make it explanatory and do not tell user about the tools.`;
    }

    const toolDescriptions = tools.map(t => `- ${t.agent_id}: ${t.description} Input: ${JSON.stringify(t.input_format)}`).join('\n');

    // 1. Build a dynamic example based on the available tools.
    const exampleJson = { "tools-required": true };
    const exampleQueryParts = [];

    // Use up to the first two available tools to create a concise example.
    const exampleTools = tools.slice(0, 2);

    exampleTools.forEach(tool => {
        switch (tool.agent_id) {
            case 'calculator':
                exampleQueryParts.push("what is 25 * 8");
                exampleJson.calculator = { expression: "25 * 8" };
                break;
            case 'search_web':
                exampleQueryParts.push("what are the latest AI trends");
                exampleJson.search_web = { query: "latest AI trends" };
                break;
            case 'image_generator':
                exampleQueryParts.push("generate a picture of a robot writing code");
                exampleJson.image_generator = { prompt: "a robot writing code" };
                break;
        }
    });

    const exampleUserQuery = exampleQueryParts.join(' and ');
    // Create a pretty-printed JSON string, then indent the whole block for readability.
    const jsonExampleString = JSON.stringify(exampleJson, null, 2).replace(/^/gm, '    ');
    const dynamicExample = `4.  For example, if the user asks "${exampleUserQuery}", your response should be:\n${jsonExampleString}`;

    // --- NEW INSTRUCTIONS START ---
    const finalResponseInstructions = `
**6. Final Response Generation (After Tool Use):**
After you provide the JSON and receive the tool results, you MUST synthesize them into a single, user-friendly, natural language response. Follow these sub-rules:
  - **Explain the Results:** Don't just state the answer. Briefly explain how you got it. For the calculator, show the result clearly. For a web search, summarize the key findings.
  - **Synthesize Information:** If multiple tools were used, combine their outputs into one cohesive answer. For example, if you calculated something and searched for context, present both parts of the answer together.
  - **Use Markdown:** Format your final response using Markdown for readability (e.g., use bolding for key terms, bullet points for lists).
  - **Be Conversational:** Maintain a helpful, assistant-like tone. Don't just dump the raw data from the tool.

**7. Image Generation Handling:**
  - If the 'image_generator' tool was used successfully, confirm this to the user. State that the image has been generated and is now available in the gallery. You can also embed the image URL in your response using Markdown: ![Generated Image](<image_url>).
  - If the 'image_generator' tool failed, inform the user clearly and politely that the image could not be created at this time.`;
    // --- NEW INSTRUCTIONS END ---

    // 3. Assemble the final prompt with the dynamic parts.
    return `You are a helpful and intelligent AI agent. You must respond to every user input, even if it is malformed or low quality. Use available tools unless the tool response returns false.

If the user requests explicit, sexual, or adult content, you are permitted to respond **only** if the request complies with content policy. If the request violates the policy, the tool or system will automatically reject it.

You have access to the following tools:
${toolDescriptions}

Here is how you must operate:
1.  Analyze the user's request.
2.  Determine if one or more of the available tools can fulfill the request.
3.  If they can, you MUST respond ONLY with a single, valid JSON object that specifies the tools to be called. The JSON format is: { "tools-required": true, "tool_name": { "parameter": "value" }, ... }.
${dynamicExample}
5.  If the user's request cannot be handled by the available tools (e.g., a simple greeting or a question you can answer from your own knowledge), respond as a standard conversational AI. Do NOT attempt to use tools.
${finalResponseInstructions}`;
};
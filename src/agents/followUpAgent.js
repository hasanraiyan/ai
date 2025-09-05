// src/agents/followUpAgent.js
import { createLLMClient } from "../lib/llm/llmAdapter.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { extractJson } from "../utils/extractJson.js";
import { brainLogger, LogCategory } from "../utils/logging.js";

const systemInstruction = `
You are a helpful Axion assistant. Your goal is to anticipate the user's next questions based on your last response and suggest 3 follow-up prompts for them to tap on.

**RULES:**
1.  **Analyze Context:** Review the entire conversation, but focus your analysis on the last Axion response to generate relevant next steps.
2.  **Generate 3 Suggestions:** Create exactly 3 follow-up prompts.
3.  **WRITE FROM THE USER'S PERSPECTIVE:** This is the most important rule. Each suggestion MUST be phrased as something the *user* would type. They are questions or commands *to Axion*.
    *   **Correct:** "Tell me more about the aqueducts."
    *   **Incorrect:** "I can tell you more about the aqueducts."
4.  **Be Concise & Actionable:** Keep prompts to 5-10 words and start with an action (e.g., "Explain...", "Compare...", "What is...").
5.  **Be Diverse & Insightful:** Do not just ask for "more details."
6.  **Avoid Redundancy:** Do not suggest a question that has already been clearly answered.
7.  **Handle Simple Cases:** If the last Axion response is a simple greeting, acknowledgement ("Okay," "I see"), error message, or if the conversation is just beginning, return an empty array of suggestions.
8.  **JSON ONLY:** You MUST respond with a single, valid JSON object. No extra text, explanations, or apologies.

**JSON Schema:**
{
  "suggestions": ["string", "string", "string"]
}
`;

/**
 * Generates follow-up suggestions based on the conversation history.
 * @param {string} apiKey - The API key for the LLM provider.
 * @param {string} modelName - The AI model to use for generation.
 * @param {Array<object>} conversationHistory - The chat history.
 * @returns {Promise<string[]>} A promise that resolves to an array of suggestion strings.
 */
export const generateFollowUpSuggestions = async (apiKey, modelName, conversationHistory) => {
    if (process.env.NODE_ENV === 'development') {
        brainLogger.debug(LogCategory.BRAIN, "Generating follow-up suggestions", { 
            modelName,
            conversationLength: conversationHistory?.length 
        });
    }
    
    if (!apiKey || !modelName || !conversationHistory || conversationHistory.length === 0) {
        return [];
    }

    const nonSystemMessages = conversationHistory.filter(m => !m.isHidden);
    
    if (nonSystemMessages.length < 2) {
        return [];
    }
    
    const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
    if (lastMessage.role !== 'model' || lastMessage.error) {
        return [];
    }

    try {
        const llm = createLLMClient({ modelName, apiKey });
        const historyForPrompt = nonSystemMessages.map(m => ({ role: m.role, text: m.text }));
        const prompt = `Conversation History:\n${JSON.stringify(historyForPrompt, null, 2)}`;

        const messages = [
            new SystemMessage(systemInstruction),
            new HumanMessage(prompt),
        ];

        const response = await llm.invoke(messages);
        const result = extractJson(response.content);
        
        if (process.env.NODE_ENV === 'development') {
            brainLogger.debug(LogCategory.BRAIN, "Generated follow-up suggestions", result);
        }

        if (result && Array.isArray(result.suggestions)) {
            return result.suggestions.slice(0, 3);
        }
        return [];
    } catch (error) {
        brainLogger.error(LogCategory.BRAIN, "Failed to generate follow-up suggestions", {
            error: error.message
        });
        return [];
    }
};